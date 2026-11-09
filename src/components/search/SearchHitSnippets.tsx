import { sanitizeHtml } from "@/lib/sanitize";
import type { Ranked, Session } from "@/lib/types";

export function SearchHitSnippets({ row }: { row: Ranked<Session> }) {
  const html = (row.highlightHtml ?? []).filter(Boolean).slice(0, 2);
  const fields = row.matchedFields?.length ? row.matchedFields.join(", ") : null;
  if (!html.length && !fields) return null;
  return (
    <div className="search-hit mt-2 space-y-1">
      {fields ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Matched fields · {fields}
        </p>
      ) : null}
      {html.map((snippet, i) => (
        <p
          key={`${row.item.id}-hl-${i}`}
          className="text-[13px] leading-snug text-foreground/90"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(snippet) }}
        />
      ))}
    </div>
  );
}
