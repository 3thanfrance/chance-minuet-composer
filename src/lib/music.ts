import { LOOKUP_TABLE, MEASURES, type Measure, type NoteEvent } from "../data/mozart";

export const DEFAULT_TOTALS = [7, 5, 9, 4, 8, 6, 7, 10, 5, 8, 6, 9, 7, 4, 11, 7] as const;
export const INSTRUMENTS = ["piano", "harpsichord", "flute", "strings"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export type DicePair = readonly [number, number];
export interface Composition { totals: number[]; dice: DicePair[]; instrument: Instrument; tempo: number; }

function isDicePair(value: unknown): value is DicePair {
  return Array.isArray(value) && value.length === 2 && value.every((die) => Number.isInteger(die) && die >= 1 && die <= 6);
}
export function isValidComposition(value: unknown): value is Composition {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Composition>;
  return Array.isArray(candidate.totals) && candidate.totals.length === 16
    && candidate.totals.every((total) => Number.isInteger(total) && total >= 2 && total <= 12)
    && typeof candidate.instrument === "string" && INSTRUMENTS.includes(candidate.instrument as Instrument)
    && Number.isInteger(candidate.tempo) && Number(candidate.tempo) >= 60 && Number(candidate.tempo) <= 180
    && Array.isArray(candidate.dice) && candidate.dice.length === 16
    && candidate.dice.every((pair, index) => isDicePair(pair) && pair[0] + pair[1] === candidate.totals?.[index]);
}

export function measureId(position: number, total: number): number {
  const row = LOOKUP_TABLE[total - 2];
  const id = row?.[position];
  return typeof id === "number" ? id : 1;
}
export function compositionMeasures(totals: readonly number[]): Measure[] {
  return totals.map((total, position) => {
    const measure = MEASURES[measureId(position, total)];
    if (!measure) throw new Error(`Missing measure at position ${position + 1}.`);
    return measure;
  });
}
export function rollPair(random = Math.random): DicePair {
  return [Math.floor(random() * 6) + 1, Math.floor(random() * 6) + 1];
}
export function rollComposition(random = Math.random): Pick<Composition, "totals" | "dice"> {
  const dice = Array.from({ length: 16 }, () => rollPair(random));
  return { dice, totals: dice.map(([a, b]) => a + b) };
}
export function diceForTotal(total: number): DicePair {
  const valid: DicePair[] = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === total) valid.push([a, b]);
  const pair = valid[Math.floor(Math.random() * valid.length)];
  return pair ?? [1, 1];
}
export function eventDuration(event: NoteEvent): number {
  const denominator = typeof event[0] === "number" ? event[0] : event[1] ?? 8;
  return 8 / denominator;
}
export function pitchToMidi(pitch: string): number {
  const match = /^([a-g])([#b]?)(-?\d+)$/.exec(pitch.toLowerCase());
  if (!match) return 60;
  const semis: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  const pitchClass = match[1];
  if (!pitchClass) return 60;
  return (Number(match[3]) + 1) * 12 + (semis[pitchClass] ?? 0) + accidental;
}
export function midiToY(midi: number, staff: "treble" | "bass"): number {
  const center = staff === "treble" ? 72 : 48;
  return 34 - (midi - center) * 1.8;
}

const SHARE_VERSION = "2";
export function encodeShare(composition: Composition): string {
  if (!isValidComposition(composition)) throw new Error("Cannot share an invalid composition.");
  return `${SHARE_VERSION}.${composition.totals.map((n) => n.toString(13)).join("")}.${composition.instrument}.${composition.tempo}`;
}
export function decodeShare(value: string | null): Composition | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  const [version, totalsPart, instrumentPart, tempoPart] = parts;
  if (version !== SHARE_VERSION || !totalsPart || !/^[2-9abc]{16}$/.test(totalsPart) || !instrumentPart || !INSTRUMENTS.includes(instrumentPart as Instrument) || !tempoPart || !/^\d+$/.test(tempoPart)) return null;
  const totals = [...totalsPart].map((char) => Number.parseInt(char, 13));
  const tempo = Number(tempoPart);
  if (totals.some((n) => !Number.isInteger(n) || n < 2 || n > 12) || !Number.isInteger(tempo) || tempo < 60 || tempo > 180) return null;
  return { totals, dice: totals.map(diceForTotal), instrument: instrumentPart as Instrument, tempo };
}
export function compositionExport(composition: Composition, title: string) {
  return { title, ...composition, measureIds: composition.totals.map((total, position) => measureId(position, total)) };
}

export function validateMusicData(): string[] {
  const errors: string[] = [];
  const ids = LOOKUP_TABLE.flat();
  if (new Set(ids).size !== 176 || Math.min(...ids) !== 1 || Math.max(...ids) !== 176) errors.push("Lookup table must contain IDs 1–176 exactly once.");
  if (measureId(2, 11) !== 165) errors.push("Mapping test failed.");
  for (let id = 1; id <= 176; id++) for (const staff of ["treble", "bass"] as const) {
    const duration = MEASURES[id]?.[staff].reduce((sum, event) => sum + eventDuration(event), 0);
    if (duration !== 3) errors.push(`Measure ${id} ${staff} has ${duration} pulses.`);
  }
  return errors;
}
