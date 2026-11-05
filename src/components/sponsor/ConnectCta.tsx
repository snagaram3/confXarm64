import { Button } from "@/components/ui/button";
import type { Booth } from "@/lib/types";
import { useState } from "react";

export function ConnectCta({ booth }: { booth: Booth }) {
  const [copied, setCopied] = useState(false);
  const href = `/connect/${booth.id}`;
  const shareUrl =
    typeof window === "undefined" ? href : `${window.location.origin}${href}?from=link`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">
        Must go / Maybe / Meh only saves your booth preference on this device. It does not
        share contact details or create a lead.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href={href}>Connect / share my details</a>
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(shareUrl);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Booth link copied" : "Copy booth link"}
        </Button>
      </div>
    </div>
  );
}
