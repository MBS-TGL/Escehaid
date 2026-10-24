import { supabase } from "../supabase";

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
}

/** Semua FAQ pada satu scope (termasuk non-aktif) — untuk panel admin.
 *  Throw saat error agar panel bisa membedakan "kosong" vs "gagal memuat". */
export async function getFaqs(scope: FaqScope): Promise<Faq[]> {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("scope", scope)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Error fetching faqs:", error);
    throw new Error(error.message);
  }
  return (data || []) as Faq[];
}

/** FAQ aktif untuk halaman publik. Mengembalikan `null` saat tabel belum ada
 *  / error supaya pemanggil jatuh ke fallback statis (`faq-data.ts`). */
export async function getActiveFaqs(scope: FaqScope): Promise<{ q: string; a: string }[] | null> {
  const { data, error } = await supabase
    .from("faqs")
    .select("question, answer")
    .eq("scope", scope)
    .eq("is_active", true)
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

export async function deleteFaq(id: string): Promise<{ error?: string }> {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return { error: error.message };
  return {};
}

export async function deleteFaqBulk(ids: string[]): Promise<{ error?: string }> {
  const { error } = await supabase.from("faqs").delete().in("id", ids);
  if (error) return { error: error.message };
  return {};
}
