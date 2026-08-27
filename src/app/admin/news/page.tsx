"use client";

import { useEffect, useState } from "react";
import { getNewsListAll } from "@/lib/queries";
import type { News } from "@/lib/supabase";

export default function AdminBeritaPage() {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNewsListAll().then((data) => {
      setNews(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-[#082b59]">Kelola Berita</h1>

      {loading ? (
        <p className="text-slate-500">Memuat data...</p>
      ) : news.length === 0 ? (
        <p className="text-slate-500">Belum ada berita.</p>
      ) : (
        <div className="bg-white rounded-xl border border-[#dce3ed] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f7fb]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Judul</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Kategori</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dce3ed]">
              {news.map((item) => (
                <tr key={item.id} className="hover:bg-[#f4f7fb]/50">
                  <td className="px-4 py-3 font-medium text-[#082b59]">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#082b59]/5 px-2.5 py-0.5 text-xs font-medium text-[#082b59]">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${item.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {item.is_published ? "Diterbitkan" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {item.published_at ? new Date(item.published_at).toLocaleDateString("id-ID") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
