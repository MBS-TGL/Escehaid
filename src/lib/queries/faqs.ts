import { supabase } from "../supabase";
import { reorderRows } from "./shared";

export type FaqScope = "home" | "spmb";

export interface Faq {
  id: string;
  scope: FaqScope;
  question: string;
  answer: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  /** Terisi bila item di-soft-delete (lihat /admin/trash). */
  deleted_at?: string | null;
}

/** Semua FAQ pada satu scope (termasuk non-aktif, kecuali yang ada di Sampah)
 *  — untuk panel admin. Throw saat error agar panel bisa membedakan "kosong"
 *  vs "gagal memuat". */
export async function getFaqs(scope: FaqScope): Promise<Faq[]> {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("scope", scope)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching faqs:", error);
    throw new Error(error.message);
  }
  return (data || []) as Faq[];
}

/** FAQ aktif untuk halaman publik. Mengembalikan `null` saat tabel kosong /
 *  belum ada / error — pemanggil menangani dengan tidak merender section FAQ. */
export async function getActiveFaqs(scope: FaqScope): Promise<{ q: string; a: string }[] | null> {
  const { data, error } = await supabase
    .from("faqs")
    .select("question, answer")
    .eq("scope", scope)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true });
  if (error || !data || data.length === 0) return null;
  return data.map((d: { question: string; answer: string }) => ({ q: d.question, a: d.answer }));
}

export async function createFaq(
  data: Pick<Faq, "scope" | "question" | "answer"> & Partial<Pick<Faq, "is_active" | "sort_order">>
): Promise<{ error?: string }> {
  const { error } = await supabase.from("faqs").insert(data);
  if (error) return { error: error.message };
  return {};
}

export async function updateFaq(
  id: string,
  data: Partial<Pick<Faq, "scope" | "question" | "answer" | "is_active" | "sort_order">>
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("faqs")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

/** Soft-delete — item pindah ke Sampah (/admin/trash), purge 30 hari via
 *  Actions. Pemanggilan lama tidak berubah. */
export async function deleteFaq(id: string): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("faqs")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteFaqBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("faqs")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);
  if (error) return { error: error.message };
  return {};
}

/** Simpan urutan baru hasil drag & drop. Pemanggil bertanggung jawab renumber
 *  1..n. Delegasi ke helper generik bersama (`reorderRows`). */
export function reorderFaqs(
  items: { id: string; sort_order: number }[]
): Promise<{ error?: string }> {
  return reorderRows("faqs", items);
}
