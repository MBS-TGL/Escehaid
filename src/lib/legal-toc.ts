/**
 * Daftar isi untuk naskah legal admin (HTML) — murni operasi string, aman di
 * Server Component / RSC (tanpa DOM, tanpa global browser).
 *
 * Cara pakai: `prepareLegalBody(html)` → `{ html, items }`.
 *   - `items` = judul tiap `<h2>` untuk `<LegalToc>` (scroll-spy + dropdown).
 *   - `html`  = HTML yang sama dengan `id="slug-judul"` disisipkan ke tiap
 *     `<h2>` yang belum punya id, supaya anchor ToC bisa melompat dan
 *     scroll-spy (`document.getElementById`) menemukan sasarannya.
 *   - Bila tidak ada `<h2>` sama sekali → `items` kosong; pemanggil sebaiknya
 *     fallback ke artikel tunggal (tanpa aside kosong).
 */

export type LegalTocItem = { id: string; title: string };

/** Tag pembuka <h2 ...>, sadar-quote (nilai atribut boleh mengandung `>`). */
const H2_OPEN_RE = /<h2\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;

/** Teks di dalam tag → teks polos (strip tag dalam + entitas umum). */
function innerText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Data yang kami kumpulkan!" → "data-yang-kami-kumpulkan". */
function slugify(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "bagian";
}

export function prepareLegalBody(html: string): { html: string; items: LegalTocItem[] } {
  const items: LegalTocItem[] = [];
  const used = new Map<string, number>();

  const out = html.replace(H2_OPEN_RE, (openTag, offset: number) => {
    // Judul = teks sampai </h2> pertama setelah tag pembuka ini.
    const rest = html.slice(offset + openTag.length);
    const closeIdx = rest.search(/<\/h2\s*>/i);
    if (closeIdx < 0) return openTag;
    const title = innerText(rest.slice(0, closeIdx));
    if (!title) return openTag;

    // Hormati id yang sudah ada (mis. body tempelan manual ber-id).
    const existing = openTag.match(/\sid\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/i);
    if (existing) {
      const id = existing[1].replace(/^["']|["']$/g, "");
      items.push({ id, title });
      return openTag;
    }

    const base = slugify(title);
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    const id = n === 0 ? base : `${base}-${n + 1}`;
    items.push({ id, title });
    return openTag.replace(/<h2\b/i, `<h2 id="${id}"`);
  });

  return { html: out, items };
}
