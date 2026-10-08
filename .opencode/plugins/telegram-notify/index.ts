import { readFileSync, statSync } from "node:fs";
import { Plugin } from "@opencode/plugin";

/**
 * Kirim notifikasi Telegram saat satu tugas di OpenCode selesai.
 *
 * Sinyal yang dipakai:
 *   - session.execution.started    → catat waktu mulai
 *   - session.execution.succeeded  → ✅ selesai
 *   - session.execution.failed     → ❌ gagal
 *   - session.execution.interrupted→ ⏹ dihentikan
 *
 * Sesi anak (subagent) dilewati secara bawaan supaya tidak banjir —
 * aktifkan lewat opsi `includeChildren`.
 *
 * Isi notifikasi (bukan judul sesi — judul dibuat sekali dari prompt pertama
 * lalu tidak pernah berubah, jadi memakainya bikin semua turn terlihat sama):
 *   ✅ Tugas selesai · 4m 10s
 *   📁 Esceha.id
 *
 *   📨 <permintaan terakhir, 1 baris>
 *   💬 <jawaban/hasil terakhir, ≤4 baris>
 *
 * Kedua baris isi di-warna-warnai sesuai ketersediaan; judul sesi hanya
 * muncul sebagai cadangan terakhir kalau keduanya kosong.
 *
 * Sembunyikan token: pakai env TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID,
 * atau file `secrets.json` di sebelah file ini (sudah di-gitignore).
 * Plugin diam (no-op) selama kredensial belum ada.
 */

const ID = "telegram-notify";
const API = "https://api.telegram.org/bot";

type Options = {
  includeChildren?: boolean;
  /** Abaikan sesi yang durasinya di bawah ini (detik) — buang kebisingan. */
  minSeconds?: number;
  pingOnLoad?: boolean;
};

type Secret = { token?: string; chatId?: string };

let cache: Secret | null = null;
let cacheKey = "";

/**
 * Baca kredensial saat dibutuhkan (bukan sekali di setup), dengan cache
 * berbasis mtime. Konsekuensinya: menulis/mengubah `secrets.json` langsung
 * berlaku tanpa harus reload atau restart OpenCode.
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

async function send(token: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`${API}${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4000),
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[${ID}] Telegram ${res.status}: ${body.slice(0, 200)}`);
  }
}

/** Satu baris tanpa jeda — untuk merangkum prompt user. */
function clipOne(s: string, max: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

/** Beberapa baris — untuk jawaban asisten yang biasanya berparagraf. */
function clipBlock(s: string, maxLines: number, max: number): string {
  const kept = s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
  return kept.length > max ? `${kept.slice(0, max - 1)}…` : kept;
}

type TurnMsg = { type?: string; text?: string; content?: Array<{ type?: string; text?: string }> };

/**
 * Apa yang diminta + apa yang dijawab pada turn terakhir.
 *
 * Judul sesi (`Session.Info.title`) dibuat sekali dari prompt pertama lalu
 * tidak pernah berubah, sehingga semua turn dalam satu sesi mengirim teks yang
 * sama persis. `session.context()` mengembalikan transcript lengkap; cukup
 * dipindai dari belakang sampai kedua bagian ketemu.
 *
 * Catatan penting: `context()` hanya berisi pesan user kalau sesi belum pernah
 * di-compact — sesudah compact, prompt lama diganti ringkasan. Karena itu
 * `ask` boleh kosong, dan judul sesi SENGAJA tidak dipakai sebagai pengganti
 * di sini: itulah sumber "spam judul yang itu-itu saja". Judul baru dipakai di
 * pemanggil sebagai cadangan terakhir kalau kedua bagian kosong.
 */
async function describeTurn(
  ctx: { session: { context: (input: { sessionID: string }) => Promise<unknown> } },
  sessionID: string
): Promise<{ ask: string; done: string }> {
  let msgs: TurnMsg[] = [];
  try {
    const got = await ctx.session.context({ sessionID });
    if (Array.isArray(got)) msgs = got as TurnMsg[];
  } catch {
    /* sesi mungkin sudah terhapus — pakai judul saja */
  }

  let ask = "";
  let done = "";
  for (let i = msgs.length - 1; i >= 0 && (!ask || !done); i--) {
    const m = msgs[i];
    if (!m) continue;
    if (!ask && m.type === "user" && typeof m.text === "string" && m.text.trim()) {
      ask = clipOne(m.text, 160);
    }
    if (!done && m.type === "assistant" && Array.isArray(m.content)) {
      for (let k = m.content.length - 1; k >= 0; k--) {
        const c = m.content[k];
        if (c?.type === "text" && typeof c.text === "string" && c.text.trim()) {
          done = clipBlock(c.text, 4, 360);
          break;
        }
      }
    }
  }
  return { ask, done };
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
    const notify = (text: string) => {
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
      send(token, chatId, text).catch((e) => console.error(`[${ID}]`, e));
    };

    if (opt.pingOnLoad) {
      notify("🔔 Notifikasi OpenCode aktif.");
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

          const duration = startedAt.has(sessionID)
            ? Date.now() - (startedAt.get(sessionID) as number)
            : 0;
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

          const dur = fmtDuration(duration);
          const title = info.title?.trim() || "(sesi tanpa judul)";
          const dir = baseName(info.location?.directory);
          const tail = dur ? ` · ${dur}` : "";

          const turn = await describeTurn(ctx, sessionID);
          const parts = [
            turn.ask ? `📨 ${turn.ask}` : "",
            turn.done ? `💬 ${turn.done}` : "",
          ].filter(Boolean);
          const body = `${dir ? `\n📁 ${dir}` : ""}\n\n${parts.join("\n\n") || title}`;

          if (type === "session.execution.succeeded") {
            notify(`✅ Tugas selesai${tail}${body}`);
          } else if (type === "session.execution.failed") {
            const err = String(data.error ?? "tidak diketahui");
            notify(`❌ Tugas gagal${tail}${body}\n\n⚠️ ${err}`);
          } else {
            const reason = String(data.reason ?? "dihentikan");
            notify(`⏹ Tugas dihentikan${tail}${body}\n\nAlasan: ${reason}`);
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) console.error(`[${ID}] loop event berhenti:`, e);
      }
    })();

    return () => controller.abort();
  },
});
