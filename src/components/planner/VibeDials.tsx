import { dialWord } from "@/lib/field-guide";
import { bufferFromPacked, ensureTaste, withTaste } from "@/lib/taste";
import { useAppState } from "@/state/app-state";

export function VibeDials() {
  const { profile, setProfile, setBufferMinutes } = useAppState();
  const taste = ensureTaste(profile);
  const depth = Math.round(taste.depth * 100);
  const hall = Math.round(taste.expoShare * 100);
  const pace = Math.round(taste.packed * 100);

  const setDial = (key: "depth" | "expoShare" | "packed", value: number) => {
    const next = { ...taste, [key]: value / 100 };
    setProfile({ ...withTaste(profile, next), demoPersona: false, onboarded: true });
    if (key === "packed") setBufferMinutes(bufferFromPacked(value / 100));
  };

  return (
    <div className="fg-dials" role="group" aria-label="Vibe dials">
      <Dial
        id="dDepth"
        label="Depth"
        value={depth}
        word={dialWord("depth", depth)}
        left="Intro"
        right="Internals"
        onChange={(v) => setDial("depth", v)}
      />
      <Dial
        id="dHall"
        label="Hallway vs talks"
        value={hall}
        word={dialWord("hall", hall)}
        left="Sit in talks"
        right="Roam the expo"
        onChange={(v) => setDial("expoShare", v)}
      />
      <Dial
        id="dPace"
        label="Pace"
        value={pace}
        word={dialWord("pace", pace)}
        left="Breathing room"
        right="Pack it in"
        onChange={(v) => setDial("packed", v)}
      />
    </div>
  );
}

function Dial({
  id,
  label,
  value,
  word,
  left,
  right,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  word: string;
  left: string;
  right: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="fg-dial">
      <label htmlFor={id}>
        {label}{" "}
        <output htmlFor={id}>
          {value} <span>{word}</span>
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        aria-valuetext={`${value}, ${word}`}
        style={{ ["--v" as string]: `${value}%` }}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="fg-ends" aria-hidden="true">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}
