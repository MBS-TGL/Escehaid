import { sendWebhookNotification } from "./webhook";
import { sendFonnteNotification, checkFonnteDeviceStatus } from "./fonnte";
import { sendTelegramNotification } from "./telegram";
import type { NotifyChannel, NotifyPayload, NotifyResult } from "./types";

export type { NotifyChannel, NotifyPayload, NotifyResult };
export { checkFonnteDeviceStatus, sendTelegramNotification };

/**
 * Mengirim notifikasi sesuai channel yang diminta (webhook default, whatsapp via Fonnte, atau telegram bot).
 */
export async function dispatchNotification(
  channel: NotifyChannel,
  payload: NotifyPayload
): Promise<NotifyResult> {
  if (channel === "whatsapp") {
    return sendFonnteNotification(payload);
  }
  if (channel === "telegram") {
    return sendTelegramNotification(payload);
  }
  return sendWebhookNotification(payload);
}
