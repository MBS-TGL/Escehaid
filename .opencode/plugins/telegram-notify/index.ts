import { readFileSync, statSync } from "node:fs";
import { Plugin } from "@opencode/plugin";

/**
 * Kirim laporan Telegram saat satu tugas di OpenCode selesai.
 *
 * Sinyal yang dipakai:
 *   - session.execution.started    → catat waktu mulai
 *   - session.execution.succeeded  → ✅ selesai
 *   - session.execution.failed     → ❌ gagal
 *   - session.execution.interrupted→ ⏹ dihentikan
 *
 * Bentuk laporan (HTML Telegram, bukan teks polos):
 *   ✅ Tugas selesai · 6m 31s
 *   📁 Esceha.id · #a1b2c3
 *
 *   📨 Diminta            ← kutipan permintaan terakhir
 *   💬 Hasil              ← paragraf pertama terlihat, sisanya di kutipan yang bisa dibuka
 *   ⚠️ Error              ← hanya bila gagal
 *   🔧 14 aksi · #selesai #Esceha_id
 *
 * Markdown dari jawaban asisten (tebal, kode, daftar, tabel, judul, tautan)
 * diubah ke format Telegram, jadi tidak ada lagi ** atau | --- | mentah.
 *
 * Opsi (di konfigurasi plugin):
 *   includeChildren    – ikut kirim sesi anak/subagent (default: tidak)
 *   minSeconds         – abaikan tugas yang lebih singkat dari ini
 *   silentUnderSeconds – tugas lebih singkat dari ini dikirim tanpa bunyi
 *   maxResultChars     – batas panjang hasil sebelum dipotong (default 1800)
 *   hashtags           – tambahkan hashtag untuk pencarian (default true)
 *   pingOnLoad         – kirim pesan uji saat plugin dimuat
 *
 * Sembunyikan token: pakai env TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID,
 * atau file `secrets.json` di sebelah file ini (sudah di-gitignore).
 * Plugin diam (no-op) selama kredensial belum ada.
 */

const ID = "telegram-notify";
const API = "https://api.telegram.org/bot";

type Options = {
  includeChildren?: boolean;
  minSeconds?: number;
  silentUnderSeconds?: number;
  maxResultChars?: number;
  hashtags?: boolean;
  pingOnLoad?: boolean;
};

type Secret = { token?: string; chatId?: string };

let cache: Secret | null = null;
let cacheKey = "";

/**
 * Baca kredensial saat dibutuhkan (bukan sekali di setup), dengan cache
 * berbasis mtime. Menulis/mengubah `secrets.json` langsung berlaku tanpa
 * reload atau restart OpenCode.
 */
function currentSecrets(): Secret {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (token && chatId) return { token, chatId };

  try {
    const url = new URL("./secrets.json", import.meta.url);
    const st = statSync(url);
    const key = `${st.mtimeMs}:${st.size}`;
    if (cache && cacheKey === key) return cache;
    const parsed = JSON.parse(readFileSync(url, "utf8")) as Secret;
    cache = { token: parsed.token?.trim(), chatId: String(parsed.chatId ?? "").trim() };
    cacheKey = key;
    return cache;
  } catch {
    cache = null;
    cacheKey = "";
    return {};
  }
}

// ==== helpers:start (fungsi murni, tanpa efek samping) ====

function fmtDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  if (m < 60) return rest ? `${m}m ${rest}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function baseName(p?: string): string {
  if (!p) return "";
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string): string => esc(s).replace(/"/g, "&quot;");

/** Hapus tag HTML dan kembalikan entitas — untuk cadangan teks polos. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Potong markdown di batas baris dan tutup pagar kode yang menggantung. */
function clipMarkdown(md: string, max: number): { text: string; cut: boolean } {
  if (md.length <= max) return { text: md, cut: false };
  let t = md.slice(0, max);
  const code = t.charCodeAt(t.length - 1);
  if (code >= 0xd800 && code <= 0xdbff) t = t.slice(0, -1); // jangan belah emoji
  const nl = t.lastIndexOf("\n");
  if (nl > max * 0.6) t = t.slice(0, nl);
  if ((t.match(/```/g) ?? []).length % 2 === 1) t += "\n```";
  return { text: t.trimEnd(), cut: true };
}

/** Token mirip nama file atau domain (page.tsx, Esceha.id, src/app/x.ts) → <code>, supaya tidak jadi tautan acak. */
const FILE_RE = /(?<![\w/:.@-])(?:[\w.@[\]-]+\/)*[A-Za-z_][\w-]*(?:\.[A-Za-z][\w-]+)+(?![\w/-])/g;

/**
 * Markdown → HTML yang diterima Telegram.
 * Didukung: tebal, kode inline, blok kode, judul, daftar, tabel, kutipan, tautan.
 * `inQuote`: di dalam <blockquote> blok kode dipecah per baris <code>,
 * karena <pre> tidak boleh bersarang di dalam kutipan.
 */
function mdToHtml(md: string, inQuote = false): string {
  const stash: string[] = [];
  const keep = (html: string): string => {
    stash.push(html);
    return `\u0001${stash.length - 1}\u0002`;
  };

  let t = md.replace(/\r\n?/g, "\n");

  // 1. Blok kode berpagar
  t = t.replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, code: string) => {
    const body = code.replace(/\n$/, "");
    if (inQuote) return keep(body.split("\n").map((l) => (l ? `<code>${esc(l)}</code>` : "")).join("\n"));
    return keep(`<pre>${esc(body)}</pre>`);
  });
  t = t.replace(/```/g, ""); // sisa pagar yang tidak berpasangan

  // 2. Kode inline
  t = t.replace(/`([^`\n]+)`/g, (_m, c: string) => keep(`<code>${esc(c)}</code>`));

  // 3. Tautan markdown (hanya http/https)
  t = t.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label: string, url: string) =>
    keep(`<a href="${escAttr(url)}">${esc(label)}</a>`)
  );

  // 4. Escape sisanya
  t = esc(t);

  // 5. Baris demi baris
  const isSep = (l: string): boolean => /^\s*\|?(\s*:?-+:?\s*\|)+(\s*:?-+:?\s*)?$/.test(l);
  const lines = t.split("\n");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i] ?? "";

    if (/^\s*\|.*\|\s*$/.test(l)) {
      if (isSep(l)) continue;
      const cells = l
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
      const header = i + 1 < lines.length && isSep(lines[i + 1] ?? "");
      out.push(header ? `<b>${cells.join(" · ")}</b>` : `• ${cells.join(" — ")}`);
      continue;
    }

    const h = l.match(/^\s{0,3}#{1,6}\s+(.*)$/);
    if (h) {
      out.push(`<b>${(h[1] ?? "").replace(/\*\*/g, "")}</b>`);
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(l)) {
      out.push("──────");
      continue;
    }

    const b = l.match(/^(\s*)[-*+]\s+(.*)$/);
    if (b) {
      const lvl = Math.min(3, Math.floor((b[1] ?? "").length / 2));
      l = `${"  ".repeat(lvl)}${lvl ? "◦" : "•"} ${b[2] ?? ""}`;
    } else {
      l = l.replace(/^(\s*)&gt;\s?/, "$1▎");
    }
    out.push(l);
  }
  t = out.join("\n");

  // 6. Tebal dan nama file
  t = t.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  t = t.replace(FILE_RE, (m) => `<code>${m}</code>`);

  // 7. Kembalikan yang disimpan (bisa bersarang, ulangi beberapa kali)
  for (let pass = 0; pass < 3 && /\u0001\d+\u0002/.test(t); pass++) {
    t = t.replace(/\u0001(\d+)\u0002/g, (_m, i: string) => stash[Number(i)] ?? "");
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** Satu baris tanpa jeda. */
function clipOne(s: string, max: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

/** Pisahkan hasil jadi "kepala" (paragraf pertama, selalu terlihat) dan "sisa" (bisa dibuka). */
function splitResult(md: string, max: number): { head: string; rest: string; cut: boolean } {
  const { text, cut } = clipMarkdown(md.trim(), max);
  const m = text.match(/^([\s\S]*?)(?:\n\s*\n|$)/);
  let head = (m?.[1] ?? text).trim();
  let rest = text.slice(head.length).trim();

  if (head.length > 420) {
    const window = head.slice(0, 360);
    const at = Math.max(window.lastIndexOf(". "), window.lastIndexOf("\n"));
    const cutAt = at > 120 ? at + 1 : 360;
    rest = `${head.slice(cutAt).trim()}${rest ? `\n\n${rest}` : ""}`;
    head = head.slice(0, cutAt).trim();
  }
  return { head, rest, cut };
}

function errText(e: unknown): string {
  if (e == null) return "tidak diketahui";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  if (typeof e === "object") {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string") return msg;
    try {
      return JSON.stringify(e).slice(0, 500);
    } catch {
      return String(e);
    }
  }
  return String(e);
}

type Report = {
  kind: "succeeded" | "failed" | "interrupted";
  duration: string;
  dir: string;
  sid: string;
  ask: string;
  done: string;
  tools: number;
  title: string;
  error?: string;
  reason?: string;
  maxResult: number;
  hashtags: boolean;
};

/** Susun laporan akhir dalam HTML Telegram. */
function buildReport(r: Report): string {
  const head =
    r.kind === "succeeded" ? "✅ <b>Tugas selesai</b>" : r.kind === "failed" ? "❌ <b>Tugas gagal</b>" : "⏹ <b>Tugas dihentikan</b>";
  const lines: string[] = [];
  lines.push(`${head}${r.duration ? ` · ${esc(r.duration)}` : ""}`);

  const where = [r.dir ? `<code>${esc(r.dir)}</code>` : "", r.sid ? `<code>#${esc(r.sid)}</code>` : ""].filter(Boolean).join(" · ");
  if (where) lines.push(`📁 ${where}`);

  const ask = r.ask ? clipMarkdown(r.ask.trim(), 400).text : "";
  if (ask) lines.push("", "📨 <b>Diminta</b>", `<blockquote>${mdToHtml(ask, true)}</blockquote>`);

  if (r.done.trim()) {
    const { head: h, rest, cut } = splitResult(r.done, r.maxResult);
    lines.push("", "💬 <b>Hasil</b>", mdToHtml(h));
    if (rest) lines.push(`<blockquote expandable>${mdToHtml(rest, true)}</blockquote>`);
    if (cut) lines.push("<i>… dipotong, lengkapnya ada di OpenCode</i>");
  } else if (!ask) {
    lines.push("", `📝 <i>${esc(r.title)}</i>`);
  }

  if (r.kind === "failed") {
    lines.push("", "⚠️ <b>Error</b>", `<pre>${esc(clipOne(r.error ?? "tidak diketahui", 600))}</pre>`);
  } else if (r.kind === "interrupted") {
    lines.push("", `Alasan: ${esc(r.reason ?? "dihentikan")}`);
  }

  const status = r.kind === "succeeded" ? "selesai" : r.kind === "failed" ? "gagal" : "dihentikan";
  const tag = r.dir.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  const tail = [
    r.tools > 0 ? `🔧 ${r.tools} aksi` : "",
    r.hashtags ? [`#${status}`, tag ? `#${tag}` : ""].filter(Boolean).join(" ") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (tail) lines.push("", tail);

  return lines.join("\n");
}

// ==== helpers:end ====

type TurnMsg = { type?: string; text?: string; content?: Array<{ type?: string; text?: string }> };

async function send(token: string, chatId: string, html: string, silent: boolean): Promise<void> {
  const post = (text: string, parseMode?: "HTML") =>
    fetch(`${API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
        disable_notification: silent || undefined,
      }),
    });

  let res = await post(html, "HTML");

  if (res.status === 429) {
    const j = (await res.json().catch(() => null)) as { parameters?: { retry_after?: number } } | null;
    const wait = Math.min(Number(j?.parameters?.retry_after ?? 2), 8);
    await new Promise((r) => setTimeout(r, wait * 1000));
    res = await post(html, "HTML");
  }

  if (res.status === 400) {
    const body = await res.text().catch(() => "");
    if (/parse entities|can't parse/i.test(body)) {
      // Format HTML ditolak: kirim ulang sebagai teks polos agar laporan tetap sampai.
      res = await post(stripHtml(html).slice(0, 4000));
    } else {
      console.error(`[${ID}] Telegram 400: ${body.slice(0, 200)}`);
      return;
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[${ID}] Telegram ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Apa yang diminta, apa yang dijawab, dan berapa aksi pada turn terakhir.
 *
 * `session.context()` mengembalikan transcript lengkap. Turn terakhir dimulai
 * dari pesan user terakhir. Catatan: setelah sesi di-compact, prompt lama
 * diganti ringkasan sehingga `ask` bisa kosong; judul sesi hanya dipakai
 * sebagai cadangan terakhir di pemanggil. Hitungan aksi bergantung pada bentuk
 * bagian pesan bertipe "tool*" dan bisa 0 bila tidak tersedia di transcript.
 */
async function describeTurn(
  ctx: { session: { context: (input: { sessionID: string }) => Promise<unknown> } },
  sessionID: string
): Promise<{ ask: string; done: string; tools: number }> {
  let msgs: TurnMsg[] = [];
  try {
    const got = await ctx.session.context({ sessionID });
    if (Array.isArray(got)) msgs = got as TurnMsg[];
  } catch {
    /* sesi mungkin sudah terhapus */
  }

  let lastUser = -1;
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i]?.type === "user") {
      lastUser = i;
      break;
    }
  }

  const userMsg = lastUser >= 0 ? msgs[lastUser] : undefined;
  const ask = typeof userMsg?.text === "string" ? userMsg.text.trim() : "";

  const turn = msgs.slice(lastUser + 1);
  let done = "";
  let tools = 0;
  for (const m of turn) {
    if (m?.type !== "assistant" || !Array.isArray(m.content)) continue;
    for (const c of m.content) {
      if (typeof c?.type === "string" && /tool/i.test(c.type)) tools++;
    }
  }
  for (let i = turn.length - 1; i >= 0 && !done; i--) {
    const m = turn[i];
    if (m?.type !== "assistant" || !Array.isArray(m.content)) continue;
    for (let k = m.content.length - 1; k >= 0; k--) {
      const c = m.content[k];
      if (c?.type === "text" && typeof c.text === "string" && c.text.trim()) {
        done = c.text.trim();
        break;
      }
    }
  }
  return { ask, done, tools };
}

/** Naif tapi cukup: event bisa datang sebagai objek atau string JSON. */
function asObject(event: unknown): { type?: string; data?: Record<string, unknown> } {
  if (typeof event === "string") {
    try {
      return JSON.parse(event);
    } catch {
      return {};
    }
  }
  if (event && typeof event === "object") return event as Record<string, unknown>;
  return {};
}

export default Plugin.define({
  id: ID,
  async setup(ctx) {
    const opt = (ctx.options ?? {}) as Options;
    const startedAt = new Map<string, number>();
    const controller = new AbortController();
    let warnedMissing = false;

    // Kredensial di-resolve di sini (bukan di setup) supaya menulis
    // secrets.json langsung aktif tanpa reload.
    const notify = (html: string, silent = false) => {
      const { token, chatId } = currentSecrets();
      if (!token || !chatId) {
        if (!warnedMissing) {
          warnedMissing = true;
          console.warn(
            `[${ID}] Kredensial Telegram belum ada — notifikasi dilewati. ` +
              `Isi TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, atau buat ${ID}/secrets.json.`
          );
        }
        return;
      }
      send(token, chatId, html, silent).catch((e) => console.error(`[${ID}]`, e));
    };

    if (opt.pingOnLoad) {
      notify("🔔 <b>Notifikasi OpenCode aktif.</b>");
    }

    void (async () => {
      try {
        for await (const raw of ctx.event.subscribe({ signal: controller.signal })) {
          const event = asObject(raw);
          const type = event.type;
          if (!type?.startsWith("session.execution.")) continue;

          const data = (event.data ?? {}) as {
            sessionID?: string;
            error?: unknown;
            reason?: unknown;
          };
          const sessionID = data.sessionID;
          if (!sessionID) continue;

          if (type === "session.execution.started") {
            startedAt.set(sessionID, Date.now());
            continue;
          }

          const duration = startedAt.has(sessionID) ? Date.now() - (startedAt.get(sessionID) as number) : 0;
          startedAt.delete(sessionID);

          let info: {
            title?: string;
            parentID?: string;
            location?: { directory?: string };
          } = {};
          try {
            info = (await ctx.session.get({ sessionID })) as typeof info;
          } catch {
            /* sesi mungkin sudah terhapus — tetap kirim info minimum */
          }

          if (info.parentID && !opt.includeChildren) continue;
          if (opt.minSeconds && duration < opt.minSeconds * 1000) continue;

          const turn = await describeTurn(ctx, sessionID);
          const kind =
            type === "session.execution.succeeded" ? "succeeded" : type === "session.execution.failed" ? "failed" : "interrupted";

          const html = buildReport({
            kind,
            duration: fmtDuration(duration),
            dir: baseName(info.location?.directory),
            sid: sessionID.slice(-6),
            ask: turn.ask,
            done: turn.done,
            tools: turn.tools,
            title: info.title?.trim() || "(sesi tanpa judul)",
            error: kind === "failed" ? errText(data.error) : undefined,
            reason: kind === "interrupted" ? String(data.reason ?? "dihentikan") : undefined,
            maxResult: opt.maxResultChars && opt.maxResultChars > 200 ? opt.maxResultChars : 1800,
            hashtags: opt.hashtags !== false,
          });

          const silent = !!opt.silentUnderSeconds && duration < opt.silentUnderSeconds * 1000;
          notify(html, silent);
        }
      } catch (e) {
        if (!controller.signal.aborted) console.error(`[${ID}] loop event berhenti:`, e);
      }
    })();

    return () => controller.abort();
  },
});