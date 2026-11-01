import DOMPurify from "isomorphic-dompurify";

/**
 * Regex sadar-quote untuk satu tag <img> pada HTML yang SUDAH disanitasi
 * (nilai atribut boleh mengandung `>`, mis. `style="a>b"`).
 * Murni operasi string — tanpa hook DOM dan tanpa global browser, aman di SSR.
 */
const IMG_TAG_RE = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
/** Atribut dimensi inline yang dicabut khusus pada <img>. */
const IMG_DIM_ATTR_RE = /\s+(?:width|height|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Cabut `width`/`height`/`style` inline pada <img> agar foto raksasa dari
 * editor (mis. `width="3000"` atau `style="width:2000px"`) tidak menjebol
 * batas `prose-img:max-h-[70vh]` di RichContent. Elemen lain tak tersentuh
 * (mis. `style="text-align:center"` TipTap pada <p> tetap hidup).
 */
function stripImgDimensions(html: string): string {
  return html.replace(IMG_TAG_RE, (tag) => tag.replace(IMG_DIM_ATTR_RE, ""));
}

export function sanitize(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "a", "span", "sub", "sup",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "mark",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "figure", "figcaption",
      "hr", "div", "label", "input",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class", "id", "style", "title", "loading",
      "colspan", "rowspan", "align", "valign",
      // Task list TipTap: <ul data-type="taskList"><li data-checked="…">
      "data-type", "data-checked", "type", "checked", "disabled",
    ],
    ALLOW_DATA_ATTR: false,
  });
  return stripImgDimensions(clean);
}
