export type NotifyChannel = "webhook" | "whatsapp";

export interface NotifyPayload {
  title: string;
  message: string;
  url?: string;
  level?: "info" | "warning" | "danger";
  recipients?: string[];
}

export interface NotifyResult {
  success: boolean;
  channel: NotifyChannel;
  error?: string;
  detail?: unknown;
}
