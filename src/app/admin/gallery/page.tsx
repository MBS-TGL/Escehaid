"use client";

import { useEffect, useState } from "react";
import { getGalleryList } from "@/lib/queries";
import type { Gallery } from "@/lib/supabase";

export default function AdminGalleryPage() {
  const [gallery, setGallery] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGalleryList().then((data) => {
      setGallery(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8 text-[#082b59]">Kelola Gallery</h1>

      {loading ? (
        <p className="text-slate-500">Memuat data...</p>
      ) : gallery.length === 0 ? (
        <p className="text-slate-500">Belum ada gallery.</p>
      ) : (
        <div className="bg-white rounded-xl border border-[#dce3ed] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f4f7fb]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Judul</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Tipe</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Kategori</th>
                <th className="px-4 py-3 text-left font-semibold text-[#082b59]">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dce3ed]">
              {gallery.map((item) => (
                <tr key={item.id} className="hover:bg-[#f4f7fb]/50">
                  <td className="px-4 py-3 font-medium text-[#082b59]">{item.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#1767b1]/10 px-2.5 py-0.5 text-xs font-medium text-[#1767b1]">
                      {item.media_type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#082b59]/5 px-2.5 py-0.5 text-xs font-medium text-[#082b59]">
                      {item.category}
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
    </div>
  );
}
