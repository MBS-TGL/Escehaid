"use client";

import { useState } from "react";
import { submitContactMessage } from "@/lib/queries";
import { MapPin, Phone, Envelope } from "@/components/icons";

export default function KontakPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const result = await submitContactMessage(form);
    if (result.success) {
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } else {
      setStatus("error");
      setErrorMsg(result.error || "Gagal mengirim pesan.");
    }
  };

  return (
    <div>
      <section className="bg-[#082b59] py-16 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-4xl">Kontak Kami</h1>
          <p className="text-white/70">Hubungi kami untuk informasi lebih lanjut</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-2xl font-bold text-[#082b59]">Informasi Kontak</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1]">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082b59]">Alamat</h3>
                  <p className="mt-1 text-sm text-slate-600">Jl. KH. Hasyim Asy&apos;ari No. 42, Tanggul, Jember, Jawa Timur</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1]">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082b59]">Telepon</h3>
                  <p className="mt-1 text-sm text-slate-600">(0336) 123456</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#082b59]/5 text-[#1767b1]">
                  <Envelope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#082b59]">Email</h3>
                  <p className="mt-1 text-sm text-slate-600">info@mbs-tanggul.sch.id</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#dce3ed] bg-white p-8">
            <h2 className="mb-6 text-2xl font-bold text-[#082b59]">Kirim Pesan</h2>
            {status === "success" && (
              <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
                Pesan berhasil dikirim. Kami akan segera merespons.
              </div>
            )}
            {status === "error" && (
              <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#082b59]">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#082b59]">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-[#082b59]">Telepon</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#082b59]">Subjek</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#082b59]">Pesan *</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-xl border border-[#dce3ed] px-4 py-2.5 text-sm focus:border-[#1767b1] focus:outline-none focus:ring-1 focus:ring-[#1767b1]"
                />
              </div>
              <button
                type="submit"
                disabled={status === "loading"}
                className="rounded-xl bg-[#082b59] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#1767b1] disabled:opacity-50"
              >
                {status === "loading" ? "Mengirim..." : "Kirim Pesan"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
