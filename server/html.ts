export function sanitizeHtmlServer(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?!p|br|strong|em|b|i|ul|ol|li|a|span)(\w+)[^>]*>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/href\s*=\s*"(?!https?:\/\/)[^"]*"/gi, "");
}

export function trustedPhoto(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "cdn.sessionize.com" ||
      host.endsWith(".sessionize.com") ||
      host.endsWith(".linuxfoundation.org")
    ) {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}
