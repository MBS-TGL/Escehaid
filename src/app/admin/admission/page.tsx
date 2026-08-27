"use client";

import { useState, useEffect } from "react";
import { MagnifyingGlass, Download, Eye, CheckCircle, XCircle, Clock } from "@/components/icons";
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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[#082b59]">Kelola PPDB</h1>
          <p className="text-gray-600">{data.length} pendaftar terdaftar</p>
        </div>
        <button className="flex items-center gap-2 bg-[#082b59] text-white px-4 py-2 rounded-xl hover:bg-[#1767b1] transition-colors">
          <Download className="h-4 w-4" />
          Export Excel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#dce3ed]">
        <div className="p-4 border-b border-[#dce3ed]">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama siswa..."
              className="w-full md:w-96 border border-[#dce3ed] rounded-xl pl-10 pr-4 py-2"
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
  );
}
