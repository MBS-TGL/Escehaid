"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass, Download, Eye, CheckCircle, XCircle, Clock, FileText, Users } from "@/components/icons";
import { supabase } from "@/lib/supabase";
import type { PPDBRegistration } from "@/lib/supabase";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  accepted: CheckCircle,
  rejected: XCircle,
};

export default function AdminPPDBPage() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PPDBRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: registrations } = await supabase
      .from("ppdb_registrations")
      .select("*")
      .order("created_at", { ascending: false });

    setData(registrations || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase
      .from("ppdb_registrations")
      .update({ status })
      .eq("id", id);

    if (!error) {
      fetchData();
    }
  }

  const filtered = data.filter((item) =>
    item.full_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#082b59] via-[#0a3570] to-[#0d4a8a] py-12 text-white md:py-16">
        <div className="absolute inset-0 opacity-[0.04]">
          <FileText className="absolute -right-10 -top-10 h-64 w-64 rotate-12" weight="fill" />
          <Users className="absolute -left-10 bottom-0 h-48 w-48 -rotate-12" weight="fill" />
        </div>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#f4d21f] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">Kelola PPDB</h1>
          <p className="mt-3 text-base text-white/70">{data.length} pendaftar terdaftar</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex items-center justify-end">
          <button className="flex items-center gap-2 rounded-xl bg-[#082b59] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1767b1]">
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#dce3ed] bg-white shadow-sm">
          <div className="border-b border-[#dce3ed] p-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nama siswa..."
                className="w-full rounded-xl border border-[#dce3ed] py-2 pl-10 pr-4 md:w-96"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">No</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nama</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Asal Sekolah</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Jalur</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#dce3ed]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Tidak ada data ditemukan
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => {
                  const StatusIcon = statusIcons[item.status] || Clock;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium">{item.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.previous_school || "-"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{item.registration_path}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[item.status] || ""}`}>
                          <StatusIcon className="h-3 w-3" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(item.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {item.status === "pending" && (
                            <>
                              <button
                                onClick={() => updateStatus(item.id, "accepted")}
                                className="p-1 hover:bg-green-100 rounded text-green-600"
                                title="Terima"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => updateStatus(item.id, "rejected")}
                                className="p-1 hover:bg-red-100 rounded text-red-600"
                                title="Tolak"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          <button className="p-1 hover:bg-gray-100 rounded" title="Detail">
                            <Eye className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}
