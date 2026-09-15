"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle, ArrowLeft, ArrowRight, FileText } from "@/components/Icons";
import { supabase } from "@/lib/supabase";
import { submitRegistration } from "@/lib/queries";
import { Input, InputRupiah, Select, DatePicker, FileUpload } from "@/components/ui";

const steps = ["Program", "Data Siswa", "Data Orang Tua", "Upload Berkas", "Selesai"];

const KOTA_KABUPATEN = [
  "Jember","Surabaya","Malang","Sidoarjo","Gresik","Banyuwangi","Probolinggo","Lumajang",
  "Situbondo","Bondowoso","Ponorogo","Pasuruan","Lamongan","Tuban","Bojonegoro","Nganjuk",
  "Kediri","Blitar","Tulungagung","Trenggalek","Ngawi","Magetan","Pacitan","Madiun",
  "Solo","Sukoharjo","Klaten","Boyolali","Sragen","Karanganyar","Wonogiri","Purbalingga",
  "Banyumas","Cilacap","Banjarnegara","Kebumen","Purworejo","Wonosobo",
  "Magelang","Temanggung","Semarang","Demak","Kudus","Jepara","Pati","Rembang","Blora",
  "Grobogan","Tegal","Pemalang","Batang","Kendal","Brebes","Pekalongan",
  "Bandung","Cimahi","Garut","Tasikmalaya","Ciamis","Kuningan","Cirebon","Majalengka",
  "Sumedang","Indramayu","Subang","Purwakarta","Karawang","Bekasi","Bogor","Sukabumi",
  "Cianjur","Tangerang","Serang","Cilegon","Pandeglang","Lebak","Jakarta",
  "Yogyakarta","Bantul","Sleman","Gunung Kidul","Kulon Progo",
  "Bandar Lampung","Metro","Lampung Selatan","Lampung Timur","Lampung Barat",
  "Palembang","Banyuasin","Ogan Komering Ilir","Musi Banyuasin","Lahat","Muara Enim",
  "Prabumulih","Lubuklinggau","Pali","Empat Lawang",
  "Bangkalan","Sampang","Pamekasan","Sumenep","Batu",
].filter((v, i, a) => a.indexOf(v) === i).sort();

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
  email: string;
  father_name: string;
  father_birth_place: string;
  father_birth_date: string;
  father_education: string;
  father_job: string;
  father_income: string;
  mother_name: string;
  mother_birth_place: string;
  mother_birth_date: string;
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
  email: "",
  father_name: "",
  father_birth_place: "",
  father_birth_date: "",
  father_education: "",
  father_job: "",
  father_income: "",
  mother_name: "",
  mother_birth_place: "",
  mother_birth_date: "",
  mother_education: "",
  mother_job: "",
  mother_income: "",
};

type Documents = {
  kk: File | null;
  akta: File | null;
  surat_sekolah: File | null;
  ktp_ortu: File | null;
  bukti_transfer: File | null;
};

const initialDocs: Documents = {
  kk: null,
  akta: null,
  surat_sekolah: null,
  ktp_ortu: null,
  bukti_transfer: null,
};

const STORAGE_KEY = "spmb_form_data";
const STORAGE_STEP_KEY = "spmb_form_step";

const DEBUG_DATA: FormData = {
  program: "SMP Boarding",
  full_name: "Ahmad Fauzi",
  nickname: "Fauzi",
  gender: "L",
  birth_place: "Jember",
  birth_date: "2012-05-15",
  nisn: "0012345678",
  nik: "3509123456780001",
  height: "150",
  weight: "42",
  language: "Bahasa Indonesia",
  hobby: "Sepak Bola",
  ambition: "Insinyur",
  child_order: "2",
  siblings: "3",
  blood_type: "A",
  orphan_status: "tidak",
  previous_school: "SDN 01 Tanggul",
  address: "Jl. Merdeka No. 10, Tanggul, Jember",
  phone: "081234567890",
  email: "test@example.com",
  father_name: "Budi Santoso",
  father_birth_place: "Surabaya",
  father_birth_date: "1980-03-20",
  father_education: "S1",
  father_job: "Wiraswasta",
  father_income: "5000000",
  mother_name: "Siti Aminah",
  mother_birth_place: "Malang",
  mother_birth_date: "1982-07-10",
  mother_education: "SMA",
  mother_job: "Ibu Rumah Tangga",
  mother_income: "0",
};

export default function SPMBForm() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);
  const [docs, setDocs] = useState<Documents>(initialDocs);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);

  // Enter → next field
  function handleFormKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "TEXTAREA") return;
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fields = Array.from(form.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [data-field-type="select"]:not([disabled]), [data-field-type="datepicker"]:not([disabled])'
    ));
    const idx = fields.indexOf(e.target as HTMLElement);
    if (idx !== -1 && idx < fields.length - 1) {
      fields[idx + 1].focus();
    }
  }

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      const savedStep = localStorage.getItem(STORAGE_STEP_KEY);
      if (savedData) {
        setData(JSON.parse(savedData));
        setStep(savedStep ? parseInt(savedStep, 10) : 0);
      }
    } catch {}
    loadedRef.current = true;
  }, []);

  // Save to localStorage on every change (skip initial mount to avoid overwrite)
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(STORAGE_STEP_KEY, step.toString());
    } catch {}
  }, [data, step]);

  // Clear localStorage on successful submit
  function clearStorage() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_STEP_KEY);
  }

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const updateDoc = (field: keyof Documents, file: File | null) => {
    setDocs((prev) => ({ ...prev, [field]: file }));
    if (errors[`doc_${field}`]) setErrors((prev) => ({ ...prev, [`doc_${field}`]: "" }));
  };

  // DEBUG: auto-fill semua field
  function validateStep(s: number): boolean {
    const e: Record<string, string> = {};

    if (s === 0) {
      if (!data.program) e.program = "Pilih program terlebih dahulu";
    }

    if (s === 1) {
      const required: [keyof FormData, string][] = [
        ["full_name", "Nama Lengkap"],
        ["nickname", "Nama Panggilan"],
        ["birth_place", "Tempat Lahir"],
        ["birth_date", "Tanggal Lahir"],
        ["nisn", "NISN"],
        ["nik", "NIK"],
        ["height", "Tinggi Badan"],
        ["weight", "Berat Badan"],
        ["language", "Bahasa Sehari-hari"],
        ["hobby", "Hobi"],
        ["ambition", "Cita-cita"],
        ["child_order", "Anak Ke-"],
        ["previous_school", "Asal Sekolah"],
        ["address", "Alamat Lengkap"],
      ];
      for (const [key, label] of required) {
        if (!data[key]) e[key] = `${label} wajib diisi`;
      }
      if (data.nisn && !/^\d{10}$/.test(data.nisn)) e.nisn = "NISN harus 10 digit angka";
      if (data.nik && !/^\d{16}$/.test(data.nik)) e.nik = "NIK harus 16 digit angka";
    }

    if (s === 2) {
      const required: [keyof FormData, string][] = [
        ["father_name", "Nama Ayah"],
        ["father_birth_place", "Tempat Lahir Ayah"],
        ["father_birth_date", "Tanggal Lahir Ayah"],
        ["mother_name", "Nama Ibu"],
        ["mother_birth_place", "Tempat Lahir Ibu"],
        ["mother_birth_date", "Tanggal Lahir Ibu"],
        ["phone", "No. HP/WA"],
      ];
      for (const [key, label] of required) {
        if (!data[key]) e[key] = `${label} wajib diisi`;
      }
    }

    if (s === 3) {
      const requiredDocs: [keyof Documents, string][] = [
        ["kk", "Scan Kartu Keluarga"],
        ["akta", "Scan Akta Kelahiran"],
        ["surat_sekolah", "Scan Surat Keterangan Aktif"],
        ["ktp_ortu", "Scan KTP Ayah dan Ibu"],
        ["bukti_transfer", "Bukti Transfer Pendaftaran"],
      ];
      for (const [key, label] of requiredDocs) {
        if (!docs[key]) e[`doc_${key}`] = `${label} wajib diupload`;
      }
    }

    setErrors(e);

    if (Object.keys(e).length > 0) {
      const firstErrorField = Object.keys(e)[0];
      const el = formRef.current?.querySelector(`[data-field="${firstErrorField}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const { data: uploadData, error } = await supabase.storage
      .from("spmb-documents")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      console.error("Upload error:", error);
      if (error.message?.includes("file_size")) {
        setErrors({ submit: `File "${file.name}" terlalu besar. Maksimal 10 MB.` });
      } else if (error.message?.includes("mime")) {
        setErrors({ submit: `Format file "${file.name}" tidak didukung. Gunakan PDF, JPG, atau PNG.` });
      } else {
        setErrors({ submit: `Gagal upload "${file.name}". ${error.message}` });
      }
      return null;
    }
    return uploadData.path;
  }

  async function handleSubmit() {
    setLoading(true);

    const nisn = data.nisn || Date.now().toString();
    const folder = `spmb-${new Date().getFullYear()}/${nisn}`;

    const [kkUrl, aktaUrl, suratUrl, ktpUrl, transferUrl] = await Promise.all([
      docs.kk ? uploadFile(docs.kk, `${folder}/kk.${docs.kk.name.split(".").pop()}`) : Promise.resolve(null),
      docs.akta ? uploadFile(docs.akta, `${folder}/akta.${docs.akta.name.split(".").pop()}`) : Promise.resolve(null),
      docs.surat_sekolah ? uploadFile(docs.surat_sekolah, `${folder}/surat.${docs.surat_sekolah.name.split(".").pop()}`) : Promise.resolve(null),
      docs.ktp_ortu ? uploadFile(docs.ktp_ortu, `${folder}/ktp.${docs.ktp_ortu.name.split(".").pop()}`) : Promise.resolve(null),
      docs.bukti_transfer ? uploadFile(docs.bukti_transfer, `${folder}/transfer.${docs.bukti_transfer.name.split(".").pop()}`) : Promise.resolve(null),
    ]);

    const documents = {
      kk: kkUrl,
      akta: aktaUrl,
      surat_sekolah: suratUrl,
      ktp_ortu: ktpUrl,
      bukti_transfer: transferUrl,
      nickname: data.nickname,
      nisn: data.nisn,
      nik: data.nik,
      height: data.height,
      weight: data.weight,
      language: data.language,
      hobby: data.hobby,
      ambition: data.ambition,
      child_order: data.child_order,
      siblings: data.siblings,
      blood_type: data.blood_type,
      orphan_status: data.orphan_status,
      father_birth_place: data.father_birth_place,
      father_birth_date: data.father_birth_date,
      mother_name: data.mother_name,
      mother_birth_place: data.mother_birth_place,
      mother_birth_date: data.mother_birth_date,
      mother_education: data.mother_education,
      mother_job: data.mother_job,
      mother_income: data.mother_income,
    };

    const registrationPath = data.program.includes("Boarding") ? "reguler" : "prestasi";

    const result = await submitRegistration({
      full_name: data.full_name,
      birth_place: data.birth_place,
      birth_date: data.birth_date,
      gender: data.gender as "L" | "P",
      address: data.address,
      phone: data.phone,
      email: data.email,
      parent_name: `${data.father_name} / ${data.mother_name}`,
      parent_occupation: data.father_job,
      previous_school: data.previous_school,
      registration_path: registrationPath,
      documents,
    });

    setLoading(false);
    if (!result.success) {
      setErrors({ submit: result.error || "Gagal mengirim data. Silakan coba lagi." });
      return;
    }
    clearStorage();
    setSuccess(true);
  }

  return (
    <div className="mx-auto max-w-2xl" ref={formRef} onKeyDown={handleFormKeyDown}>

      {/* DEBUG: Auto-fill button */}
      {process.env.NODE_ENV === "development" && (
        <button
          onClick={() => { setData(DEBUG_DATA); setStep(0); setErrors({}); }}
          className="mb-4 w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 cursor-pointer"
        >
          ⚡ Auto-Fill (Debug)
        </button>
      )}

      {/* Progress */}
      <div className="mb-8 overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex items-center justify-center gap-2 px-2 pb-2 min-w-max mx-auto md:min-w-0 md:gap-4 md:justify-center">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0 md:gap-4">
              <div className={`flex aspect-square h-8 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none transition-colors ${
                i < step ? "bg-green-500 text-white" : i === step ? "bg-[#082b59] text-white" : "bg-[#dce3ed] text-slate-500"
              }`}>
                {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`text-sm whitespace-nowrap ${i === step ? "font-semibold text-[#082b59]" : "text-slate-400"}`}>{s}</span>
              {i < steps.length - 1 && <div className="h-px w-4 shrink-0 bg-[#dce3ed] md:w-8" />}
            </div>
          ))}
        </div>
      </div>

      {success ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-green-800">Pendaftaran Berhasil!</h3>
          <p className="mt-2 text-sm text-green-600">
            Data Anda telah kami terima. Silakan hubungi contact person di bawah untuk informasi lebih lanjut.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#dce3ed] bg-white p-6 shadow-sm md:p-8">
          {/* Step 0: Program */}
          {step === 0 && (
            <div className="step-enter space-y-4">
              <h3 className="text-lg font-bold text-[#082b59]">Pilihan Program</h3>
              {errors.program && <p className="text-sm text-red-500">{errors.program}</p>}
              <div className="space-y-3">
                {["SMP Boarding", "SMP Full Day (Non Boarding)", "SMA Boarding"].map((prog) => (
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
            <div className="step-enter space-y-4">
              <h3 className="text-lg font-bold text-[#082b59]">Data Siswa</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div data-field="full_name"><Input label="Nama Lengkap" required placeholder="Nama Lengkap Siswa" value={data.full_name} onChange={(e) => update("full_name", e.target.value)} error={errors.full_name} /></div>
                <div data-field="nickname"><Input label="Nama Panggilan" required placeholder="Nama Panggilan" value={data.nickname} onChange={(e) => update("nickname", e.target.value)} error={errors.nickname} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Jenis Kelamin" required options={["Laki-Laki", "Perempuan"]} value={data.gender === "L" ? "Laki-Laki" : "Perempuan"} onChange={(val) => update("gender", val === "Laki-Laki" ? "L" : "P")} />
                <Input label="Golongan Darah" placeholder="(contoh: A/B/AB/O)" value={data.blood_type} onChange={(e) => update("blood_type", e.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div data-field="birth_place"><Select searchable label="Tempat Lahir" required options={KOTA_KABUPATEN} value={data.birth_place} onChange={(val) => update("birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.birth_place} /></div>
                <div data-field="birth_date"><DatePicker label="Tanggal Lahir" required value={data.birth_date} onChange={(val) => update("birth_date", val)} error={errors.birth_date} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div data-field="nisn"><Input label="NISN" required placeholder="10 digit angka" value={data.nisn} onChange={(e) => update("nisn", e.target.value)} error={errors.nisn} /></div>
                <div data-field="nik"><Input label="NIK" required placeholder="16 digit angka" value={data.nik} onChange={(e) => update("nik", e.target.value)} error={errors.nik} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div data-field="height"><Input label="Tinggi Badan (cm)" required placeholder="Contoh: 150" value={data.height} onChange={(e) => update("height", e.target.value)} error={errors.height} /></div>
                <div data-field="weight"><Input label="Berat Badan (kg)" required placeholder="Contoh: 40" value={data.weight} onChange={(e) => update("weight", e.target.value)} error={errors.weight} /></div>
              </div>
              <div data-field="language"><Input label="Bahasa Sehari-hari" required placeholder="Contoh: Bahasa Indonesia, Bahasa Jawa, Bahasa Inggris" value={data.language} onChange={(e) => update("language", e.target.value)} error={errors.language} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div data-field="hobby"><Input label="Hobi" required placeholder="Contoh: Membaca, Olahraga" value={data.hobby} onChange={(e) => update("hobby", e.target.value)} error={errors.hobby} /></div>
                <div data-field="ambition"><Input label="Cita-cita" required placeholder="Contoh: Guru, Dokter" value={data.ambition} onChange={(e) => update("ambition", e.target.value)} error={errors.ambition} /></div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div data-field="child_order"><Input label="Anak Ke-" required placeholder="Contoh: 2" value={data.child_order} onChange={(e) => update("child_order", e.target.value)} error={errors.child_order} /></div>
                <Input label="Jumlah Saudara" placeholder="Contoh: 3" value={data.siblings} onChange={(e) => update("siblings", e.target.value)} />
                <Select label="Yatim/Piatu" options={["Tidak", "Yatim", "Piatu", "Yatim Piatu"]} value={data.orphan_status === "tidak" ? "Tidak" : data.orphan_status === "yatim" ? "Yatim" : data.orphan_status === "piatu" ? "Piatu" : "Yatim Piatu"} onChange={(val) => update("orphan_status", val === "Tidak" ? "tidak" : val === "Yatim" ? "yatim" : val === "Piatu" ? "piatu" : "yatim_piatu")} />
              </div>
              <div data-field="previous_school"><Input label="Asal Sekolah" required placeholder="Nama Sekolah Asal" value={data.previous_school} onChange={(e) => update("previous_school", e.target.value)} error={errors.previous_school} /></div>
              <div data-field="address"><Input label="Alamat Lengkap" required placeholder="Alamat Domisili" value={data.address} onChange={(e) => update("address", e.target.value)} error={errors.address} /></div>
            </div>
          )}

          {/* Step 2: Data Orang Tua */}
          {step === 2 && (
            <div className="step-enter space-y-6">
              <div>
                <h3 className="mb-4 text-lg font-bold text-[#082b59]">Data Ayah</h3>
                <div className="space-y-4">
                  <div data-field="father_name"><Input label="Nama Ayah Kandung" required placeholder="Nama Ayah" value={data.father_name} onChange={(e) => update("father_name", e.target.value)} error={errors.father_name} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div data-field="father_birth_place"><Select searchable label="Tempat Lahir" required options={KOTA_KABUPATEN} value={data.father_birth_place} onChange={(val) => update("father_birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.father_birth_place} /></div>
                    <div data-field="father_birth_date"><DatePicker label="Tanggal Lahir" required value={data.father_birth_date} onChange={(val) => update("father_birth_date", val)} error={errors.father_birth_date} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1" value={data.father_education} onChange={(e) => update("father_education", e.target.value)} />
                    <Input label="Pekerjaan" placeholder="Contoh: Wiraswasta, Karyawan" value={data.father_job} onChange={(e) => update("father_job", e.target.value)} />
                  </div>
                  <InputRupiah label="Penghasilan (Perbulan)" placeholder="0" value={data.father_income} onChange={(val) => update("father_income", val)} />
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-lg font-bold text-[#082b59]">Data Ibu</h3>
                <div className="space-y-4">
                  <div data-field="mother_name"><Input label="Nama Ibu Kandung" required placeholder="Nama Ibu" value={data.mother_name} onChange={(e) => update("mother_name", e.target.value)} error={errors.mother_name} /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div data-field="mother_birth_place"><Select searchable label="Tempat Lahir" required options={KOTA_KABUPATEN} value={data.mother_birth_place} onChange={(val) => update("mother_birth_place", val)} placeholder="Pilih kota/kabupaten" error={errors.mother_birth_place} /></div>
                    <div data-field="mother_birth_date"><DatePicker label="Tanggal Lahir" required value={data.mother_birth_date} onChange={(val) => update("mother_birth_date", val)} error={errors.mother_birth_date} /></div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input label="Pendidikan Terakhir" placeholder="Contoh: SMA, SMK, S1" value={data.mother_education} onChange={(e) => update("mother_education", e.target.value)} />
                    <Input label="Pekerjaan" placeholder="Contoh: Ibu Rumah Tangga, Guru" value={data.mother_job} onChange={(e) => update("mother_job", e.target.value)} />
                  </div>
                  <InputRupiah label="Penghasilan (Perbulan)" placeholder="0" value={data.mother_income} onChange={(val) => update("mother_income", val)} />
                </div>
              </div>
              <div>
                <h3 className="mb-4 text-lg font-bold text-[#082b59]">Kontak Orang Tua</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div data-field="phone"><Input label="No. HP/WA" required placeholder="08xxxxxxxxxx" value={data.phone} onChange={(e) => update("phone", e.target.value)} error={errors.phone} /></div>
                  <div data-field="email"><Input label="Email" type="email" placeholder="email@contoh.com" value={data.email} onChange={(e) => update("email", e.target.value)} /></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Upload Berkas */}
          {step === 3 && (
            <div className="step-enter space-y-5">
              <h3 className="text-lg font-bold text-[#082b59]">Upload Berkas Persyaratan</h3>
              <p className="text-sm text-slate-500">Format: PDF, JPG, PNG, WebP. Maksimal 10 MB per file.</p>

              <div data-field="doc_kk">
                <FileUpload
                  label="Scan Kartu Keluarga"
                  required
                  value={docs.kk}
                  onChange={(file) => updateDoc("kk", file)}
                  error={errors.doc_kk}
                />
              </div>

              <div data-field="doc_akta">
                <FileUpload
                  label="Scan Akta Kelahiran"
                  required
                  value={docs.akta}
                  onChange={(file) => updateDoc("akta", file)}
                  error={errors.doc_akta}
                />
              </div>

              <div data-field="doc_surat_sekolah">
                <FileUpload
                  label="Scan Surat Keterangan Aktif dari Sekolah Asal"
                  required
                  value={docs.surat_sekolah}
                  onChange={(file) => updateDoc("surat_sekolah", file)}
                  error={errors.doc_surat_sekolah}
                />
              </div>

              <div data-field="doc_ktp_ortu">
                <FileUpload
                  label="Scan KTP Ayah dan Ibu"
                  required
                  value={docs.ktp_ortu}
                  onChange={(file) => updateDoc("ktp_ortu", file)}
                  error={errors.doc_ktp_ortu}
                />
              </div>

              <div data-field="doc_bukti_transfer">
                <FileUpload
                  label="Bukti Transfer Pendaftaran Rp. 200.000"
                  required
                  value={docs.bukti_transfer}
                  onChange={(file) => updateDoc("bukti_transfer", file)}
                  error={errors.doc_bukti_transfer}
                />
              </div>
            </div>
          )}

          {/* Step 4: Konfirmasi */}
          {step === 4 && (
            <div className="step-enter space-y-5">
              <div>
                <h3 className="text-lg font-bold text-[#082b59]">Konfirmasi Data</h3>
                <p className="mt-1 text-sm text-slate-500">Pastikan semua data sudah benar sebelum mengirim pendaftaran.</p>
              </div>

              {/* Ringkasan */}
              <div className="flex items-center gap-3 rounded-xl border border-[#dce3ed] bg-[#f4f7fb] px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>4 Step Selesai</span>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span>{Object.values(docs).filter(Boolean).length}/5 Berkas</span>
                </div>
                <div className="h-4 w-px bg-slate-300" />
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-[#1767b1]" />
                  <span className="font-medium text-[#1767b1]">{data.program}</span>
                </div>
              </div>

              {/* Program */}
              <div className="overflow-hidden rounded-xl border border-[#dce3ed] bg-white">
                <div className="flex items-center gap-2.5 bg-[#082b59] px-4 py-2.5">
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">1</div>
                  <h4 className="text-sm font-bold text-white">Program Pilihan</h4>
                </div>
                <div className="p-4">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#f4d21f]/10 px-3 py-1.5 text-sm font-semibold text-[#082b59]">
                    {data.program || "-"}
                  </div>
                </div>
              </div>

              {/* Data Siswa */}
              <div className="overflow-hidden rounded-xl border border-[#dce3ed] bg-white">
                <div className="flex items-center gap-2.5 bg-[#082b59] px-4 py-2.5">
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">2</div>
                  <h4 className="text-sm font-bold text-white">Data Siswa</h4>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-[#f0f3f8]">
                      <tr><td className="w-40 py-1.5 text-slate-400">Nama Lengkap</td><td className="py-1.5 font-medium text-[#082b59]">{data.full_name || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Nama Panggilan</td><td className="py-1.5 font-medium text-[#082b59]">{data.nickname || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Jenis Kelamin</td><td className="py-1.5 font-medium text-[#082b59]">{data.gender === "L" ? "Laki-Laki" : "Perempuan"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Golongan Darah</td><td className="py-1.5 font-medium text-[#082b59]">{data.blood_type || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Tempat Lahir</td><td className="py-1.5 font-medium text-[#082b59]">{data.birth_place || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Tanggal Lahir</td><td className="py-1.5 font-medium text-[#082b59]">{data.birth_date || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">NISN</td><td className="py-1.5 font-mono font-medium text-[#082b59]">{data.nisn || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">NIK</td><td className="py-1.5 font-mono font-medium text-[#082b59]">{data.nik || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Tinggi / Berat Badan</td><td className="py-1.5 font-medium text-[#082b59]">{data.height} cm / {data.weight} kg</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Anak Ke-</td><td className="py-1.5 font-medium text-[#082b59]">{data.child_order} dari {data.siblings} bersaudara</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Bahasa Sehari-hari</td><td className="py-1.5 font-medium text-[#082b59]">{data.language || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Hobi</td><td className="py-1.5 font-medium text-[#082b59]">{data.hobby || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Cita-cita</td><td className="py-1.5 font-medium text-[#082b59]">{data.ambition || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Yatim/Piatu</td><td className="py-1.5 font-medium text-[#082b59]">{data.orphan_status === "tidak" ? "Tidak" : data.orphan_status === "yatim" ? "Yatim" : data.orphan_status === "piatu" ? "Piatu" : "Yatim Piatu"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Asal Sekolah</td><td className="py-1.5 font-medium text-[#082b59]">{data.previous_school || "-"}</td></tr>
                      <tr><td className="py-1.5 text-slate-400">Alamat</td><td className="py-1.5 font-medium text-[#082b59]">{data.address || "-"}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Data Orang Tua */}
              <div className="overflow-hidden rounded-xl border border-[#dce3ed] bg-white">
                <div className="flex items-center gap-2.5 bg-[#082b59] px-4 py-2.5">
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">3</div>
                  <h4 className="text-sm font-bold text-white">Data Orang Tua</h4>
                </div>
                <div className="divide-y divide-[#f0f3f8] p-4">
                  {/* Ayah */}
                  <div className="pb-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-[#1767b1]" />
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1767b1]">Ayah</p>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="w-36 py-1 text-slate-400">Nama</td><td className="py-1 font-medium text-[#082b59]">{data.father_name || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Tempat Lahir</td><td className="py-1 font-medium text-[#082b59]">{data.father_birth_place || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Tanggal Lahir</td><td className="py-1 font-medium text-[#082b59]">{data.father_birth_date || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Pendidikan</td><td className="py-1 font-medium text-[#082b59]">{data.father_education || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Pekerjaan</td><td className="py-1 font-medium text-[#082b59]">{data.father_job || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Penghasilan/bulan</td><td className="py-1 font-medium text-[#082b59]">{data.father_income ? `Rp ${data.father_income}` : "-"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Ibu */}
                  <div className="pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-[#1767b1]" />
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1767b1]">Ibu</p>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="w-36 py-1 text-slate-400">Nama</td><td className="py-1 font-medium text-[#082b59]">{data.mother_name || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Tempat Lahir</td><td className="py-1 font-medium text-[#082b59]">{data.mother_birth_place || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Tanggal Lahir</td><td className="py-1 font-medium text-[#082b59]">{data.mother_birth_date || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Pendidikan</td><td className="py-1 font-medium text-[#082b59]">{data.mother_education || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Pekerjaan</td><td className="py-1 font-medium text-[#082b59]">{data.mother_job || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Penghasilan/bulan</td><td className="py-1 font-medium text-[#082b59]">{data.mother_income ? `Rp ${data.mother_income}` : "-"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  {/* Kontak */}
                  <div className="pt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="h-5 w-1 rounded-full bg-[#1767b1]" />
                      <p className="text-xs font-bold uppercase tracking-wide text-[#1767b1]">Kontak</p>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="w-36 py-1 text-slate-400">No. HP/WA</td><td className="py-1 font-medium text-[#082b59]">{data.phone || "-"}</td></tr>
                        <tr><td className="py-1 text-slate-400">Email</td><td className="py-1 font-medium text-[#082b59]">{data.email || "-"}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Berkas */}
              <div className="overflow-hidden rounded-xl border border-[#dce3ed] bg-white">
                <div className="flex items-center gap-2.5 bg-[#082b59] px-4 py-2.5">
                  <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold text-white">4</div>
                  <h4 className="text-sm font-bold text-white">Berkas ({Object.values(docs).filter(Boolean).length}/5)</h4>
                </div>
                <div className="p-4">
                  <div className="grid gap-2 text-sm md:grid-cols-2">
                    {([
                      ["kk", "Kartu Keluarga", "KK"],
                      ["akta", "Akta Kelahiran", "Akta"],
                      ["surat_sekolah", "Surat Keterangan Sekolah", "Surat"],
                      ["ktp_ortu", "KTP Orang Tua", "KTP"],
                      ["bukti_transfer", "Bukti Transfer", "Transfer"],
                    ] as [keyof Documents, string, string][]).map(([key, label, abbr]) => {
                      const file = docs[key];
                      const sizeKB = file ? (file.size / 1024).toFixed(1) : null;
                      const ext = file?.name.split(".").pop()?.toUpperCase();
                      return (
                        <div key={key} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${file ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <div className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${file ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                            {abbr}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium ${file ? "text-green-700" : "text-red-600"}`}>{label}</div>
                            {file ? (
                              <div className="truncate text-[11px] text-slate-400">{file.name} &middot; {sizeKB} KB</div>
                            ) : (
                              <div className="text-[11px] text-red-400">Belum diupload</div>
                            )}
                          </div>
                          {file && <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={() => { setErrors({}); setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-[#082b59]">
                <ArrowLeft className="h-4 w-4" /> Kembali
              </button>
            ) : (
              <div />
            )}
            {errors.submit && (
              <p className="w-full text-center text-sm font-medium text-red-600">{errors.submit}</p>
            )}
            {step < 4 ? (
              <button onClick={handleNext} className="flex items-center gap-2 rounded-xl bg-[#082b59] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#1767b1]">
                Selanjutnya <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 disabled:opacity-50">
                {loading ? (
                  <>
                    <div className="spinner" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    Kirim Pendaftaran <FileText className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
