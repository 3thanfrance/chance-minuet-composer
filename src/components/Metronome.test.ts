import { describe, expect, it } from "vitest";
import { tempoToWeightTop } from "./Metronome";

describe("metronome weight mapping",()=>{
  it("places slow tempos high and fast tempos low",()=>{
    expect(tempoToWeightTop(60)).toBe(14);
    expect(tempoToWeightTop(120)).toBe(40);
    expect(tempoToWeightTop(180)).toBe(66);
  });
});