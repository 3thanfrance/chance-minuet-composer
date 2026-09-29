import { describe, expect, it } from "vitest";
import { pitchToMidi } from "./music";
import { SAMPLE_MANIFEST, vcslHarpsichordSourceToScientific } from "./sampleManifest";

describe("VCSL harpsichord octave convention", () => {
  it("maps measured source C3 at about 261.3 Hz to scientific C4 / MIDI 60", () => {
    expect(vcslHarpsichordSourceToScientific("C3")).toBe("C4");
    expect(SAMPLE_MANIFEST.harpsichord.find((sample) => sample.note === "C4")?.midi).toBe(60);
    expect(pitchToMidi("c4")).toBe(60);
  });

  it("maps the independently measured source D3 at about 293.6 Hz to scientific D4 / MIDI 62", () => {
    expect(vcslHarpsichordSourceToScientific("D3")).toBe("D4");
    expect(SAMPLE_MANIFEST.harpsichord.find((sample) => sample.note === "D4")?.midi).toBe(62);
    expect(pitchToMidi("d4")).toBe(62);
  });
});