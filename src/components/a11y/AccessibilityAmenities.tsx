import { amenityLabel, inclusionAmenities, STEP_FREE_MAP_NOTICE_SHORT } from "@/lib/amenities";
import { useAppState } from "@/state/app-state";

export function AccessibilityAmenities() {
  const { profile } = useAppState();
  const needs = profile.accessibilityNeeds;

  if (needs.length === 0) return null;

  const amenities = inclusionAmenities();
  const quietRooms = amenities.filter((a) => a.id.startsWith("quiet"));
  const firstAid = amenities.filter((a) => a.id.startsWith("first-aid"));
  const prayer = amenities.filter((a) => a.id === "prayer");
  
  const showQuiet = needs.includes("sensory");
  const showMobility = needs.includes("mobility");
  const showDeafHoh = needs.includes("deaf-hoh");
  const showAll = needs.includes("other");

  return (
    <section aria-labelledby="accessibility-amenities-heading" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="accessibility-amenities-heading" className="font-display text-lg font-semibold">
        Accessibility resources
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Official amenities from the conference inclusion/accessibility list. Based on your preferences.
      </p>

      {showDeafHoh && (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold">Captioned or ASL-interpreted sessions</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            The official session data snapshot does not include caption or ASL fields. We cannot filter sessions by
            this preference. Check the official schedule at events.linuxfoundation.org for accessibility accommodations.
          </p>
        </div>
      )}

      {showMobility && (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3">
          <p className="text-sm font-semibold">Accessible navigation</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {STEP_FREE_MAP_NOTICE_SHORT} Event staff at registration or an info desk can provide elevator locations and
            onsite assistance.
          </p>
        </div>
      )}

      {(showQuiet || showAll) && quietRooms.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">Quiet rooms</p>
          <ul className="mt-2 flex flex-col gap-2">
            {quietRooms.map((room) => (
              <li key={room.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-semibold leading-snug">{room.name}</p>
                <p className="text-xs text-muted-foreground">{amenityLabel(room)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showAll && prayer.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">Prayer room</p>
          <ul className="mt-2 flex flex-col gap-2">
            {prayer.map((room) => (
              <li key={room.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-semibold leading-snug">{room.name}</p>
                <p className="text-xs text-muted-foreground">{amenityLabel(room)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(showMobility || showAll) && firstAid.length > 0 && (
        <div className="mt-3">
          <p className="text-sm font-semibold">First aid</p>
          <ul className="mt-2 flex flex-col gap-2">
            {firstAid.map((room) => (
              <li key={room.id} className="rounded-xl border border-border px-3 py-2 text-sm">
                <p className="font-semibold leading-snug">{room.name}</p>
                <p className="text-xs text-muted-foreground">{amenityLabel(room)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        For more assistance, visit the registration desk or ask event staff at any information desk.
      </p>
    </section>
  );
}
