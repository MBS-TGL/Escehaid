/**
 * Modul bersama payload pendaftaran SPMB — dipakai form publik
 * (/admission/register) DAN panel admin "Tambah Pendaftar"
 * (/admin/admission).
 *
 * Tujuan: satu-satunya tempat yang menyusun jsonb `documents` + konstanta
 * daftar, supaya bentuk data pendaftar publik & admin tidak pernah menyimpang
 * (modal detail, pencarian, dan Export CSV admin membaca kunci yang sama).
 */

/** Kota/kabupaten untuk Select "Tempat Lahir" (form publik & panel admin). */
export const KOTA_KABUPATEN = [
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

/** Pilihan program pendaftaran (radio form publik & Select panel admin). */
export const SPMB_PROGRAMS = [
  "SMP Boarding",
  "SMP Full Day (Non Boarding)",
  "SMA Boarding",
];

/** Pemisah pilihan checkbox — disimpan sebagai teks agar aman di jsonb & ekspor CSV. */
export const SPMB_CHECK_SEP = " | ";

/**
 * Seluruh data teks siswa & orang tua. Kolom utama (nama, ttl, alamat, dsb.)
 * tersimpan di kolom tabel; salinan sebagian ikut ke jsonb `documents`
 * (lihat buildSpmbDocuments) supaya modal detail admin bisa menampilkan
 * semuanya.
 */
export type SpmbRegistrationData = {
  program: string;
  /** Jalur pendaftaran: "reguler" | "prestasi" | "beasiswa". */
  registration_path: string;
  full_name: string;
  nickname: string;
  /** "L" | "P" */
  gender: string;
  birth_place: string;
  /** DatePicker publik menyimpan "dd/mm/yyyy"; draft debug bisa ISO. */
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
  /** "tidak" | "yatim" | "piatu" | "yatim_piatu" */
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
  /** Angka mentah tanpa format (InputRupiah). */
  father_income: string;
  mother_name: string;
  mother_birth_place: string;
  mother_birth_date: string;
  mother_education: string;
  mother_job: string;
  mother_income: string;
};

/** Nilai awal form (kosong) — dipakai form publik & panel admin. */
export function createEmptySpmbRegistrationData(): SpmbRegistrationData {
  return {
    program: "",
    registration_path: "",
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
}

/** Berkas persyaratan — kunci jsonb sama untuk form publik & admin. */
export type SpmbDocumentFiles = {
  kk: File | null;
  akta: File | null;
  surat_sekolah: File | null;
  ktp_ortu: File | null;
  bukti_transfer: File | null;
};

export const SPMB_DOCUMENT_KEYS = [
  "kk",
  "akta",
  "surat_sekolah",
  "ktp_ortu",
  "bukti_transfer",
] as const;

export const SPMB_DOCUMENT_LABELS: Record<(typeof SPMB_DOCUMENT_KEYS)[number], string> = {
  kk: "Kartu Keluarga",
  akta: "Akta Kelahiran",
  surat_sekolah: "Surat Keterangan Sekolah",
  ktp_ortu: "KTP Orang Tua",
  bukti_transfer: "Bukti Transfer",
};

export const SPMB_EMPTY_DOCUMENT_FILES: SpmbDocumentFiles = {
  kk: null,
  akta: null,
  surat_sekolah: null,
  ktp_ortu: null,
  bukti_transfer: null,
};

/** Path berkas hasil upload per kunci (null bila tidak diunggah). */
export type SpmbDocumentPaths = Partial<Record<keyof SpmbDocumentFiles, string | null>>;

/**
 * Susun jsonb `documents` untuk spmb_registrations — SATU-SATUNYA tempat
 * penyusunan payload ini dipanggil (form publik & panel admin). Kunci berkas:
 * kk, akta, surat_sekolah, ktp_ortu, bukti_transfer + semua data teks
 * (termasuk program, father_education, father_income, father_job).
 */
export function buildSpmbDocuments(
  data: SpmbRegistrationData,
  filePaths: SpmbDocumentPaths = {}
): Record<string, string | null> {
  return {
    kk: filePaths.kk ?? null,
    akta: filePaths.akta ?? null,
    surat_sekolah: filePaths.surat_sekolah ?? null,
    ktp_ortu: filePaths.ktp_ortu ?? null,
    bukti_transfer: filePaths.bukti_transfer ?? null,
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
    program: data.program,
    father_birth_place: data.father_birth_place,
    father_birth_date: data.father_birth_date,
    father_education: data.father_education,
    father_job: data.father_job,
    father_income: data.father_income,
    mother_name: data.mother_name,
    mother_birth_place: data.mother_birth_place,
    mother_birth_date: data.mother_birth_date,
    mother_education: data.mother_education,
    mother_job: data.mother_job,
    mother_income: data.mother_income,
  };
}

/**
 * Format kolom parent_name: tab Ayah/Ibu di admin membacanya dengan
 * split(" / ") — jangan ubah formatnya.
 */
export function spmbParentName(
  data: Pick<SpmbRegistrationData, "father_name" | "mother_name">
): string {
  return `${data.father_name} / ${data.mother_name}`;
}

/**
 * Konversi nilai DatePicker ("dd/mm/yyyy") ke format kolom `date` Postgres
 * ("YYYY-MM-DD"). Nilai ISO yang sudah valid diteruskan apa adanya (draft
 * localStorage lama); nilai kosong/rusak → "" (pemanggil mengubahnya jadi
 * null — kolom date tidak menerima "").
 */
export function spmbDatePickerToIso(value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** ISO "YYYY-MM-DD" → "dd/mm/yyyy" untuk DatePicker; kosong/rusak → "". */
export function spmbIsoToDatePicker(value: string | null | undefined): string {
  const iso = (value || "").trim();
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/* ─── Mode EDIT pendaftar (panel admin) ───────────────────── */

/**
 * Bentuk minimal baris spmb_registrations yang dibutuhkan hidrasi form edit —
 * struktural (tidak mengimpor tipe Supabase) agar mudah dites.
 */
export type SpmbRegistrationRowLike = {
  full_name: string;
  birth_place: string;
  /** Kolom `date` → "YYYY-MM-DD" atau null. */
  birth_date: string | null;
  gender: string;
  address: string;
  phone: string;
  email: string;
  /** Format "Nama Ayah / Nama Ibu" (lihat spmbParentName). */
  parent_name: string;
  previous_school: string;
  documents: Record<string, string | null> | null;
};

/** Nilai yatim/piatu yang dikenali Select form — nilai lain dianggap "tidak". */
const ORPHAN_VALUES = new Set(["tidak", "yatim", "piatu", "yatim_piatu"]);

/** Ambil teks non-kosong dari jsonb documents; selain string → "". */
function docText(docs: Record<string, string | null> | null, key: string): string {
  const v = docs?.[key];
  return typeof v === "string" ? v : "";
}

/**
 * Hidrasi baris pendaftar tersimpan menjadi isian form admin (mode EDIT):
 * - kolom tabel → field utama (nama, TTL, alamat, HP, email, asal sekolah);
 * - parent_name "A / B" → nama ayah & ibu (format lihat spmbParentName);
 * - jsonb documents → field tambahan (nisn, nik, program, data orang tua, …),
 *   jawaban pertanyaan custom (kunci cf_<id>), dan path berkas tersimpan.
 *
 * Tanggal dinormalisasi ke "dd/mm/yyyy" untuk DatePicker — documents bisa
 * menyimpan "dd/mm/yyyy" (form/admin) ATAU ISO (hasil import).
 * Kunci cf_* yang tak dikenal tetap diambil supaya jawaban lama tidak hilang
 * saat disimpan ulang (mergeSpmbDocuments mempertahankannya).
 */
export function spmbRegistrationToFormData(row: SpmbRegistrationRowLike): {
  data: SpmbRegistrationData;
  custom: Record<string, string>;
  docPaths: SpmbDocumentPaths;
} {
  const docs = row.documents ?? {};
  const data = createEmptySpmbRegistrationData();

  data.program = docText(docs, "program");
  data.full_name = row.full_name ?? "";
  data.nickname = docText(docs, "nickname");
  data.gender = row.gender === "P" ? "P" : "L";
  data.birth_place = row.birth_place ?? "";
  data.birth_date = spmbIsoToDatePicker(row.birth_date);
  data.nisn = docText(docs, "nisn");
  data.nik = docText(docs, "nik");
  data.height = docText(docs, "height");
  data.weight = docText(docs, "weight");
  data.language = docText(docs, "language");
  data.hobby = docText(docs, "hobby");
  data.ambition = docText(docs, "ambition");
  data.child_order = docText(docs, "child_order");
  data.siblings = docText(docs, "siblings");
  data.blood_type = docText(docs, "blood_type");
  const orphan = docText(docs, "orphan_status");
  data.orphan_status = ORPHAN_VALUES.has(orphan) ? orphan : "tidak";
  data.previous_school = row.previous_school ?? "";
  data.address = row.address ?? "";
  data.phone = row.phone ?? "";
  data.email = row.email ?? "";

  // parent_name "Nama Ayah / Nama Ibu" — bagian pertama ayah, sisanya ibu
  // (nama ibu sendiri bisa mengandung " / "? dibalut utuh setelah pemisah pertama).
  const sep = row.parent_name ?? "";
  const idx = sep.indexOf(" / ");
  if (idx >= 0) {
    data.father_name = sep.slice(0, idx).trim();
    data.mother_name = sep.slice(idx + 3).trim();
  } else {
    data.father_name = sep.trim();
    data.mother_name = "";
  }

  data.father_birth_place = docText(docs, "father_birth_place");
  data.father_birth_date = spmbIsoToDatePicker(spmbDatePickerToIso(docText(docs, "father_birth_date")));
  data.father_education = docText(docs, "father_education");
  data.father_job = docText(docs, "father_job");
  data.father_income = docText(docs, "father_income");
  data.mother_name = data.mother_name || docText(docs, "mother_name");
  data.mother_birth_place = docText(docs, "mother_birth_place");
  data.mother_birth_date = spmbIsoToDatePicker(spmbDatePickerToIso(docText(docs, "mother_birth_date")));
  data.mother_education = docText(docs, "mother_education");
  data.mother_job = docText(docs, "mother_job");
  data.mother_income = docText(docs, "mother_income");

  // Jawaban pertanyaan custom — semua kunci cf_* (termasuk milik pertanyaan
  // yang kini non-aktif) ikut dihidrasi agar tersimpan kembali saat merge.
  const custom: Record<string, string> = {};
  for (const [key, value] of Object.entries(docs)) {
    if (key.startsWith("cf_") && typeof value === "string" && value.trim()) {
      custom[key] = value;
    }
  }

  // Path/URL berkas tersimpan — dipakai label "sudah ada"; diganti hanya bila
  // admin memilih berkas baru (keep-or-replace).
  const docPaths: SpmbDocumentPaths = {
    kk: docText(docs, "kk") || null,
    akta: docText(docs, "akta") || null,
    surat_sekolah: docText(docs, "surat_sekolah") || null,
    ktp_ortu: docText(docs, "ktp_ortu") || null,
    bukti_transfer: docText(docs, "bukti_transfer") || null,
  };

  return { data, custom, docPaths };
}

/**
 * Gabungkan documents lama + baru untuk mode EDIT:
 * - kunci data bawaan & berkas baru MENIMPA nilai lama;
 * - kunci asing (cf_* pertanyaan non-aktif, input_source, dll.) DIPERTAHANKAN;
 * - path berkas lama dipertahankan bila tidak ada pengganti (keep-or-replace) —
 *   makanya documents baru untuk edit TIDAK boleh memuat kunci berkas bernilai
 *   null (pemanggil hanya menyertakan kunci yang benar-benar diganti).
 */
export function mergeSpmbDocuments(
  oldDocs: Record<string, string | null> | null | undefined,
  newDocs: Record<string, string | null>
): Record<string, string | null> {
  return { ...(oldDocs ?? {}), ...newDocs };
}
