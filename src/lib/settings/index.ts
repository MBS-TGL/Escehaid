/**
 * Pembaca pengaturan situs (Phase B).
 *
 * Nilai akhir tiap kunci diresolusi berurutan:
 *   1. override admin  → tabel `site_settings`
 *   2. nilai lama      → kolom `school_profile` (bila kunci punya profileField)
 *   3. default registry → src/lib/settings/registry.ts
 *
 * Karena (3) selalu ada, situs tampil benar walau tabel `site_settings` belum
 * dibuat / kosong — tidak ada layar yang pecah setelah deploy kode sebelum
 * migrasi dijalankan.
 *
 * Hasil dibaca lewat `unstable_cache` dengan tag "site-settings"; disimpan di
 * server action memanggil revalidateTag(tag) sehingga perubahan langsung
 * terlihat tanpa tunggu masa berlaku cache.
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { SchoolProfile } from "@/lib/supabase";
import { getSchoolProfile } from "@/lib/queries/profile";
import { SETTING_FIELDS, SETTING_FIELD_MAP, defaultFor } from "./registry";
import { normalizeHex } from "./contrast";
import { DEFAULT_THEME } from "./theme";

/** Tag cache Next.js untuk seluruh pembacaan pengaturan situs. */
export const SITE_SETTINGS_TAG = "site-settings";

export type SettingSource = "override" | "profile" | "default";

export interface SiteSettings {
  /** Nilai efektif per kunci (hasil resolusi). */
  values: Record<string, string>;
  /** Asal nilai per kunci — dipakai UI untuk menampilkan status "diubah". */
  sources: Record<string, SettingSource>;
  /** Hanya override yang benar-benar tersimpan di database. */
  overrides: Record<string, string>;
  /** Tema ternormalisasi (#rrggbb); selalu valid meski ada input rusak. */
  theme: { primary: string; accent: string; highlight: string };
}

/**
 * Fungsi murni — dipisah dari akses database supaya bisa diuji unit test.
 */
export function resolveSettings(
  overrides: Record<string, string>,
  profile: SchoolProfile | null
): { values: Record<string, string>; sources: Record<string, SettingSource> } {
  const values: Record<string, string> = {};
  const sources: Record<string, SettingSource> = {};

  for (const field of SETTING_FIELDS) {
    const override = overrides[field.key];
    if (override !== undefined && override.trim() !== "") {
      values[field.key] = override;
      sources[field.key] = "override";
      continue;
    }

    const fromProfile = field.profileField ? profile?.[field.profileField] : null;
    const rawProfileValue =
      typeof fromProfile === "string" ? fromProfile.trim() : fromProfile == null ? "" : String(fromProfile);
    const profileValue = field.profileTransform ? field.profileTransform(rawProfileValue) : rawProfileValue;

    if (profileValue !== "") {
      values[field.key] = profileValue;
      sources[field.key] = "profile";
      continue;
    }

    values[field.key] = field.default;
    sources[field.key] = "default";
  }

  return { values, sources };
}

/**
 * Baca override dari database. Dibungkus `unstable_cache` dengan tag
 * SITE_SETTINGS_TAG. Degradasi anggun: bila tabel belum dimigrasi, kembalikan
 * objek kosong sehingga seluruh nilai jatuh ke school_profile/default.
 */
const readOverrides = unstable_cache(
  async function readOverrides(): Promise<Record<string, string>> {
    const { data, error } = await supabase.from("site_settings").select("key, value");

    if (error) {
      // Tabel belum dibuat (migrasi belum dijalankan) adalah kondisi normal.
      console.warn("site_settings belum dapat dibaca:", error.message);
      return {};
    }

    const overrides: Record<string, string> = {};
    for (const row of (data ?? []) as { key: string; value: unknown }[]) {
      const value = row.value;
      if (typeof value === "string") overrides[row.key] = value;
      else if (typeof value === "number" || typeof value === "boolean") {
        overrides[row.key] = String(value);
      }
    }
    return overrides;
  },
  ["site-settings-overrides"],
  { tags: [SITE_SETTINGS_TAG] }
);

/**
 * Seluruh pengaturan situs yang ter-resolve. Di-`cache` per request React
 * sehingga layout, header, footer, dan metadata berbagi satu pembacaan.
 */
export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  // getSchoolProfile sudah dibungkus React `cache` — satu query profil per
  // request dipakai bersama oleh RootLayout, halaman, dan pembaca ini.
  const [overrides, profile] = await Promise.all([readOverrides(), getSchoolProfile()]);

  const { values, sources } = resolveSettings(overrides, profile);

  // Tema: normalisasi & jatuh ke default bila rusak, agar CSS variable selalu
  // berisi heksadesimal valid (site_settings bisa saja diedit langsung di DB).
  const primary = normalizeHex(values.theme_primary) ?? DEFAULT_THEME.primary;
  const accent = normalizeHex(values.theme_accent) ?? DEFAULT_THEME.accent;
  const highlight = normalizeHex(values.theme_highlight) ?? DEFAULT_THEME.highlight;

  return { values, sources, overrides, theme: { primary, accent, highlight } };
});

/** Nilai efektif satu kunci (dengan default sebagai jaring pengaman). */
export function pickValue(settings: SiteSettings, key: string): string {
  return settings.values[key] ?? defaultFor(key);
}

/**
 * Bentuk ringkas yang dikirim ke komponen klien (Navbar/Footer/PublicShell).
 * Hanya berisi nilai tampil — bukan sumber/asal — agar tidak membawa data
 * internal ke klien.
 */
export interface PublicBrand {
  name: string;
  shortName: string;
  city: string;
  tagline: string;
  logo: string;
  /**
   * Alamat lengkap. Sengaja TIDAK digabung dengan kecamatan/kabupaten/kode
   * pos: `school_profile.address` sudah memuat alamat selengkapnya (jalan,
   * RT/RW, kecamatan, kabupaten, kode pos) sehingga menggabungkan keduanya
   * menghasilkan alamat bertumpuk.
   */
  address: string;
  /** Alamat kampus putri (opsional); kosong → Footer menyembunyikan baris ini. */
  addressPutri: string;
  email: string;
  phone: string;
  /** Kosong → Footer memakai nomor WhatsApp panitia SPMB dari profil sekolah. */
  whatsapp: string;
  social: { instagram: string; youtube: string; facebook: string; tiktok: string; x: string };
  copyright: string;
  /** Nilai akreditasi sekolah; kosong → Footer menyembunyikan badge. */
  accreditation: string;
  /** NPSN sekolah; kosong → Footer menyembunyikan badge. */
  npsn: string;
}

/** Fungsi murni — dipisah dari akses database supaya bisa diuji unit test. */
export function toPublicBrand(settings: SiteSettings): PublicBrand {
  const v = settings.values;

  return {
    name: v.site_name,
    shortName: v.site_short_name,
    city: v.site_city,
    tagline: v.site_tagline,
    logo: v.site_logo_url,
    address: v.contact_address.trim(),
    addressPutri: v.contact_address_putri.trim(),
    email: v.contact_email,
    phone: v.contact_phone,
    whatsapp: v.contact_whatsapp,
    social: {
      instagram: v.social_instagram,
      youtube: v.social_youtube,
      facebook: v.social_facebook,
      tiktok: v.social_tiktok,
      x: v.social_x,
    },
    copyright: v.footer_copyright,
    accreditation: v.site_accreditation.trim(),
    npsn: v.site_npsn.trim(),
  };
}

/** Definisi kunci — diekspor ulang agar konsumen tidak impor dua jalur. */
export { SETTING_FIELD_MAP };
