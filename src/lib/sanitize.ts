import DOMPurify from "isomorphic-dompurify";

export function sanitize(html: string): string {
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
