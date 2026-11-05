import type { CrowdTake as CrowdTakeType } from "@/lib/types";

export function CrowdTake({ take }: { take: CrowdTakeType }) {
  return (
    <article className="flex gap-3 rounded-2xl border border-border bg-card p-3">
      <img
        src={take.photo}
        alt=""
        className="size-12 shrink-0 rounded-xl object-cover ring-1 ring-border"
      />
      <div className="min-w-0">
        <p className="text-sm leading-snug text-foreground">“{take.take}”</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {take.author} · {take.role} · seeded {relative(take.minutesAgo)}
        </p>
      </div>
    </article>
  );
}

function relative(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
