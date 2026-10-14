import { StatCard, StatCardRow } from "@/components/ui";

type StatVariant = "brand" | "success" | "warning" | "danger" | "info" | "purple";

export type AdminStat = {
  label: string;
  value: number | string;
  variant?: StatVariant;
};

/**
 * Blok statistik halaman admin — TEMPLATE TUNGGAL (semua halaman memakai ini;
 * pengecualian: Portal karena kartu desktop-nya sekaligus tombol filter, dan
 * Dashboard karena kartu = konten utama, bukan ringkasan):
 *
 *   desktop (≥md) — kartu `StatCardRow` (carousel di <sm, grid ≥sm);
 *   mobile  (<md) — ringkasan SATU baris teks 12px `#64748b` (docs/PROMPT_REDESIGN
 *     poin 5: hemat layar; angka metrik unik — Bulan Ini, Kategori, dst. —
 *     ikut tampil sebagai segmen teks, jadi tidak ada informasi yang hilang).
 *
 * `summary` opsional — teks mobile kustom (mis. "5 Fasilitas · 5 Aktif · 0
 * Nonaktif", angka pertama memakai nama objek, bukan "Total"); bila kosong,
 * teks dibangun otomatis dari `stats` ("{value} {label}" dipisah " · ").
 * Jangan menulis blok `hidden md:block` + `<p>` manual lagi di halaman baru.
 */
export function StatsSection({
  stats,
  summary,
}: {
  stats: AdminStat[];
  summary?: string;
}) {
  const text = summary ?? stats.map((s) => `${s.value} ${s.label}`).join(" · ");

  return (
    <>
      <div className="hidden md:block">
        <StatCardRow>
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} variant={s.variant} />
          ))}
        </StatCardRow>
      </div>
      <p className="mb-4 text-xs font-medium text-[#64748b] md:hidden">{text}</p>
    </>
  );
}
