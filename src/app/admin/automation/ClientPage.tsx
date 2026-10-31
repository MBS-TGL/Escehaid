"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  CheckCircle,
  Plus,
  Trash,
  Warning,
  Envelope,
  Globe,
  Gear,
} from "@/components/Icons";
import { Modal } from "@/components/ui";
import { StatPill, StatPillGroup } from "@/components/admin/StatPill";
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

  const stats = useMemo(() => {
    return {
      total: rules.length,
      active: rules.filter((r) => r.enabled).length,
      eventsCount: events.length,
      sentCount: events.filter((e) => e.delivery_status === "sent").length,
    };
  }, [rules, events]);

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
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r))
    );
    const res = await toggleAlertRuleAction(rule.id, next);
    if (!res.success) {
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !next } : r))
      );
      alert(res.error || "Gagal mengubah status aturan.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus aturan alert ini?")) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    const res = await deleteAlertRuleAction(id);
    if (!res.success) {
      alert(res.error || "Gagal menghapus aturan.");
      window.location.reload();
    }
  };

  const handleTestSend = async (testChannel: "webhook" | "whatsapp" | "telegram") => {
    setTesting(true);
    const res = await testAlertRuleAction(testChannel);
    setTesting(false);
    if (res.success) {
      alert(`Tes kirim alert via ${testChannel.toUpperCase()} berhasil dikirim!`);
    } else {
      alert(`Tes kirim gagal: ${res.error}`);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ── Page Header Standar esceha ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e4ecf6] md:bg-[var(--brand-primary)]/10">
            <Bell className="h-5 w-5 text-[var(--brand-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Otomatisasi &amp; Peringatan</h1>
            <p className="text-[13px] text-[#64748b] md:text-sm md:text-slate-500">
              Notifikasi otomatis via Discord/Slack Webhook, WhatsApp Fonnte, dan Telegram Bot
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("webhook")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Globe className="h-3.5 w-3.5 text-blue-500" />
            <span>Tes Webhook</span>
          </button>

          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("telegram")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Envelope className="h-3.5 w-3.5 text-sky-500" />
            <span>Tes Telegram</span>
          </button>

          <button
            type="button"
            disabled={testing}
            onClick={() => handleTestSend("whatsapp")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Envelope className="h-3.5 w-3.5 text-emerald-500" />
            <span>Tes WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[var(--brand-accent)] transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Aturan</span>
          </button>
        </div>
      </div>

      {/* ── Metrik Cepat (StatPillGroup) ── */}
      <StatPillGroup>
        <StatPill icon={Bell} label="Total Aturan" value={stats.total} tone="neutral" />
        <StatPill icon={CheckCircle} label="Aturan Aktif" value={stats.active} tone="success" />
        <StatPill icon={Envelope} label="Riwayat Kejadian" value={stats.eventsCount} tone="info" />
        <StatPill icon={CheckCircle} label="Terkirim" value={stats.sentCount} tone="neutral" />
      </StatPillGroup>

      {/* ── Daftar Aturan ── */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Gear className="h-4 w-4 text-[var(--brand-primary)]" />
            Aturan Pemantauan Aktif
          </h2>
          <span className="text-xs text-slate-400 font-medium">{rules.length} aturan terdaftar</span>
        </div>

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
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-800">{rule.name}</h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10.5px] font-semibold border ${
                          rule.channel === "whatsapp"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : rule.channel === "telegram"
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-blue-200 bg-blue-50 text-blue-700"
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
                      title={rule.enabled ? "Nonaktifkan aturan" : "Aktifkan aturan"}
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
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Hapus aturan"
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

      {/* ── Riwayat Alert (Events) ── */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-3.5">
        <h2 className="text-sm font-bold text-slate-800">Riwayat Kejadian Alert (30 Terakhir)</h2>

        {events.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Belum ada kejadian alert yang terpicu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/70 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Nama Aturan</th>
                  <th className="py-2.5 px-3">Nilai Teramati</th>
                  <th className="py-2.5 px-3">Status Kirim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                      {new Date(ev.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{ev.rule_name}</td>
                    <td className="py-2.5 px-3 tabular-nums font-medium">{ev.observed_value}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-semibold border ${
                          ev.delivery_status === "sent"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : ev.delivery_status === "skipped_cooldown"
                              ? "border-slate-200 bg-slate-100 text-slate-500"
                              : "border-rose-200 bg-rose-50 text-rose-700"
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

      {/* ── Modal Tambah Aturan ── */}
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
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
                >
                  {ALERT_METRIC_CATALOG.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name} ({m.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="comparator-select" className="block font-semibold text-slate-700">Kondisi</label>
                <div className="mt-1 flex gap-2">
                  <select
                    id="comparator-select"
                    value={comparator}
                    onChange={(e) => setComparator(e.target.value as RuleItem["comparator"])}
                    className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
                  >
                    <option value="gt">&gt; (Lebih dari)</option>
                    <option value="gte">&gt;= (Minimal)</option>
                    <option value="lt">&lt; (Kurang dari)</option>
                    <option value="lte">&lt;= (Maksimal)</option>
                    <option value="eq">= (Sama dengan)</option>
                  </select>

                  <input
                    id="threshold-input"
                    aria-label="Nilai ambang batas"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
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
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
                >
                  <option value="webhook">Webhook (Discord / Slack / Teams)</option>
                  <option value="telegram">Telegram Bot</option>
                  <option value="whatsapp">WhatsApp via Fonnte API</option>
                </select>
              </div>

              <div>
                <label htmlFor="cooldown-input" className="block font-semibold text-slate-700">Jeda Pengiriman (Cooldown)</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="cooldown-input"
                    type="number"
                    value={cooldown}
                    onChange={(e) => setCooldown(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
                  />
                  <span className="text-slate-400">menit</span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="recipients-input" className="block font-semibold text-slate-700">
                Penerima Spesifik (Opsional)
              </label>
              <input
                id="recipients-input"
                type="text"
                value={recipientsStr}
                onChange={(e) => setRecipientsStr(e.target.value)}
                placeholder={
                  channel === "whatsapp"
                    ? "08123456789, 08987654321"
                    : channel === "telegram"
                      ? "Chat ID Telegram (mis. 123456789, -100987654321)"
                      : "https://discord.com/api/webhooks/..."
                }
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--brand-accent)]"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                {channel === "telegram"
                  ? "Bisa diisi chat ID pribadi atau grup. Kosongkan untuk memakai TELEGRAM_DEFAULT_CHAT_ID dari environment."
                  : "Kosongkan untuk memakai konfigurasi default di environment server."}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 font-semibold text-white hover:bg-[var(--brand-accent)] disabled:opacity-50"
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
