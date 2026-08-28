"use client";

import { useState } from "react";
import { CheckCircle, Clock, ArrowLeft, ArrowRight, FileText } from "@/components/icons";
import { supabase } from "@/lib/supabase";

const steps = ["Program", "Data Siswa", "Data Orang Tua", "Selesai"];

type FormData = {
  program: string;
  full_name: string;
  nickname: string;
  gender: string;
  birth_place: string;
  birth_date: string;
  nisn: string;
  nik: string;
  height: string;
  weight: string;
  language: string;
  hobby: string;
  ambition: string;
  child_order: string;
  siblings: string;
  blood_type: string;
  orphan_status: string;
  previous_school: string;
  address: string;
  phone: string;
  father_name: string;
  father_birth: string;
  father_education: string;
  father_job: string;
  father_income: string;
  mother_name: string;
  mother_birth: string;
  mother_education: string;
  mother_job: string;
  mother_income: string;
};

const initialData: FormData = {
  program: "",
  full_name: "",
  nickname: "",
  gender: "L",
  birth_place: "",
  birth_date: "",
  nisn: "",
  nik: "",
  height: "",
  weight: "",
  language: "",
  hobby: "",
  ambition: "",
  child_order: "",
  siblings: "",
  blood_type: "",
  orphan_status: "tidak",
  previous_school: "",
  address: "",
  phone: "",
  father_name: "",
  father_birth: "",
  father_education: "",
  father_job: "",
  father_income: "",
  mother_name: "",
  mother_birth: "",
  mother_education: "",
  mother_job: "",
  mother_income: "",
};

function Input({ label, required, ...props }: { label: string; required?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border border-[#dce3ed] bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[#1767b1] focus:ring-2 focus:ring-[#1767b1]/10"
      />
    </div>
  );
}

function Select({ label, required, children, ...props }: { label: string; required?: boolean; children: React.ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-[#082b59]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        {...props}
        className="w-full rounded-xl border border-[#dce3ed] bg-white px-4 py-2.5 text-sm text-[#172033] outline-none transition-colors focus:border-[#1767b1] focus:ring-2 focus:ring-[#1767b1]/10"
      >
        {children}
      </select>
    </div>
  );
}

export default function PPDBForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  async function handleSubmit() {
    setLoading(true);
    const { error } = await supabase.from("ppdb_registrations").insert({
      full_name: data.full_name,
      birth_place: data.birth_place,
      birth_date: data.birth_date,
      gender: data.gender,
      address: data.address,
      phone: data.phone,
      email: "",
      parent_name: `${data.father_name} / ${data.mother_name}`,
      parent_occupation: data.father_job,
      previous_school: data.previous_school,
      registration_path: data.program.includes("Boarding") ? "reguler" : "reguler",
    });
    setLoading(false);
    if (!error) setSuccess(true);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              i < step ? "bg-green-500 text-white" : i === step ? "bg-[#082b59] text-white" : "bg-[#dce3ed] text-slate-500"
            }`}>
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`ml-2 text-sm ${i === step ? "font-semibold text-[#082b59]" : "text-slate-400"}`}>{s}</span>
            {i < steps.length - 1 && <div className="mx-3 h-px w-8 bg-[#dce3ed]" />}
          </div>
        ))}
      </div>

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-green-800">Pendaftaran Berhasil!</h3>
          <p className="mt-2 text-sm text-green-600">
            Data Anda telah kami terima. Silakan hubungi contact person untuk informasi lebih lanjut.
          </p>
          <div className="mt-4 rounded-xl bg-white p-4 text-left text-sm text-slate-600">
            <p className="font-medium text-[#082b59]">Contact Person:</p>
            <p>Bu Azizah: 085259341209</p>
            <p>Bu Lusi: 082302326820</p>
            <p>Pak Arif: 085806738160</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm md:p-8">
          {/* Step 0: Program */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#082b59]">Pilihan Program</h3>
              <div className="space-y-3">
                {["SMP Boarding", "SMP Full Day (Non Boarding)"].map((prog) => (
                  <label key={prog} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                    data.program === prog ? "border-[#1767b1] bg-[#1767b1]/5" : "border-[#dce3ed] hover:border-[#1767b1]/30"
                  }`}>
                    <input type="radio" name="program" value={prog} checked={data.program === prog} onChange={(e) => update("program", e.target.value)} className="accent-[#1767b1]" />
                    <span className="text-sm font-medium text-[#082b59]">{prog}</span>
                  </label>
                ))}
              </div>
              <div className="rounded-xl bg-[#f4f7fb] p-4 text-sm text-slate-600">
                <p className="font-medium text-[#082b59]">Informasi Penting:</p>
                <p className="mt-1">Transfer pendaftaran Rp. 200.000 ke:</p>
                <p className="font-medium">Bank Muamalat - No. Rek: 7310065863</p>
                <p>A.N Majelis Dikdasmen dan PNF Muhammadiyah Tanggul</p>
              </div>
            </div>
          )}

          {/* Step 1: Data Siswa */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#082b59]">Data Siswa</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Nama Lengkap" required placeholder="Nama Lengkap Siswa" value={data.full_name} onChange={(e) => update("full_name", e.target.value)} />
                <Input label="Nama Panggilan" required placeholder="Nama Panggilan" value={data.nickname} onChange={(e) => update("nickname", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Jenis Kelamin" required value={data.gender} onChange={(e) => update("gender", e.target.value)}>
                  <option value="L">Laki-Laki</option>
                  <option value="P">Perempuan</option>
                </Select>
                <Input label="Golongan Darah" placeholder="(contoh: A/B/AB/O)" value={data.blood_type} onChange={(e) => update("blood_type", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tempat Lahir" required placeholder="Kota/Kabupaten Lahir" value={data.birth_place} onChange={(e) => update("birth_place", e.target.value)} />
                <Input label="Tanggal Lahir" required type="date" value={data.birth_date} onChange={(e) => update("birth_date", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="NISN" required placeholder="Nomor Induk Siswa Nasional" value={data.nisn} onChange={(e) => update("nisn", e.target.value)} />
                <Input label="NIK" required placeholder="Nomor Induk Kependudukan" value={data.nik} onChange={(e) => update("nik", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tinggi Badan (cm)" required placeholder="Contoh: 150" value={data.height} onChange={(e) => update("height", e.target.value)} />
                <Input label="Berat Badan (kg)" required placeholder="Contoh: 40" value={data.weight} onChange={(e) => update("weight", e.target.value)} />
              </div>
              <Input label="Bahasa Sehari-hari" required placeholder="Contoh: Bahasa Indonesia, Bahasa Jawa, Bahasa Inggris" value={data.language} onChange={(e) => update("language", e.target.value)} />
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Hobi" required placeholder="Contoh: Membaca, Olahraga" value={data.hobby} onChange={(e) => update("hobby", e.target.value)} />
                <Input label="Cita-cita" required placeholder="Contoh: Guru, Dokter" value={data.ambition} onChange={(e) => update("ambition", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Input label="Anak Ke-" required placeholder="Contoh: 2" value={data.child_order} onChange={(e) => update("child_order", e.target.value)} />
                <Input label="Jumlah Saudara" placeholder="Contoh: 3" value={data.siblings} onChange={(e) => update("siblings", e.target.value)} />
                <Select label="Yatim/Piatu" value={data.orphan_status} onChange={(e) => update("orphan_status", e.target.value)}>
                  <option value="tidak">Tidak</option>
                  <option value="yatim">Yatim</option>
                  <option value="piatu">Piatu</option>
                  <option value="yatim_piatu">Yatim Piatu</option>
                </Select>
              </div>
              <Input label="Asal Sekolah" required placeholder="Nama Sekolah Asal" value={data.previous_school} onChange={(e) => update("previous_school", e.target.value)} />
              <Input label="Alamat Lengkap" required placeholder="Alamat Domisili" value={data.address} onChange={(e) => update("address", e.target.value)} />
              <Input label="No. HP/WA" required placeholder="08xxxxxxxxxx" value={data.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
          )}

          {/* Step 2: Data Orang Tua */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-bold text-[#082b59]">Data Ayah</h3>
                <div className="space-y-4">
                  <Input label="Nama Ayah Kandung" required placeholder="Nama Ayah" value={data.father_name} onChange={(e) => update("father_name", e.target.value)} />
                  <Input label="Tempat, Tanggal Lahir" required placeholder="Kota, DD Bulan Tahun" value={data.father_birth} onChange={(e) => update("father_birth", e.target.value)} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1" value={data.father_education} onChange={(e) => update("father_education", e.target.value)} />
                    <Input label="Pekerjaan" placeholder="Contoh: Wiraswasta, Karyawan" value={data.father_job} onChange={(e) => update("father_job", e.target.value)} />
                  </div>
                  <Input label="Penghasilan (Perbulan)" placeholder="Rp (contoh: 3.000.000)" value={data.father_income} onChange={(e) => update("father_income", e.target.value)} />
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-lg font-bold text-[#082b59]">Data Ibu</h3>
                <div className="space-y-4">
                  <Input label="Nama Ibu Kandung" required placeholder="Nama Ibu" value={data.mother_name} onChange={(e) => update("mother_name", e.target.value)} />
                  <Input label="Tempat, Tanggal Lahir" required placeholder="Kota, DD Bulan Tahun" value={data.mother_birth} onChange={(e) => update("mother_birth", e.target.value)} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1" value={data.mother_education} onChange={(e) => update("mother_education", e.target.value)} />
                    <Input label="Pekerjaan" placeholder="Contoh: Ibu Rumah Tangga, Guru" value={data.mother_job} onChange={(e) => update("mother_job", e.target.value)} />
                  </div>
                  <Input label="Penghasilan (Perbulan)" placeholder="Rp (contoh: 2.000.000)" value={data.mother_income} onChange={(e) => update("mother_income", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Selesai */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-[#082b59]">Konfirmasi Data</h3>
              <div className="rounded-xl bg-[#f4f7fb] p-4 text-sm">
                <div className="grid gap-2 md:grid-cols-2">
                  <div><span className="text-slate-500">Program:</span> <span className="font-medium">{data.program || "-"}</span></div>
                  <div><span className="text-slate-500">Nama:</span> <span className="font-medium">{data.full_name || "-"}</span></div>
                  <div><span className="text-slate-500">Asal Sekolah:</span> <span className="font-medium">{data.previous_school || "-"}</span></div>
                  <div><span className="text-slate-500">Ayah:</span> <span className="font-medium">{data.father_name || "-"}</span></div>
                  <div><span className="text-slate-500">Ibu:</span> <span className="font-medium">{data.mother_name || "-"}</span></div>
                  <div><span className="text-slate-500">No. HP:</span> <span className="font-medium">{data.phone || "-"}</span></div>
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
                <p className="font-medium">Berkas yang perlu dikumpulkan:</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>Scan Kartu Keluarga</li>
                  <li>Scan Akta Kelahiran</li>
                  <li>Scan Surat Keterangan Aktif dari Sekolah Asal</li>
                  <li>Scan KTP Ayah dan Ibu</li>
                  <li>Bukti Transfer Pendaftaran Rp. 200.000</li>
                </ol>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#082b59]">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </button>
            ) : <div />}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 0 && !data.program} className="flex items-center gap-2 rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1767b1] disabled:opacity-50">
                Selanjutnya <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50">
                {loading ? "Mengirim..." : "Kirim Pendaftaran"} <FileText className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
