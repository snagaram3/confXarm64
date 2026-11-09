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
    <div role="tablist" aria-label="Schematic level" className="fg-seg max-w-full">
      {SHEETS.map((sheet) => (
        <button
          key={sheet.id}
          type="button"
          role="tab"
          aria-selected={value === sheet.id}
          onClick={() => onChange(sheet.id)}
          className={cn(
            "shrink-0 px-2.5 text-[11px] sm:px-3 sm:text-xs",
            value === sheet.id && "is-on",
          )}
        >
          {sheet.id === "salt-l1" ? "SP L1" : sheet.id === "salt-l2" ? "SP L2" : "Hyatt"}
        </button>
      ))}
    </div>
  );
}
