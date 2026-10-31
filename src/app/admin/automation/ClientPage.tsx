"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle,
  Plus,
  Trash,
  Warning,
  Envelope,
  Globe,
} from "@/components/Icons";
import { Modal } from "@/components/ui";
import { ALERT_METRIC_CATALOG } from "@/lib/alerts/catalog";
import {
  saveAlertRuleAction,
  toggleAlertRuleAction,
  deleteAlertRuleAction,
  testAlertRuleAction,
} from "./actions";

interface RuleItem {
  id: string;
  name: string;
  metric_key: string;
  comparator: "gt" | "gte" | "lt" | "lte" | "eq" | "neq";
  threshold: number;
  enabled: boolean;
  channel: "webhook" | "whatsapp" | "telegram";
  recipients: string[];
  cooldown_minutes: number;
  created_at: string;
}

interface EventItem {
  id: string;
  rule_name: string;
  metric_key: string;
  observed_value: number;
  message: string;
  delivered_at: string | null;
  delivery_status: string;
  delivery_error: string;
  created_at: string;
}

export default function AutomationClientPage({
  initialRules,
  initialEvents,
}: {
  initialRules: RuleItem[];
  initialEvents: EventItem[];
}) {
  const [rules, setRules] = useState<RuleItem[]>(initialRules);
  const [events] = useState<EventItem[]>(initialEvents);
  const [modalOpen, setModalOpen] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [metricKey, setMetricKey] = useState(ALERT_METRIC_CATALOG[0]?.key || "");
  const [comparator, setComparator] = useState<RuleItem["comparator"]>("gte");
  const [threshold, setThreshold] = useState(1);
  const [channel, setChannel] = useState<"webhook" | "whatsapp" | "telegram">("webhook");
  const [recipientsStr, setRecipientsStr] = useState("");
  const [cooldown, setCooldown] = useState(60);
  const [saving, setSaving] = useState(false);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const recipients = recipientsStr
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean);

    const res = await saveAlertRuleAction(null, {
      name,
      metric_key: metricKey,
      comparator,
      threshold,
      channel,
      recipients,
      cooldown_minutes: cooldown,
    });

    setSaving(false);
    if (res.success) {
      setModalOpen(false);
      setName("");
      setRecipientsStr("");
      window.location.reload();
    } else {
      alert(res.error || "Gagal menyimpan aturan.");
    }
  };

  const handleToggle = async (rule: RuleItem) => {
    const next = !rule.enabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)));
    await toggleAlertRuleAction(rule.id, next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus aturan otomatis ini?")) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    await deleteAlertRuleAction(id);
  };

  const handleTestSend = async (targetChannel: "webhook" | "whatsapp" | "telegram") => {
    setTesting(true);
    const res = await testAlertRuleAction(targetChannel);
    setTesting(false);
    if (res.success) {
      alert(`Berhasil mengirim pesan uji coba ke ${targetChannel}!`);
    } else {
      alert(`Gagal mengirim tes: ${res.error}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--brand-accent)]" />
            Otomatisasi &amp; Peringatan (Alerts)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi aturan pemantauan cerdas. Kirim peringatan otomatis via Webhook (Discord/Slack) atau WhatsApp Fonnte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("webhook")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Globe className="h-3.5 w-3.5 text-blue-500" />
            {testing ? "Menguji…" : "Tes Webhook"}
          </button>

          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("telegram")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Envelope className="h-3.5 w-3.5 text-sky-500" />
            {testing ? "Menguji…" : "Tes Telegram"}
          </button>

          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("whatsapp")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <Envelope className="h-3.5 w-3.5 text-emerald-500" />
            {testing ? "Menguji…" : "Tes WA Fonnte"}
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Tambah Aturan
          </button>
        </div>
      </div>

      {/* Daftar Aturan */}
      <section className="rounded-2xl border border-[#dce3ed] bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Aturan Alert Aktif</h2>

        {rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            Belum ada aturan alert yang dibuat. Klik tombol &quot;Tambah Aturan&quot; untuk membuat pemantauan otomatis baru.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rules.map((rule) => {
              const metric = ALERT_METRIC_CATALOG.find((m) => m.key === rule.metric_key);

              return (
                <div
                  key={rule.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-800">{rule.name}</h3>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          rule.channel === "whatsapp"
                            ? "bg-emerald-50 text-emerald-700"
                            : rule.channel === "telegram"
                              ? "bg-sky-50 text-sky-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {rule.channel === "whatsapp"
                          ? "WhatsApp (Fonnte)"
                          : rule.channel === "telegram"
                            ? "Telegram Bot"
                            : "Webhook"}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Jika <b>{metric?.name || rule.metric_key}</b> {rule.comparator} {rule.threshold}{" "}
                      {metric?.unit || ""} (Cooldown: {rule.cooldown_minutes} menit)
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(rule)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rule.enabled ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          rule.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Riwayat Alert (Events) */}
      <section className="rounded-2xl border border-[#dce3ed] bg-white p-4 sm:p-5 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Riwayat Kejadian Alert (30 Terakhir)</h2>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">Belum ada kejadian alert yang terpicu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">Waktu</th>
                  <th className="pb-2">Nama Aturan</th>
                  <th className="pb-2">Nilai Teramati</th>
                  <th className="pb-2">Status Kirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="py-2 text-slate-400">
                      {new Date(ev.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 font-medium text-slate-800">{ev.rule_name}</td>
                    <td className="py-2 tabular-nums">{ev.observed_value}</td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          ev.delivery_status === "sent"
                            ? "bg-emerald-50 text-emerald-700"
                            : ev.delivery_status === "skipped_cooldown"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {ev.delivery_status === "sent" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Warning className="h-3 w-3" />
                        )}
                        {ev.delivery_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Tambah Aturan */}
      {modalOpen && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Aturan Otomatis Baru">
          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div>
              <label htmlFor="rule-name-input" className="block font-semibold text-slate-700">Nama Aturan</label>
              <input
                id="rule-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Notifikasi Antrean SPMB Menumpuk"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="metric-select" className="block font-semibold text-slate-700">Pilih Metrik</label>
                <select
                  id="metric-select"
                  value={metricKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setMetricKey(key);
                    const def = ALERT_METRIC_CATALOG.find((m) => m.key === key);
                    if (def) {
                      setComparator(def.defaultComparator);
                      setThreshold(def.defaultThreshold);
                    }
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
                >
                  {ALERT_METRIC_CATALOG.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="threshold-input" className="block font-semibold text-slate-700">Ambang Batas (Threshold)</label>
                <div className="mt-1 flex items-center gap-2">
                  <select
                    value={comparator}
                    onChange={(e) => setComparator(e.target.value as RuleItem["comparator"])}
                    className="rounded-xl border border-slate-200 px-2 py-2 text-sm text-slate-800 outline-none"
                  >
                    <option value="gte">&gt;=</option>
                    <option value="gt">&gt;</option>
                    <option value="lte">&lt;=</option>
                    <option value="lt">&lt;</option>
                    <option value="eq">==</option>
                  </select>
                  <input
                    id="threshold-input"
                    type="number"
                    required
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="channel-select" className="block font-semibold text-slate-700">Kanal Pengiriman</label>
                <select
                  id="channel-select"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as "webhook" | "whatsapp" | "telegram")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
                >
                  <option value="webhook">Webhook (Discord/Slack)</option>
                  <option value="whatsapp">WhatsApp (Fonnte API)</option>
                  <option value="telegram">Telegram (Bot API)</option>
                </select>
              </div>

              <div>
                <label htmlFor="cooldown-input" className="block font-semibold text-slate-700">Jeda Cooldown (Menit)</label>
                <input
                  id="cooldown-input"
                  type="number"
                  min={5}
                  max={1440}
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
                />
              </div>
            </div>

            {(channel === "whatsapp" || channel === "telegram") && (
              <div>
                <label htmlFor="recipients-input" className="block font-semibold text-slate-700">
                  {channel === "whatsapp"
                    ? "Nomor Tujuan WhatsApp (Pisahkan koma)"
                    : "Target Chat ID Telegram (Kosongkan jika memakai default env)"}
                </label>
                <input
                  id="recipients-input"
                  type="text"
                  value={recipientsStr}
                  onChange={(e) => setRecipientsStr(e.target.value)}
                  placeholder={channel === "whatsapp" ? "Mis. 08123456789, 08523456789" : "Mis. -100123456789 (ID Grup) atau 12345678"}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-3 py-2 font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Simpan Aturan"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
