import { LOOKUP_TABLE, MEASURES, type Measure, type NoteEvent } from "../data/mozart";

export const DEFAULT_TOTALS = [7, 5, 9, 4, 8, 6, 7, 10, 5, 8, 6, 9, 7, 4, 11, 7] as const;
export const PLAYER_INSTRUMENTS = ["piano", "harpsichord", "harp", "violin", "cello", "flute", "clarinet"] as const;
export type PlayerInstrument = (typeof PLAYER_INSTRUMENTS)[number];
export const PRESETS = ["salon", "chamber", "air", "woodwinds", "solo-piano", "solo-harpsichord", "solo-harp"] as const;
export type Preset = (typeof PRESETS)[number];
export interface Arrangement {
  preset: Preset;
  melody: PlayerInstrument;
  accompaniment: PlayerInstrument;
  bass: PlayerInstrument | null;
  levels: readonly [number, number, number];
  muted: readonly [boolean, boolean, boolean];
}
export const ARRANGEMENTS: Record<Preset, Arrangement> = {
  salon:{preset:"salon",melody:"piano",accompaniment:"piano",bass:null,levels:[1,.82,0],muted:[false,false,true]},
  chamber:{preset:"chamber",melody:"violin",accompaniment:"harpsichord",bass:"cello",levels:[.9,.7,.38],muted:[false,false,false]},
  air:{preset:"air",melody:"flute",accompaniment:"harp",bass:"cello",levels:[.88,.72,.34],muted:[false,false,false]},
  woodwinds:{preset:"woodwinds",melody:"clarinet",accompaniment:"piano",bass:null,levels:[.86,.74,0],muted:[false,false,true]},
  "solo-piano":{preset:"solo-piano",melody:"piano",accompaniment:"piano",bass:null,levels:[1,.82,0],muted:[false,false,true]},
  "solo-harpsichord":{preset:"solo-harpsichord",melody:"harpsichord",accompaniment:"harpsichord",bass:null,levels:[.9,.76,0],muted:[false,false,true]},
  "solo-harp":{preset:"solo-harp",melody:"harp",accompaniment:"harp",bass:null,levels:[.92,.78,0],muted:[false,false,true]},
};
export const INSTRUMENTS = ["piano", "harpsichord", "flute", "strings"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export type DicePair = readonly [number, number];
export interface Composition { totals: number[]; dice: DicePair[]; instrument: Instrument; tempo: number; arrangement?: Arrangement; }

function isLevel(value: unknown) { return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1; }
export function isValidArrangement(value: unknown): value is Arrangement {
  if (!value || typeof value !== "object") return false;
  const a=value as Partial<Arrangement>;
  return typeof a.preset==="string"&&PRESETS.includes(a.preset as Preset)
    &&typeof a.melody==="string"&&PLAYER_INSTRUMENTS.includes(a.melody as PlayerInstrument)
    &&typeof a.accompaniment==="string"&&PLAYER_INSTRUMENTS.includes(a.accompaniment as PlayerInstrument)
    &&(a.bass===null||(typeof a.bass==="string"&&PLAYER_INSTRUMENTS.includes(a.bass as PlayerInstrument)))
    &&Array.isArray(a.levels)&&a.levels.length===3&&a.levels.every(isLevel)
    &&Array.isArray(a.muted)&&a.muted.length===3&&a.muted.every(m=>typeof m==="boolean");
}
export function arrangementFor(composition: Composition): Arrangement {
  if (isValidArrangement(composition.arrangement)) return composition.arrangement;
  if (composition.instrument==="harpsichord") return ARRANGEMENTS["solo-harpsichord"];
  if (composition.instrument==="flute") return ARRANGEMENTS.air;
  if (composition.instrument==="strings") return ARRANGEMENTS.chamber;
  return ARRANGEMENTS.salon;
}

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
    && (candidate.arrangement===undefined||isValidArrangement(candidate.arrangement))
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

const SHARE_VERSION = "3";
export function encodeShare(composition: Composition): string {
  if (!isValidComposition(composition)) throw new Error("Cannot share an invalid composition.");
  const a=arrangementFor(composition);const bass=a.bass??"none";const levels=a.levels.map(n=>Math.round(n*100)).join("-");const mask=a.muted.reduce((sum,value,index)=>sum+(value?2**index:0),0);
  return `${SHARE_VERSION}.${composition.totals.map((n) => n.toString(13)).join("")}.${composition.tempo}.${a.preset}.${a.melody},${a.accompaniment},${bass},${levels},${mask}`;
}
export function decodeShare(value: string | null): Composition | null {
  if (!value) return null;
  const parts = value.split(".");
  if(parts[0]==="2"){
    if(parts.length!==4)return null;const [,totalsPart,instrumentPart,tempoPart]=parts;
    if(!totalsPart||!/^[2-9abc]{16}$/.test(totalsPart)||!instrumentPart||!INSTRUMENTS.includes(instrumentPart as Instrument)||!tempoPart||!/^\d+$/.test(tempoPart))return null;
    const totals=[...totalsPart].map(char=>Number.parseInt(char,13));const tempo=Number(tempoPart);if(totals.some(n=>!Number.isInteger(n)||n<2||n>12)||!Number.isInteger(tempo)||tempo<60||tempo>180)return null;
    const legacy={totals,dice:totals.map(diceForTotal),instrument:instrumentPart as Instrument,tempo};return {...legacy,arrangement:arrangementFor(legacy)};
  }
  if(parts.length!==5)return null;
  const [version,totalsPart,tempoPart,presetPart,mixPart]=parts;
  if(version!==SHARE_VERSION||!totalsPart||!/^[2-9abc]{16}$/.test(totalsPart)||!tempoPart||!/^\d+$/.test(tempoPart)||!presetPart||!PRESETS.includes(presetPart as Preset)||!mixPart)return null;
  const totals = [...totalsPart].map((char) => Number.parseInt(char, 13));
  const tempo = Number(tempoPart);
  if (totals.some((n) => !Number.isInteger(n) || n < 2 || n > 12) || !Number.isInteger(tempo) || tempo < 60 || tempo > 180) return null;
  const [melody,accompaniment,bassValue,levelsValue,maskValue,...extra]=mixPart.split(",");
  const levels=levelsValue?.split("-").map(Number);const mask=Number(maskValue);const bass=bassValue==="none"?null:bassValue;
  const arrangement={preset:presetPart,melody,accompaniment,bass,levels:levels?.map(n=>n/100),muted:[0,1,2].map(i=>(mask&(2**i))!==0)};
  if(extra.length||!isValidArrangement(arrangement)||!Number.isInteger(mask)||mask<0||mask>7)return null;
  return {totals,dice:totals.map(diceForTotal),instrument:"piano",tempo,arrangement};
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
