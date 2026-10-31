import { sendWebhookNotification } from "./webhook";
import { sendFonnteNotification, checkFonnteDeviceStatus } from "./fonnte";
import type { NotifyChannel, NotifyPayload, NotifyResult } from "./types";

export type { NotifyChannel, NotifyPayload, NotifyResult };
export { checkFonnteDeviceStatus };

/**
 * Mengirim notifikasi sesuai channel yang diminta (webhook default, whatsapp via Fonnte).
 */
export async function dispatchNotification(
  channel: NotifyChannel,
  payload: NotifyPayload
): Promise<NotifyResult> {
  if (channel === "whatsapp") {
    return sendFonnteNotification(payload);
  }
  return sendWebhookNotification(payload);
}
