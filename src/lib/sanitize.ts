import DOMPurify from "isomorphic-dompurify";

/**
 * Hook sekali per proses: cabut atribut dimensi inline (`width`, `height`,
 * `style`) pada <img> agar tidak menjebol batas `prose-img:max-h-[70vh]` di
 * RichContent (mis. foto 3000px atau `style="width:2000px"` dari editor).
 * Idempoten — dipasang ulang pun hanya menghapus atribut yang sama.
 */
let imgHookInstalled = false;
function ensureImgHook() {
  if (imgHookInstalled) return;
  imgHookInstalled = true;
  DOMPurify.addHook("uponSanitizeElement", (node) => {
    // `node` realm jsdom — jangan pakai `instanceof Element` global (tak ada di SSR).
    if (node.nodeName === "IMG") {
      const el = node as unknown as { removeAttribute(attr: string): void };
      el.removeAttribute("width");
      el.removeAttribute("height");
      el.removeAttribute("style");
    }
  });
}

export function sanitize(html: string): string {
  ensureImgHook();
  return DOMPurify.sanitize(html, {
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
}
