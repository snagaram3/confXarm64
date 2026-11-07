const SECRETISH =
  /(authorization|token|secret|password|api[_-]?key|vapid|bearer|cookie)/i;
const HEXISH = /\b[a-f0-9]{24,}\b/gi;
const JWTISH = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

export function redactText(input: string): string {
  let out = input.replace(JWTISH, "[redacted]");
  out = out.replace(HEXISH, "[redacted]");
  out = out.replace(/(Bearer)\s+\S+/gi, "$1 [redacted]");
  out = out.replace(/((?:prj|sqp|squ)_[a-z]+_[a-z]{2}_)[A-Za-z0-9]+/gi, "$1[redacted]");
  return out;
}

export function redactError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return redactText(raw).slice(0, 280);
}

export function headerNameLooksSecret(name: string): boolean {
  return SECRETISH.test(name);
}

export function hostnameOnly(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
