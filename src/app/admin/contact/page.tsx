"use client";

import { useEffect, useState } from "react";
import { getContactMessageList } from "@/lib/queries";
import type { ContactMessage } from "@/lib/supabase";

export default function AdminContactPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  useEffect(() => {
    getContactMessageList().then((data) => {
      setMessages(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-[#082b59]">Pesan Masuk</h1>

      {loading ? (
        <p className="text-slate-500">Memuat data...</p>
      ) : messages.length === 0 ? (
        <p className="text-slate-500">Belum ada pesan masuk.</p>
      ) : (
        <div className="bg-white rounded-xl border border-[#dce3ed] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f7fb]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Nama</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Subjek</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dce3ed]">
              {messages.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer hover:bg-[#f4f7fb]/50"
                >
                  <td className="px-4 py-3 font-medium text-[#082b59]">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.email}</td>
                  <td className="px-4 py-3 text-slate-500">{item.subject || "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.is_read ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {item.is_read ? "Dibaca" : "Baru"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(item.created_at).toLocaleDateString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#082b59]">Detail Pesan</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-[#dce3ed] pb-2">
                <span className="text-slate-500">Nama</span>
                <span className="font-medium text-[#082b59]">{selected.name}</span>
              </div>
              <div className="flex justify-between border-b border-[#dce3ed] pb-2">
                <span className="text-slate-500">Email</span>
                <a href={`mailto:${selected.email}`} className="font-medium text-[#1767b1] hover:underline">{selected.email}</a>
              </div>
              <div className="flex justify-between border-b border-[#dce3ed] pb-2">
                <span className="text-slate-500">Telepon</span>
                <span className="font-medium text-[#082b59]">{selected.phone || "-"}</span>
              </div>
              <div className="flex justify-between border-b border-[#dce3ed] pb-2">
                <span className="text-slate-500">Subjek</span>
                <span className="font-medium text-[#082b59]">{selected.subject || "-"}</span>
              </div>
              <div className="border-b border-[#dce3ed] pb-2">
                <span className="text-slate-500">Pesan</span>
                <p className="mt-1 text-[#082b59] whitespace-pre-wrap">{selected.message}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dikirim</span>
                <span className="text-[#082b59]">{new Date(selected.created_at).toLocaleString("id-ID")}</span>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <a
                href={`mailto:${selected.email}?subject=Re: ${selected.subject || "Pesan dari Website"}`}
                className="rounded-xl bg-[#082b59] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#1767b1]"
              >
                Balas via Email
              </a>
              {selected.phone && (
                <a
                  href={`https://wa.me/${selected.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-[#dce3ed] px-4 py-2 text-sm font-bold text-[#082b59] transition-all hover:bg-[#f4f7fb]"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
