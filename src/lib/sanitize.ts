import sanitizeHtml from "sanitize-html";

/**
 * Sanitasi HTML konten editor (TipTap) TANPA DOM — murni parser string
 * (`sanitize-html` / `htmlparser2`), sehingga aman dipanggil dari Server
 * Component / RSC (`news/[slug]`, `articles/[slug]`, `activities/[slug]`,
 * preview admin, `api/ai/refine`).
 *
 * Latar: `isomorphic-dompurify` me-resolve varian browser saat di-bundle
 * webpack ke chunk RSC → `Element is not defined` di server (Next 16).
 * Modul ini tidak menyentuh global browser apa pun.
 *
 * Allowlist dipetakan dari konfigurasi DOMPurify lama + output aktual
 * editor (`RichTextEditor.tsx`): StarterKit (h2-h4, bold/italic/strike/code,
 * list, blockquote, codeBlock, hr), Underline, Link, TextAlign
 * (`style="text-align:…"` di p/heading), TaskList/TaskItem
 * (`data-type`, `data-checked`, checkbox), Highlight (`<mark>` + warna),
 * Image (`<img src/alt/title>`, termasuk base64), tabel & figure/figcaption
 * untuk konten lama. `<iframe>`/`<script>` selalu dibuang.
 */

/** Warna aman untuk highlight: hex / rgb(a) / hsl(a) — tanpa `expression()`. */
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;

const CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "a", "span", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "mark",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "img", "figure", "figcaption",
    "hr", "div", "label", "input",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "loading", "class"],
    p: ["style", "class"],
    h1: ["style", "class"],
    h2: ["style", "class"],
    h3: ["style", "class"],
    h4: ["style", "class"],
    h5: ["style", "class"],
    h6: ["style", "class"],
    div: ["style", "class"],
    span: ["class"],
    mark: ["style", "class"],
    ul: ["data-type", "class"],
    li: ["data-checked", "class"],
    input: ["type", "checked", "disabled"],
    th: ["colspan", "rowspan", "align", "valign", "class"],
    td: ["colspan", "rowspan", "align", "valign", "class"],
    figure: ["class"],
    figcaption: ["class"],
    blockquote: ["class"],
    pre: ["class"],
    code: ["class"],
  },
  allowedClasses: {
    // Kelas Tailwind arbitrer dari editor (mis. kelas link TipTap) —
    // tak dievaluasi, hanya string pasif di atribut.
    "*": ["*"],
  },
  allowedStyles: {
    p: { "text-align": [/^(left|right|center|justify)$/] },
    h1: { "text-align": [/^(left|right|center|justify)$/] },
    h2: { "text-align": [/^(left|right|center|justify)$/] },
    h3: { "text-align": [/^(left|right|center|justify)$/] },
    h4: { "text-align": [/^(left|right|center|justify)$/] },
    h5: { "text-align": [/^(left|right|center|justify)$/] },
    h6: { "text-align": [/^(left|right|center|justify)$/] },
    div: { "text-align": [/^(left|right|center|justify)$/] },
    mark: { "background-color": [COLOR_RE], color: [COLOR_RE] },
  },
  // Editor mengizinkan gambar base64 (`Image.configure({ allowBase64: true })`).
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
  },
};

/**
 * Regex sadar-quote untuk satu tag <img> pada HTML yang SUDAH disanitasi
 * (nilai atribut boleh mengandung `>`, mis. `alt="a>b"`).
 */
const IMG_TAG_RE = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
/** Atribut dimensi inline yang dicabut khusus pada <img>. */
const IMG_DIM_ATTR_RE = /\s+(?:width|height|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Cabut `width`/`height`/`style` inline pada <img> agar foto raksasa dari
 * editor (mis. `width="3000"` atau `style="width:2000px"`) tidak menjebol
 * batas `prose-img:max-h-[70vh]` di RichContent.
 */
function stripImgDimensions(html: string): string {
  return html.replace(IMG_TAG_RE, (tag) => tag.replace(IMG_DIM_ATTR_RE, ""));
}

export function sanitize(html: string): string {
  return stripImgDimensions(sanitizeHtml(html, CONFIG));
}
