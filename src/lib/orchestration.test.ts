import { describe, expect, it } from "vitest";
import { MEASURES, type Measure } from "../data/mozart";
import { ARRANGEMENTS, eventDuration } from "./music";
import { arrangeMeasure } from "./orchestration";

function originalNotes(measure: Measure) {
  return (["treble", "bass"] as const).flatMap((staff) => {
    let cursor = 0;
    return measure[staff].flatMap((event) => {
      const duration = eventDuration(event);
      const value = event[0];
      const pitches = typeof value === "number" ? [] : Array.isArray(value) ? value : [value];
      const result = pitches.map((pitch) => `${pitch}@${cursor}/${duration}`);
      cursor += duration;
      return result;
    });
  }).sort();
}

describe("ensemble voice allocation", () => {
  it("keeps measure 5 complete while a violin lead takes only the highest chord pitch", () => {
    const measure = MEASURES[5];
    if (!measure) throw new Error("Measure 5 is missing.");
    const arranged = arrangeMeasure(measure, ARRANGEMENTS.chamber);
    const primary = arranged.filter((note) => note.role !== "bass");
    const leadAtOpening = primary.filter((note) => note.role === "melody" && note.startPulse === 0);

    expect(leadAtOpening.map((note) => note.pitch)).toEqual(["g5"]);
    expect(primary.filter((note) => note.role === "accompaniment" && note.startPulse === 0).map((note) => note.pitch)).toEqual(expect.arrayContaining(["g4", "b4", "d5", "g2"]));
    expect(primary.map((note) => `${note.pitch}@${note.startPulse}/${note.durationPulses}`).sort()).toEqual(originalNotes(measure));
  });

  it("allows keyboard and harp soloists to retain complete treble chords", () => {
    const measure = MEASURES[5];
    if (!measure) throw new Error("Measure 5 is missing.");
    for (const preset of [ARRANGEMENTS.salon, ARRANGEMENTS["solo-harpsichord"], ARRANGEMENTS["solo-harp"]]) {
      expect(arrangeMeasure(measure, preset).filter((note) => note.role === "melody" && note.startPulse === 0)).toHaveLength(4);
    }
  });
});