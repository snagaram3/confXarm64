import { SHEETS, type SchematicSheetId } from "@/lib/venue-schematic";
import { cn } from "@/lib/utils";

export function SchematicSheetSwitcher({
  value,
  onChange,
}: {
  value: SchematicSheetId;
  onChange: (next: SchematicSheetId) => void;
}) {
  return (
    <div role="tablist" aria-label="Schematic level" className="inline-flex max-w-full overflow-x-auto rounded-full border border-border bg-card/95 p-1 shadow-sm">
      {SHEETS.map((sheet) => (
        <button
          key={sheet.id}
          type="button"
          role="tab"
          aria-selected={value === sheet.id}
          onClick={() => onChange(sheet.id)}
          className={cn(
            "min-h-10 shrink-0 rounded-full px-2.5 text-[11px] font-semibold sm:min-h-11 sm:px-3 sm:text-xs",
            value === sheet.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          {sheet.id === "salt-l1" ? "SP L1" : sheet.id === "salt-l2" ? "SP L2" : "Hyatt"}
        </button>
      ))}
    </div>
  );
}
