import type { ReactNode } from "react";

/**
 * Kerangka halaman legal statis (kebijakan privasi / syarat & ketentuan):
 * judul + tanggal pembaruan + seksi konten. Isi disiapkan di page masing-masing;
 * gaya mengikuti tema brand (var --brand-*) seperti halaman publik lain.
 */
export default function LegalArticle({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-[760px] px-6 py-12 md:py-16">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-accent)]">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--brand-primary)] md:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Terakhir diperbarui: {updated}</p>
      </header>
      <div className="mt-8 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[var(--brand-primary)] [&_li]:mt-1 [&_p]:mt-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-slate-600 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[15px] [&_ul]:leading-relaxed [&_ul]:text-slate-600 [&_a]:font-medium [&_a]:text-[var(--brand-accent)] [&_a]:underline-offset-2 hover:[&_a]:underline">
        {children}
      </div>
    </article>
  );
}
