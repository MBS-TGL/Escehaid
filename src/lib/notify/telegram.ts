import type { NotifyPayload, NotifyResult } from "./types";

/**
 * Adapter notifikasi Telegram Bot API.
 * Dokumentasi: https://core.telegram.org/bots/api#sendmessage
 *
 * Mengirim pesan ke grup/kanal/chat admin menggunakan token bot gratis
 * dari @BotFather dan chat_id target.
 */
export async function sendTelegramNotification(
  payload: NotifyPayload,
  configOverride?: { botToken?: string; chatId?: string }
): Promise<NotifyResult> {
  const token = configOverride?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  // Chat ID bisa diambil dari payload.recipients[0] atau env default
  const chatId =
    payload.recipients?.[0] ||
    configOverride?.chatId ||
    process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return {
      success: true,
      channel: "telegram",
      detail:
        "Dry-run: TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diisi. Pesan disimulasikan.",
    };
  }

  const icon =
    payload.level === "danger" ? "🚨" : payload.level === "warning" ? "⚠️" : "ℹ️";

  // Format HTML aman untuk Telegram
  const text = `${icon} <b>${escapeHtml(payload.title)}</b>\n\n${escapeHtml(
    payload.message
  )}${
    payload.url
      ? `\n\n🔗 <a href="${payload.url}">Buka di Panel Admin</a>`
      : ""
  }\n\n<i>Pemberitahuan otomatis Sistem Esceha.id</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: false,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && !data.ok)) {
      const desc = data?.description || `HTTP ${res.status}`;
      return {
        success: false,
        channel: "telegram",
        error: `Telegram error: ${desc}`,
        detail: data,
      };
    }

    return {
      success: true,
      channel: "telegram",
      detail: data,
    };
  } catch (err) {
    return {
      success: false,
      channel: "telegram",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
