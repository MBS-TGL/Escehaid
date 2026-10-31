import type { NotifyPayload, NotifyResult } from "./types";

/**
 * Adapter gateway WhatsApp Fonnte (https://fonnte.com).
 * Dokumentasi resmi:
 *  - POST https://api.fonnte.com/send
 *  - Header: Authorization: TOKEN (tanpa Bearer)
 *  - Param: target, message, countryCode, delay
 */
export async function sendFonnteNotification(
  payload: NotifyPayload,
  tokenOverride?: string
): Promise<NotifyResult> {
  const token = tokenOverride || process.env.FONNTE_TOKEN;

  if (!token) {
    return {
      success: true,
      channel: "whatsapp",
      detail: "Dry-run: FONNTE_TOKEN belum diatur di env. Pesan disimulasikan.",
    };
  }

  const targets = (payload.recipients || [])
    .map((r) => r.trim().replace(/^0/, "62").replace(/[^0-9]/g, ""))
    .filter(Boolean);

  if (targets.length === 0) {
    return {
      success: false,
      channel: "whatsapp",
      error: "Tidak ada nomor tujuan (recipients) yang valid untuk pengiriman WhatsApp.",
    };
  }

  const countryCode = process.env.FONNTE_COUNTRY_CODE || "62";
  const formattedMessage = `*${payload.title}*\n\n${payload.message}${
    payload.url ? `\n\nTautan: ${payload.url}` : ""
  }\n\n_Pemberitahuan otomatis Sistem Esceha.id_`;

  try {
    const formData = new URLSearchParams();
    formData.append("target", targets.join(","));
    formData.append("message", formattedMessage);
    formData.append("countryCode", countryCode);
    formData.append("delay", "2");

    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || (data && data.status === false)) {
      const reason = data?.reason || `HTTP ${res.status}`;
      return {
        success: false,
        channel: "whatsapp",
        error: `Fonnte gagal: ${reason}`,
        detail: data,
      };
    }

    return {
      success: true,
      channel: "whatsapp",
      detail: data,
    };
  } catch (e) {
    return {
      success: false,
      channel: "whatsapp",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Cek status perangkat WhatsApp di Fonnte (apakah tersambung atau disconnect).
 */
export async function checkFonnteDeviceStatus(tokenOverride?: string): Promise<{
  connected: boolean;
  device?: string;
  error?: string;
}> {
  const token = tokenOverride || process.env.FONNTE_TOKEN;
  if (!token) return { connected: false, error: "FONNTE_TOKEN belum diset" };

  try {
    const res = await fetch("https://api.fonnte.com/device", {
      method: "POST",
      headers: { Authorization: token },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { connected: false, error: `HTTP ${res.status}` };
    }
    return {
      connected: data.device_status === "connect",
      device: data.device || data.name,
    };
  } catch (err) {
    return { connected: false, error: String(err) };
  }
}
