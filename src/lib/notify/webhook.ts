import type { NotifyPayload, NotifyResult } from "./types";

/**
 * Mengirim pesan ke Webhook generik (Discord, Slack, Google Chat, atau endpoint kustom).
 * Format otomatis disesuaikan agar terbaca rapi di Discord/Slack embed atau fallback teks mentah.
 */
export async function sendWebhookNotification(
  payload: NotifyPayload,
  webhookUrl?: string
): Promise<NotifyResult> {
  const url = webhookUrl || process.env.ALERT_WEBHOOK_URL;

  if (!url) {
    // Mode dry-run: tidak ada webhook URL yang diatur
    return {
      success: true,
      channel: "webhook",
      detail: "Dry-run: ALERT_WEBHOOK_URL belum diisi.",
    };
  }

  const color = payload.level === "danger" ? 0xef4444 : payload.level === "warning" ? 0xf59e0b : 0x3b82f6;

  // Format universal yang didukung Discord (embed) & Slack / generic body
  const body = JSON.stringify({
    content: `**[${payload.title}]**\n${payload.message}${payload.url ? `\n🔗 ${payload.url}` : ""}`,
    embeds: [
      {
        title: payload.title,
        description: payload.message,
        url: payload.url,
        color,
        footer: { text: "Esceha Alert System" },
        timestamp: new Date().toISOString(),
      },
    ],
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        success: false,
        channel: "webhook",
        error: `HTTP ${res.status}: ${errText.slice(0, 150)}`,
      };
    }

    return { success: true, channel: "webhook" };
  } catch (err) {
    return {
      success: false,
      channel: "webhook",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
