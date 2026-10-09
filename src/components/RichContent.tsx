import { sanitize } from "@/lib/sanitize";

/**
 * Wrapper konten rich-text SATU untuk: detail Berita, detail Kegiatan,
 * dan modal preview admin (Berita & Kegiatan) — sehingga konten tampil
 * IDENTIK di semua tempat (kelas diambil verbatim dari /news/[slug]).
 *
 * - `sanitize()` dipanggil di dalam → pemanggil cukup meneruskan konten mentah.
 * - Guard mobile: tabel jadi block + scroll horizontal, prablock & tautan
 *   panjang tidak membuat halaman melebar di layar 375px.
 */
const CONTENT_CLASSES = `
  prose prose-lg prose-slate max-w-none
  prose-headings:text-[#082b59] prose-headings:font-extrabold prose-headings:scroll-mt-24
  prose-p:text-gray-700 prose-p:leading-[1.75] prose-p:my-4
  prose-a:text-[#1767b1] prose-a:no-underline prose-a:font-medium hover:prose-a:underline [&_a]:break-words
  prose-strong:text-[#082b59] prose-strong:font-bold
  prose-em:text-slate-600
  prose-img:rounded-2xl prose-img:shadow-md prose-img:my-8 prose-img:max-w-full prose-img:h-auto
  prose-blockquote:border-l-4 prose-blockquote:border-[#f4d21f] prose-blockquote:bg-gradient-to-r prose-blockquote:from-amber-50 prose-blockquote:to-transparent prose-blockquote:py-4 prose-blockquote:pr-6 prose-blockquote:pl-6 prose-blockquote:rounded-r-xl prose-blockquote:italic prose-blockquote:text-slate-600
  prose-li:text-gray-700 prose-li:leading-[1.7] prose-li:my-1 [&_li>p]:my-0
  prose-ol:my-4 prose-ol:pl-6 prose-ul:my-4 prose-ul:pl-6
  prose-code:text-[#1767b1] prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-normal prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-[#082b59] prose-pre:text-white prose-pre:rounded-xl prose-pre:border prose-pre:border-slate-700 prose-pre:overflow-x-auto
  prose-hr:border-slate-200 prose-hr:my-12
  prose-table:text-sm prose-table:border-collapse prose-table:block prose-table:max-w-full prose-table:overflow-x-auto
  prose-th:bg-slate-50 prose-th:text-left prose-th:font-semibold prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-slate-200
  prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-slate-200
`;

export function RichContent({
  content,
  emptyHint = "Konten belum tersedia.",
}: {
  /** HTML mentah (akan di-sanitize di sini). */
  content?: string | null;
  /** Teks bila konten kosong; null → render apa pun tidak ada. */
  emptyHint?: string | null;
}) {
  const html = (content || "").trim();
  if (!html) {
    return emptyHint ? <p className="text-gray-500">{emptyHint}</p> : null;
  }
  return (
    <div
      className={CONTENT_CLASSES}
      dangerouslySetInnerHTML={{ __html: sanitize(html) }}
    />
  );
}
