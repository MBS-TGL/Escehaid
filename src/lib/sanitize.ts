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
 * TextStyle+Color (`<span style="color:…">`), Subscript/Superscript,
 * Image (`<img src/alt/title>`, termasuk base64), Table (+ resize inline
 * `min-width` dan `colgroup`/`col`), Youtube (`<div data-youtube-video>` +
 * `<iframe>` YouTube/Vimeo saja), figure/figcaption untuk konten lama.
 * `<script>` dan iframe di luar hostAllowlist selalu dibuang.
 */

/** Warna aman: hex / rgb(a) / hsl(a) — tanpa `expression()` / `url()`. */
const COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))$/i;
/** Satuan lebar kolom tabel hasil resize: angka + px/% — tanpa expression. */
const WIDTH_RE = /^\d+(\.\d+)?(px|%)$/;

/** Host iframe yang diizinkan (video embed resmi editor). */
const IFRAME_HOSTS = [
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "player.vimeo.com",
];

const CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "a", "span", "sub", "sup",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "mark",
    "blockquote", "pre", "code",
    "table", "colgroup", "col", "thead", "tbody", "tr", "th", "td",
    "img", "figure", "figcaption",
    "hr", "div", "label", "input",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class", "title"],
    img: ["src", "alt", "title", "loading", "class"],
    p: ["style", "class"],
    h1: ["style", "class", "id"],
    h2: ["style", "class", "id"],
    h3: ["style", "class", "id"],
    h4: ["style", "class", "id"],
    h5: ["style", "class", "id"],
    h6: ["style", "class", "id"],
    div: ["style", "class", "data-youtube-video"],
    span: ["style", "class"],
    mark: ["style", "class"],
    ul: ["data-type", "class"],
    li: ["data-checked", "class"],
    input: ["type", "checked", "disabled"],
    table: ["style", "class"],
    col: ["style", "span"],
    colgroup: ["span"],
    th: ["colspan", "rowspan", "align", "valign", "style", "class"],
    td: ["colspan", "rowspan", "align", "valign", "style", "class"],
    figure: ["class"],
    figcaption: ["class"],
    blockquote: ["class"],
    pre: ["class"],
    code: ["class"],
    iframe: ["src", "title", "allow", "allowfullscreen", "frameborder"],
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
    span: { color: [COLOR_RE], "background-color": [COLOR_RE] },
    mark: { "background-color": [COLOR_RE], color: [COLOR_RE] },
    table: { "min-width": [WIDTH_RE] },
    col: { "min-width": [WIDTH_RE], width: [WIDTH_RE] },
    th: { "min-width": [WIDTH_RE], width: [WIDTH_RE], "text-align": [/^(left|right|center|justify)$/] },
    td: { "min-width": [WIDTH_RE], width: [WIDTH_RE], "text-align": [/^(left|right|center|justify)$/] },
  },
  // Editor mengizinkan gambar base64 (`Image.configure({ allowBase64: true })`).
  allowedSchemesByTag: {
    img: ["http", "https", "data"],
    iframe: ["https"],
  },
  allowedIframeHostnames: IFRAME_HOSTS,
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

/** Tag <iframe> utuh (termasuk penutupnya bila ada), sadar-quote. */
const IFRAME_TAG_RE = /<iframe\b(?:[^>"']|"[^"]*"|'[^']*')*>(?:<\/iframe>)?/gi;

/**
 * Buang <iframe> yang `src`-nya ditolak (host tak dikenal/relatif) — sanitize-html
 * hanya mencabut atributnya sehingga tersisa tag kosong. Iframe valid (punya src) lolos.
 */
function stripSrcLessIframes(html: string): string {
  return html.replace(IFRAME_TAG_RE, (tag) => (/\ssrc\s*=/i.test(tag) ? tag : ""));
}

export function sanitize(html: string): string {
  return stripImgDimensions(stripSrcLessIframes(sanitizeHtml(html, CONFIG)));
}
