export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/90 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-lg backdrop-blur">
      <LegendDot color="var(--must)" label="Must go" />
      <LegendDot color="var(--maybe)" label="Maybe" />
      <LegendDot color="var(--meh)" label="Meh" />
      <LegendDot color="var(--path)" label="Path" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
