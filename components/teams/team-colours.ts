export interface KitColour {
  key: string;
  name: string;
  dot: string;
  text: string;
  border: string;
  soft: string;
  emoji: string;
}

/**
 * Colour is never the only cue: every team shows its name in text alongside the
 * swatch, so the app works for colour-blind players (spec §35).
 */
export const KIT_COLOURS: KitColour[] = [
  { key: "red", name: "Red", dot: "bg-kit-red", text: "text-kit-red", border: "border-kit-red/40", soft: "bg-kit-red/10", emoji: "🔴" },
  { key: "blue", name: "Blue", dot: "bg-kit-blue", text: "text-kit-blue", border: "border-kit-blue/40", soft: "bg-kit-blue/10", emoji: "🔵" },
  { key: "green", name: "Green", dot: "bg-kit-green", text: "text-kit-green", border: "border-kit-green/40", soft: "bg-kit-green/10", emoji: "🟢" },
  { key: "yellow", name: "Yellow", dot: "bg-kit-yellow", text: "text-kit-yellow", border: "border-kit-yellow/40", soft: "bg-kit-yellow/10", emoji: "🟡" },
  { key: "orange", name: "Orange", dot: "bg-kit-orange", text: "text-kit-orange", border: "border-kit-orange/40", soft: "bg-kit-orange/10", emoji: "🟠" },
  { key: "purple", name: "Purple", dot: "bg-kit-purple", text: "text-kit-purple", border: "border-kit-purple/40", soft: "bg-kit-purple/10", emoji: "🟣" },
];

const FALLBACK: KitColour = {
  key: "grey", name: "Grey", dot: "bg-pitch-600", text: "text-chalk-dim",
  border: "border-pitch-600", soft: "bg-pitch-800", emoji: "⚪",
};

export function kitColour(key: string): KitColour {
  return KIT_COLOURS.find((c) => c.key === key) ?? FALLBACK;
}

export function kitForIndex(index: number): KitColour {
  return KIT_COLOURS[index % KIT_COLOURS.length];
}
