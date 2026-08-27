"use client";

import { useState } from "react";
import { User, Phone, CheckCircle } from "@/components/icons";
import { submitRegistration } from "@/lib/queries";

export default function PPDBFormPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    birthPlace: "",
    birthDate: "",
    gender: "",
    address: "",
    phone: "",
    email: "",
    parentName: "",
    parentOccupation: "",
    previousSchool: "",
    registrationPath: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await submitRegistration({
      full_name: formData.fullName,
      birth_place: formData.birthPlace,
      birth_date: formData.birthDate,
      gender: formData.gender as "L" | "P",
      address: formData.address,
      phone: formData.phone,
      email: formData.email,
      parent_name: formData.parentName,
      parent_occupation: formData.parentOccupation,
      previous_school: formData.previousSchool,
      registration_path: formData.registrationPath as "reguler" | "prestasi" | "beasiswa",
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error || "Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2 text-[#082b59]">Pendaftaran Berhasil!</h1>
        <p className="text-gray-600 mb-6">
          Terima kasih telah mendaftar di SMP Muhammadiyah 4 Tanggul.
          Silakan cek email Anda untuk informasi lebih lanjut.
        </p>
        <a
          href="/admission"
          className="inline-block bg-[#082b59] text-white px-6 py-2 rounded-xl hover:bg-[#1767b1] transition-colors"
        >
          Kembali ke PPDB
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2 text-[#082b59]">Formulir PPDB</h1>
      <p className="text-gray-600 mb-8">Silakan isi data dengan lengkap dan benar</p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[#082b59]">
            <User className="h-5 w-5 text-[#1767b1]" />
            Data Siswa
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tempat Lahir</label>
              <input
                type="text"
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Lahir</label>
              <input
                type="date"
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Jenis Kelamin *</label>
              <select
                required
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="">Pilih</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Asal Sekolah</label>
              <input
                type="text"
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.previousSchool}
                onChange={(e) => setFormData({ ...formData, previousSchool: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Alamat *</label>
              <textarea
                required
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[#082b59]">
            <Phone className="h-5 w-5 text-[#1767b1]" />
            Kontak
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">No. Telepon/HP *</label>
              <input
                type="tel"
                required
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
          <h2 className="font-semibold mb-4 flex items-center gap-2 text-[#082b59]">
            <User className="h-5 w-5 text-[#1767b1]" />
            Data Orang Tua
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nama Orang Tua/Wali *</label>
              <input
                type="text"
                required
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pekerjaan</label>
              <input
                type="text"
                className="w-full border border-[#dce3ed] rounded-xl px-3 py-2"
                value={formData.parentOccupation}
                onChange={(e) => setFormData({ ...formData, parentOccupation: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-[#dce3ed]">
          <h2 className="font-semibold mb-4 text-[#082b59]">Jalur Pendaftaran *</h2>
          <div className="space-y-2">
            {[
              { value: "reguler", label: "Reguler", desc: "Pendaftaran untuk semua siswa" },
              { value: "prestasi", label: "Prestasi", desc: "Untuk siswa berprestasi akademik/non-akademik" },
              { value: "beasiswa", label: "Beasiswa", desc: "Untuk siswa kurang mampu" },
            ].map((jalur) => (
              <label
                key={jalur.value}
                className="flex items-start gap-3 p-3 border border-[#dce3ed] rounded-xl cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="registration_path"
                  value={jalur.value}
                  required
                  checked={formData.registrationPath === jalur.value}
                  onChange={(e) => setFormData({ ...formData, registrationPath: e.target.value })}
                  className="text-[#082b59] mt-0.5"
                />
                <div>
                  <div className="font-medium text-[#082b59]">{jalur.label}</div>
                  <div className="text-sm text-gray-500">{jalur.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#082b59] text-white py-3 rounded-xl font-semibold hover:bg-[#1767b1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Mengirim..." : "Kirim Pendaftaran"}
        </button>
      </form>
    </div>
  );
}
