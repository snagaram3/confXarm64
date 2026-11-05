import { useState } from "react";
import type { Booth } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SponsorLogo({
  booth,
  className,
}: {
  booth: Booth;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(booth.logo) && !failed;

  if (!showImage) {
    return <Monogram name={booth.sponsor} className={className} />;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-md",
        booth.logoOnDark ? "bg-[#0C322C] p-1" : "bg-card p-1",
        className,
      )}
    >
      <img
        src={booth.logo ?? ""}
        alt=""
        className="h-full w-full object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function Monogram({ name, className }: { name: string; className?: string }) {
  const letters = monogram(name);
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-secondary font-display text-sm font-semibold text-foreground",
        className,
      )}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}

function monogram(name: string): string {
  const parts = name.replace(/,.*/, "").split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}
