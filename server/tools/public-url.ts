const BLOCKED_HOSTS = new Set(["169.254.169.254", "metadata.google.internal"]);

export function publicToolUrl(
  raw: string | undefined | null,
  opts: { httpsOnly?: boolean; hostSuffix?: string } = {},
): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (opts.httpsOnly) {
    if (url.protocol !== "https:") return null;
  } else if (url.protocol !== "https:" && url.protocol !== "http:") {
    return null;
  }
  if (url.username || url.password) return null;
  if (BLOCKED_HOSTS.has(url.hostname)) return null;
  if (opts.hostSuffix && !url.hostname.endsWith(opts.hostSuffix)) return null;
  return url.origin;
}
