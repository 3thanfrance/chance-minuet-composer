import type { NoteEvent } from "../data/mozart";

const letterSteps: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

export function staffPitchY(pitch: string, staff: "treble" | "bass"): number {
  const match = /^([a-g])(?:#|b)?(-?\d+)$/i.exec(pitch);
  if (!match) return staff === "treble" ? 38 : 88;
  const letter = match[1]?.toLowerCase();
  const octave = Number(match[2]);
  if (!letter || !Number.isInteger(octave)) return staff === "treble" ? 38 : 88;
  const step = octave * 7 + (letterSteps[letter] ?? 0);
  const anchor = staff === "treble" ? 4 * 7 + letterSteps.e : 2 * 7 + letterSteps.g;
  const anchorY = staff === "treble" ? 38 : 88;
  return anchorY - (step - anchor) * 2.5;
}

export function eventDenominator(event: NoteEvent): number {
  return typeof event[0] === "number" ? event[0] : event[1] ?? 8;
}

export function flagCount(denominator: number): number {
  if (denominator >= 16) return 2;
  if (denominator >= 8) return 1;
  return 0;
}

export function restGlyph(denominator: number): string {
  if (denominator >= 16) return "𝄿";
  if (denominator >= 8) return "𝄾";
  return "𝄽";
}

export function ledgerLineYs(y: number, staff: "treble" | "bass"): number[] {
  const top = staff === "treble" ? 18 : 68;
  const bottom = staff === "treble" ? 38 : 88;
  const lines: number[] = [];
  for (let line = bottom + 5; line <= y + 0.01; line += 5) lines.push(line);
  for (let line = top - 5; line >= y - 0.01; line -= 5) lines.push(line);
  return lines;
}