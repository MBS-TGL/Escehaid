import { supabase } from "../supabase";
import { purgeNews } from "./news";
import { purgeArticle } from "./articles";
import { purgeGallery } from "./gallery";
import { purgeDownload } from "./downloads";
import { purgeActivity } from "./activities";
import { purgeAchievement } from "./achievements";

/**
 * Sampah (Recycle Bin) terpusat — membaca baris yang di-soft-delete
 * (`deleted_at` terisi) lintas 8 modul konten, menyediakan pulihkan &
 * hapus permanen. Nama tabel SELALU divalidasi terhadap registry di bawah
 * (tidak pernah diambil mentah dari input).
 */

export interface TrashEntry {
  id: string;
  /** Nama tabel sumber — hanya nilai dari TRASH_TABLES. */
  table: string;
  label: string;
  title: string;
  deletedAt: string;
}

interface TrashTableDef {
  table: string;
  label: string;
  titleColumn: string;
  /** Kolom judul fallback bila kolom utama kosong. */
  fallbackTitle: string;
}

const TRASH_TABLES: TrashTableDef[] = [
  { table: "news", label: "Berita", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "articles", label: "Artikel", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "faqs", label: "FAQ", titleColumn: "question", fallbackTitle: "Tanpa pertanyaan" },
  { table: "achievements", label: "Prestasi", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "activities", label: "Kegiatan", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "gallery", label: "Galeri", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "downloads", label: "Unduhan", titleColumn: "title", fallbackTitle: "Tanpa judul" },
  { table: "announcements", label: "Pengumuman", titleColumn: "text", fallbackTitle: "Tanpa teks" },
];

/** Hapus permanen — delegasi ke purgeX modul agar pembersihan media
 *  (gambar/berkas) ikut jalan. Announcements tidak punya media. */
const PURGERS: Record<string, (id: string) => Promise<{ error?: string }>> = {
  news: (id) => purgeNews(id),
  articles: (id) => purgeArticle(id),
  gallery: (id) => purgeGallery(id),
  downloads: (id) => purgeDownload(id),
  activities: (id) => purgeActivity(id),
  achievements: (id) => purgeAchievement(id),
};

function tableDef(table: string): TrashTableDef | null {
  return TRASH_TABLES.find((t) => t.table === table) ?? null;
}

/** Gabungan item terhapus semua modul — terbaru dulu. Gagal satu tabel
 *  (kolom belum dimigrasi dsb.) ditelan agar halaman tetap terbuka. */
export async function getTrashItems(): Promise<TrashEntry[]> {
  const results = await Promise.all(
    TRASH_TABLES.map(async (def): Promise<TrashEntry[]> => {
      try {
        // select string runtime → PostgREST tak bisa infer → cast manual
        // (pola sama dengan getter berita/artikel).
        const { data, error } = (await supabase
          .from(def.table)
          .select(`id, ${def.titleColumn}, deleted_at`)
          .not("deleted_at", "is", null)
          .order("deleted_at", { ascending: false })
          .limit(200)) as unknown as {
          data: ({ id: string; deleted_at: string | null } & Record<string, unknown>)[] | null;
          error: { message?: string } | null;
        };
        if (error) return [];
        return (data || []).map((row) => ({
          id: row.id,
          table: def.table,
          label: def.label,
          title: (String(row[def.titleColumn] ?? "") || def.fallbackTitle).slice(0, 160),
          deletedAt: row.deleted_at ?? "",
        }));
      } catch {
        return [];
      }
    })
  );
  return results
    .flat()
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

/** Pulihkan item dari Sampah (deleted_at → null). */
export async function restoreItem(table: string, id: string): Promise<{ error?: string }> {
  const def = tableDef(table);
  if (!def) return { error: "Tabel tidak dikenal." };
  const { error } = await supabase.from(def.table).update({ deleted_at: null }).eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/** Hapus permanen dari DB (dan medianya, bila modul punya media). */
export async function purgeItem(table: string, id: string): Promise<{ error?: string }> {
  if (!tableDef(table)) return { error: "Tabel tidak dikenal." };
  const purger = PURGERS[table];
  if (purger) return purger(id);
  // announcements — tanpa media
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}
