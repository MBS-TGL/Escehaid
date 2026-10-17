/**
 * REGISTRI PENGATURAN SITUS — sumber tunggal skema, label, grup, tipe,
 * validasi, dan nilai default setiap kunci.
 *
 * Kenapa registry di kode, bukan di tabel?
 *   Situs harus tampil benar walau tabel `site_settings` kosong (belum
 *   dimigrasi / belum pernah disimpan). Nilai akhir tiap kunci diresolusi
 *   berurutan:  override (site_settings) → school_profile → default (di sini).
 *
 * Menambah kunci baru = tambah di sini + (opsional) satu baris di UI.
 * Tidak perlu migrasi SQL, karena tabel hanya menyimpan override.
 */
import type { SchoolProfile } from "@/lib/supabase";
import { normalizeHex } from "./contrast";

/** Tipe nilai yang dikenal form admin. */
export type SettingType = "text" | "textarea" | "url" | "email" | "image" | "color";

/** Enam grup tampil sebagai tab di /admin/settings. */
export type SettingGroup = "identitas" | "kontak" | "media_sosial" | "seo" | "footer" | "tema";

export interface SettingField {
  /** Kunci snake_case; = primary key di tabel site_settings. */
  key: string;
  group: SettingGroup;
  type: SettingType;
  label: string;
  help?: string;
  placeholder?: string;
  default: string;
  maxLength?: number;
  /**
   * Kolom school_profile yang dipakai sebagai nilai dasar bila tidak ada
   * override. Menjaga satu sumber kebenaran: nama/alamat/logo tetap hidup di
   * school_profile, settings hanya menambah lapisan "dapat diedit admin".
   */
  profileField?: keyof SchoolProfile;
  /** Validasi khusus; kembalikan pesan error (Bahasa Indonesia) atau null. */
  validate?: (value: string) => string | null;
}

export const SETTING_GROUPS: SettingGroup[] = [
  "identitas",
  "kontak",
  "media_sosial",
  "seo",
  "footer",
  "tema",
];

export const SETTING_GROUP_META: Record<
  SettingGroup,
  { label: string; description: string }
> = {
  identitas: {
    label: "Identitas",
    description: "Nama situs, logo, dan alamat situs yang tampil di header, footer, serta metadata.",
  },
  kontak: {
    label: "Kontak",
    description: "Telepon, surel, dan alamat yang ditampilkan di halaman kontak, footer, dan schema.org.",
  },
  media_sosial: {
    label: "Media Sosial",
    description: "Tautan akun resmi sekolah. Tautan kosong otomatis disembunyikan dari footer.",
  },
  seo: {
    label: "SEO",
    description: "Deskripsi meta, kata kunci, dan gambar tautan sosial (Open Graph).",
  },
  footer: {
    label: "Footer",
    description: "Teks kaki halaman yang tampil di seluruh halaman publik.",
  },
  tema: {
    label: "Tema",
    description: "Warna merek situs. Diterapkan lewat variabel CSS — pratinjau langsung terlihat sebelum disimpan.",
  },
};

const URL_LIKE = /^(https?:\/\/|\/|mailto:|tel:)/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateUrl = (v: string): string | null =>
  URL_LIKE.test(v) ? null : "Harus berupa URL (https://…) atau path mulai “/”.";

const validateImage = (v: string): string | null =>
  URL_LIKE.test(v) ? null : "Harus berupa URL gambar atau path mulai “/”.";

const validateEmail = (v: string): string | null =>
  EMAIL_RE.test(v) ? null : "Format surel tidak valid.";

const validateColor = (v: string): string | null =>
  normalizeHex(v) ? null : "Warna harus berupa heksadesimal, mis. #082b59.";

/**
 * Seluruh kunci pengaturan. Urutan menentukan urutan tampil di tiap tab.
 * Nilai `default` = nilai yang berlaku saat tidak ada override & tidak ada
 * nilai di school_profile (situs tetap utuh pada database kosong).
 */
export const SETTING_FIELDS: SettingField[] = [
  // ── Identitas ───────────────────────────────────────────────────────────
  {
    key: "site_name",
    group: "identitas",
    type: "text",
    label: "Nama situs",
    help: "Dipakai sebagai judul halaman (title) dan nama pada schema.org.",
    default: "SMP Muhammadiyah 4 Tanggul",
    profileField: "school_name",
    maxLength: 120,
  },
  {
    key: "site_short_name",
    group: "identitas",
    type: "text",
    label: "Nama pendek",
    help: "Tampil di baris pertama logo pada header dan footer.",
    default: "SMP Muhammadiyah 4",
    maxLength: 60,
  },
  {
    key: "site_city",
    group: "identitas",
    type: "text",
    label: "Lokasi singkat",
    help: "Tampil di bawah nama pendek pada header dan footer.",
    default: "Tanggul",
    maxLength: 60,
  },
  {
    key: "site_tagline",
    group: "identitas",
    type: "text",
    label: "Tagline",
    help: "Slogan sekolah yang tampil di footer.",
    default: "School of Talents",
    maxLength: 120,
  },
  {
    key: "site_logo_url",
    group: "identitas",
    type: "image",
    label: "Logo sekolah",
    help: "Pilih dari Pustaka Media atau tempel URL gambar. Rasio disarankan 1:1.4.",
    default: "/images/Logo-Sekolah.png",
    profileField: "logo_url",
    validate: validateImage,
  },
  {
    key: "site_url",
    group: "identitas",
    type: "url",
    label: "URL situs",
    help: "Dipakai untuk metadataBase, Open Graph, dan JSON-LD.",
    default: "https://www.smpmuh4tanggul.sch.id",
    profileField: "website",
    validate: validateUrl,
  },

  // ── Kontak ──────────────────────────────────────────────────────────────
  {
    key: "contact_phone",
    group: "kontak",
    type: "text",
    label: "Nomor telepon",
    help: "Tampil di halaman kontak dan JSON-LD. Format apa pun diperbolehkan.",
    default: "+6285806738160",
    profileField: "phone",
    maxLength: 40,
  },
  {
    key: "contact_email",
    group: "kontak",
    type: "email",
    label: "Alamat surel",
    default: "smpm4tangguljember@gmail.com",
    profileField: "email",
    validate: validateEmail,
    maxLength: 120,
  },
  {
    key: "contact_address",
    group: "kontak",
    type: "text",
    label: "Alamat jalan",
    default: "Jl. Pemandian No. 88, Patemon",
    profileField: "address",
    maxLength: 160,
  },
  {
    key: "contact_address_putri",
    group: "kontak",
    type: "text",
    label: "Alamat kampus putri (opsional)",
    help: "Alamat Asrama Tahfidz Al-Qur'an (Bambu Kuning). Tampil di footer beserta tautan peta.",
    default: "Jl. Teratai, Tekoan, Tanggul Kulon, Kec. Tanggul, Kabupaten Jember, Jawa Timur 68155",
    maxLength: 200,
  },
  {
    key: "contact_city",
    group: "kontak",
    type: "text",
    label: "Kecamatan",
    default: "Tanggul",
    maxLength: 60,
  },
  {
    key: "contact_region",
    group: "kontak",
    type: "text",
    label: "Kabupaten",
    default: "Jember",
    maxLength: 60,
  },
  {
    key: "contact_postal_code",
    group: "kontak",
    type: "text",
    label: "Kode pos",
    default: "68155",
    maxLength: 10,
  },
  {
    key: "contact_whatsapp",
    group: "kontak",
    type: "text",
    label: "WhatsApp (opsional)",
    help: "Kosongkan untuk memakai nomor WhatsApp panitia SPMB dari profil sekolah.",
    default: "",
    maxLength: 40,
  },

  // ── Media sosial ────────────────────────────────────────────────────────
  {
    key: "social_instagram",
    group: "media_sosial",
    type: "url",
    label: "Instagram",
    placeholder: "https://www.instagram.com/username",
    default: "https://www.instagram.com/mbstanggul",
    validate: validateUrl,
    maxLength: 300,
  },
  {
    key: "social_youtube",
    group: "media_sosial",
    type: "url",
    label: "YouTube",
    placeholder: "https://www.youtube.com/@channel",
    default: "https://www.youtube.com/@mbstanggul",
    validate: validateUrl,
    maxLength: 300,
  },
  {
    key: "social_facebook",
    group: "media_sosial",
    type: "url",
    label: "Facebook",
    placeholder: "https://www.facebook.com/page",
    default: "https://www.facebook.com/mbstanggul",
    validate: validateUrl,
    maxLength: 300,
  },
  {
    key: "social_tiktok",
    group: "media_sosial",
    type: "url",
    label: "TikTok (opsional)",
    placeholder: "https://www.tiktok.com/@username",
    default: "",
    validate: validateUrl,
    maxLength: 300,
  },
  {
    key: "social_x",
    group: "media_sosial",
    type: "url",
    label: "X / Twitter (opsional)",
    placeholder: "https://x.com/username",
    default: "",
    validate: validateUrl,
    maxLength: 300,
  },

  // ── SEO ─────────────────────────────────────────────────────────────────
  {
    key: "seo_description",
    group: "seo",
    type: "textarea",
    label: "Deskripsi meta",
    help: "Tampil di hasil pencarian & ketika tautan dibagikan. Disarankan 120–160 karakter.",
    default:
      "SMP Muhammadiyah 4 Tanggul - Sekolah unggulan dengan program Tahfidz, keberbakatan, dan kepesantrenan. Daftar SPMB online di sini.",
    maxLength: 300,
  },
  {
    key: "seo_keywords",
    group: "seo",
    type: "text",
    label: "Kata kunci",
    help: "Pisahkan dengan koma.",
    default: "SMP Muhammadiyah 4 Tanggul, SPMB online, tahfidz, sekolah muhammadiyah Jember",
    maxLength: 300,
  },
  {
    key: "seo_og_image",
    group: "seo",
    type: "image",
    label: "Gambar tautan sosial",
    help: "Tampil saat tautan situs dibagikan. Rasio disarankan 1200×630.",
    default: "/og-image.jpg",
    validate: validateImage,
    maxLength: 300,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  {
    key: "footer_copyright",
    group: "footer",
    type: "text",
    label: "Teks hak cipta",
    help: "Tampil setelah “© <tahun> <nama situs>”.",
    default: "Hak cipta dilindungi.",
    maxLength: 120,
  },

  // ── Tema ────────────────────────────────────────────────────────────────
  {
    key: "theme_primary",
    group: "tema",
    type: "color",
    label: "Warna utama",
    help: "Dipakai untuk header, footer, tombol utama, dan tautan aktif.",
    default: "#082b59",
    validate: validateColor,
  },
  {
    key: "theme_accent",
    group: "tema",
    type: "color",
    label: "Warna aksen",
    help: "Dipakai untuk sorotan, fokus, dan ikon pendukung.",
    default: "#1767b1",
    validate: validateColor,
  },
];

/** Peta kunci → definisinya (lookup cepat). */
export const SETTING_FIELD_MAP: Record<string, SettingField> = Object.fromEntries(
  SETTING_FIELDS.map((f) => [f.key, f])
);

/** Semua kunci dalam satu grup, sesuai urutan di registry. */
export function fieldsForGroup(group: SettingGroup): SettingField[] {
  return SETTING_FIELDS.filter((f) => f.group === group);
}

/** Default satu kunci. */
export function defaultFor(key: string): string {
  return SETTING_FIELD_MAP[key]?.default ?? "";
}

/**
 * Validasi satu nilai terhadap definisinya.
 * @returns pesan error Bahasa Indonesia, atau null bila valid.
 */
export function validateSettingValue(field: SettingField, rawValue: string): string | null {
  const value = rawValue.trim();

  if (value === "") return null; // boleh kosong → dianggap "pakai default/fallback"

  if (field.maxLength && value.length > field.maxLength) {
    return `Maksimal ${field.maxLength} karakter.`;
  }

  return field.validate ? field.validate(value) : null;
}
