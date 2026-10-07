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
          const foot = dir ? `\n📁 ${dir}` : "";

          if (type === "session.execution.succeeded") {
            notify(`✅ Tugas selesai${tail}\n${title}${foot}`);
          } else if (type === "session.execution.failed") {
            const err = String(data.error ?? "tidak diketahui");
            notify(`❌ Tugas gagal${tail}\n${title}${foot}\n⚠️ ${err}`);
          } else {
            const reason = String(data.reason ?? "dihentikan");
            notify(`⏹ Tugas dihentikan${tail}\n${title}${foot}\nAlasan: ${reason}`);
          }
        }
      } catch (e) {
        if (!controller.signal.aborted) console.error(`[${ID}] loop event berhenti:`, e);
      }
    })();

    return () => controller.abort();
  },
});
