import type { Metadata } from "next";
import { getSiteSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";
import { Gear } from "@/components/Icons";

export const metadata: Metadata = {
  // Template root layout menambahkan "| Nama Sekolah" otomatis.
  title: "Konfigurasi Situs",
};

/**
 * Halaman Konfigurasi Situs (dulu "Pengaturan Situs" — diganti supaya tidak
 * tertukar dengan "Pengaturan Akun" di dropdown Topbar).
 *
 * Server component: nilai awal dibaca lewat `getSiteSettings()` (ter-cache per
 * request + tag "site-settings"), sehingga tidak ada kilatan nilai lama dan
 * tidak ada query ganda saat layout + halaman sama-sama butuh pengaturan.
 *
 * Akses dikunci dua lapis: proxy meneruskan rute ini ke izin
 * `settings:manage`, dan seluruh aksi tulis memanggil `requirePermission`.
 */
export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-primary)]/10">
          <Gear className="h-5 w-5 text-[var(--brand-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">Konfigurasi Situs</h1>
          <p className="text-sm text-slate-500">
            Identitas, kontak, media sosial, SEO, footer, dan tema warna situs publik
          </p>
        </div>
      </div>

      <SettingsForm initial={settings} />
    </div>
  );
}
