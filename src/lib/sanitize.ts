const ALLOWED = new Set(["P", "BR", "STRONG", "EM", "B", "I", "UL", "OL", "LI", "A", "SPAN"]);

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  if (typeof document !== "undefined") {
    const box = document.createElement("template");
    box.innerHTML = html;
    clean(box.content);
    return box.innerHTML;
  }
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function clean(node: Node): void {
  const children = [...node.childNodes];
  for (const child of children) {
    if (child.nodeType === 1) {
      const el = child as Element;
      if (!ALLOWED.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        continue;
      }
      for (const attr of [...el.attributes]) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "style") el.removeAttribute(attr.name);
        if (el.tagName === "A" && name === "href") {
          const href = attr.value.trim();
          if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) el.removeAttribute("href");
          else el.setAttribute("rel", "noreferrer noopener");
        } else if (name !== "href") {
          el.removeAttribute(attr.name);
        }
      }
      clean(el);
    }
  }
}

export function sanitizeHtmlServer(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?!p|br|strong|em|b|i|ul|ol|li|a|span)(\w+)[^>]*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/href\s*=\s*"(?!https?:\/\/)[^"]*"/gi, "");
}
