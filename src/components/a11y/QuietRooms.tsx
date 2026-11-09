import { amenityLabel, inclusionAmenities, STEP_FREE_MAP_NOTICE } from "@/lib/amenities";

export function QuietRooms() {
  const rooms = inclusionAmenities();
  return (
    <section aria-labelledby="quiet-rooms-heading" className="rounded-2xl border border-border bg-card p-4">
      <h2 id="quiet-rooms-heading" className="font-display text-lg font-semibold">
        Inclusion rooms (official)
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Copied from the published attend/inclusion-accessibility list. Pins are not surveyed.
        Caption or ASL session filters are not shown because those fields are not in the official
        schedule snapshot.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {rooms.map((room) => (
          <li key={room.id} className="rounded-xl border border-border px-3 py-2 text-sm">
            <p className="font-semibold leading-snug">{room.name}</p>
            <p className="text-xs text-muted-foreground">{amenityLabel(room)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {room.step_free_route_verified
                ? "Step-free route verified in source."
                : "No verified step-free route in source data."}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{STEP_FREE_MAP_NOTICE}</p>
    </section>
  );
}
