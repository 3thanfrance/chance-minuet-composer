import type { Measure, NoteEvent } from "../data/mozart";
import { eventDuration, pitchToMidi, type Arrangement, type PlayerInstrument } from "./music";

export type ArrangementRole = "melody" | "accompaniment" | "bass";
export interface ArrangedNote {
  role: ArrangementRole;
  instrument: PlayerInstrument;
  pitch: string;
  midi: number;
  startPulse: number;
  durationPulses: number;
  level: number;
}

const MONOPHONIC_LEADS = new Set<PlayerInstrument>(["violin", "cello", "flute", "clarinet"]);

function eventPitches(event: NoteEvent): string[] {
  const value = event[0];
  if (typeof value === "number") return [];
  return typeof value === "string" ? [value] : [...value];
}

function addNotes(target: ArrangedNote[], role: ArrangementRole, instrument: PlayerInstrument, pitches: string[], startPulse: number, durationPulses: number, level: number) {
  for (const pitch of pitches) target.push({ role, instrument, pitch, midi: pitchToMidi(pitch), startPulse, durationPulses, level });
}

/** Assigns one historical measure to players without changing pitch, onset, or duration. */
export function arrangeMeasure(measure: Measure, arrangement: Arrangement): ArrangedNote[] {
  const notes: ArrangedNote[] = [];
  let trebleCursor = 0;
  for (const event of measure.treble) {
    const duration = eventDuration(event);
    const pitches = eventPitches(event);
    if (MONOPHONIC_LEADS.has(arrangement.melody) && pitches.length > 1) {
      const ordered = [...pitches].sort((a, b) => pitchToMidi(a) - pitchToMidi(b));
      const lead = ordered.at(-1);
      if (lead) addNotes(notes, "melody", arrangement.melody, [lead], trebleCursor, duration, arrangement.levels[0]);
      addNotes(notes, "accompaniment", arrangement.accompaniment, ordered.slice(0, -1), trebleCursor, duration, arrangement.levels[1]);
    } else {
      addNotes(notes, "melody", arrangement.melody, pitches, trebleCursor, duration, arrangement.levels[0]);
    }
    trebleCursor += duration;
  }

  let bassCursor = 0;
  for (const event of measure.bass) {
    const duration = eventDuration(event);
    const pitches = eventPitches(event);
    addNotes(notes, "accompaniment", arrangement.accompaniment, pitches, bassCursor, duration, arrangement.levels[1]);
    if (arrangement.bass && pitches.length) {
      const lowest = pitches.reduce((low, pitch) => pitchToMidi(pitch) < pitchToMidi(low) ? pitch : low);
      addNotes(notes, "bass", arrangement.bass, [lowest], bassCursor, duration, arrangement.levels[2]);
    }
    bassCursor += duration;
  }
  return notes;
}