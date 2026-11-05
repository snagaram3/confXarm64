export function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-full border border-border bg-card/95 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground shadow-sm">
      <LegendDot color="#246b45" label="Must go" />
      <LegendDot color="#9a6b16" label="Maybe" />
      <LegendDot color="#8a847a" label="Meh" />
      <LegendDot color="#cfc6b8" label="Unrated" />
      <LegendDot color="#21554c" label="Path" />
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
