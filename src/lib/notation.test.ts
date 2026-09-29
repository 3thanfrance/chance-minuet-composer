import { describe, expect, it } from "vitest";
import { eventDenominator, flagCount, ledgerLineYs, restGlyph, staffPitchY } from "./notation";

describe("compact score notation",()=>{
  it("positions notes by diatonic staff steps without moving accidentals",()=>{expect(staffPitchY("e4","treble")).toBe(38);expect(staffPitchY("c4","treble")).toBe(43);expect(staffPitchY("g4","treble")).toBe(33);expect(staffPitchY("f4","treble")).toBe(35.5);expect(staffPitchY("f#4","treble")).toBe(35.5);expect(staffPitchY("g2","bass")).toBe(88);});
  it("adds appropriate ledger lines",()=>{expect(ledgerLineYs(43,"treble")).toEqual([43]);expect(ledgerLineYs(38,"treble")).toEqual([]);expect(ledgerLineYs(13,"treble")).toEqual([13]);});
  it("distinguishes note flags and rest durations",()=>{expect(flagCount(4)).toBe(0);expect(flagCount(8)).toBe(1);expect(flagCount(16)).toBe(2);expect(restGlyph(4)).not.toBe(restGlyph(8));expect(restGlyph(8)).not.toBe(restGlyph(16));expect(eventDenominator([4])).toBe(4);expect(eventDenominator(["f#4",16])).toBe(16);});
});