import { pitchToMidi, type PlayerInstrument } from "./music";

const notes = {
  piano: ["C2","Ds2","Fs2","A2","C3","Ds3","Fs3","A3","C4","Ds4","Fs4","A4","C5","Ds5","Fs5","A5","C6"],
  harpsichord: ["C2","D2","E2","Fs2","Gs2","As2","C3","D3","E3","Fs3","Gs3","As3","C4","D4","E4","Fs4","Gs4","As4","C5","D5","E5","Fs5","Gs5","As5","C6","D6","E6"],
  violin: ["A3","C4","E4","G4","A4","C5","E5","G5","A5","C6","E6","G6"],
  cello: ["C2","D2","E2","F2","G2","A2","B2","C3","D3","E3","F3","G3","A3","B3","C4","D4","E4","F4","G4"],
  flute: ["C4","E4","A4","C5","E5","A5","C6","E6","A6"],
  clarinet: ["D3","F3","As3","D4","F4","As4","D5","F5","As5","D6"],
  harp: ["E1","G1","B1","D2","F2","A2","C3","E3","G3","B3","D4","F4","A4","C5","E5","G5","B5","D6"],
} as const satisfies Record<PlayerInstrument, readonly string[]>;

// VCSL's Zuckermann filenames use C3 for a measured 261.3 Hz sample.
// The bundled files were therefore renamed one octave higher (source C3 → C4)
// so these roots remain scientific pitch/MIDI-correct during transposition.
export const VCSL_HARPSICHORD_OCTAVE_OFFSET = 1;
export function vcslHarpsichordSourceToScientific(sourceNote: string): string | null {
  const match = /^([A-G](?:#)?)(\d)$/.exec(sourceNote);
  if (!match?.[1] || !match[2]) return null;
  return `${match[1].replace("#", "s")}${Number(match[2]) + VCSL_HARPSICHORD_OCTAVE_OFFSET}`;
}

export interface SampleDefinition { url: string; midi: number; note: string }
export const SAMPLE_MANIFEST = Object.fromEntries(Object.entries(notes).map(([instrument, instrumentNotes]) => [instrument, instrumentNotes.map((note) => ({
  note,
  midi: pitchToMidi(note.replace("s", "#").toLowerCase()),
  url: `/audio/${instrument}/${note}.mp3`,
}))])) as Record<PlayerInstrument, SampleDefinition[]>;

export function nearestSample(instrument: PlayerInstrument, midi: number): SampleDefinition {
  const available = SAMPLE_MANIFEST[instrument];
  const first=available[0];
  if(!first) throw new Error(`No recorded samples configured for ${instrument}.`);
  return available.reduce((best, item) => Math.abs(item.midi-midi) < Math.abs(best.midi-midi) ? item : best, first);
}