import { compositionMeasures, eventDuration, pitchToMidi, type Composition, type Instrument } from "./music";

interface ActiveAudio { context: AudioContext; nodes: Set<AudioScheduledSourceNode>; timer?: number; }
let active: ActiveAudio | null = null;

const profiles: Record<Instrument, { wave: OscillatorType; attack: number; release: number; level: number; detune?: number }> = {
  piano: { wave: "triangle", attack: 0.008, release: 0.34, level: 0.12 },
  harpsichord: { wave: "sawtooth", attack: 0.003, release: 0.12, level: 0.075 },
  flute: { wave: "sine", attack: 0.08, release: 0.2, level: 0.11 },
  strings: { wave: "triangle", attack: 0.18, release: 0.42, level: 0.095, detune: 4 },
};

export function stopAudio() {
  if (!active) return;
  if (active.timer) window.clearInterval(active.timer);
  active.nodes.forEach((node) => { try { node.stop(); } catch { /* already stopped */ } });
  active.context.close().catch(() => undefined);
  active = null;
}

function scheduleTone(ctx: AudioContext, destination: AudioNode, instrument: Instrument, midi: number, start: number, duration: number, volume: number, nodes: Set<AudioScheduledSourceNode>) {
  const profile = profiles[instrument];
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = profile.wave;
  oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  oscillator.detune.value = profile.detune ?? 0;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, profile.level * volume), start + profile.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(profile.attack + 0.01, duration - profile.release * 0.4));
  oscillator.connect(gain).connect(destination);
  oscillator.start(start); oscillator.stop(start + duration + 0.03);
  nodes.add(oscillator); oscillator.onended = () => nodes.delete(oscillator);
}

export async function playComposition(composition: Composition, volume: number, onProgress: (bar: number, progress: number) => void, onEnd: () => void) {
  stopAudio();
  const Ctx = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error("Web Audio is not supported in this browser.");
  const context = new Ctx(); await context.resume();
  const master = context.createGain(); master.gain.value = volume; master.connect(context.destination);
  const nodes = new Set<AudioScheduledSourceNode>();
  active = { context, nodes };
  const pulse = 60 / composition.tempo;
  const startAt = context.currentTime + 0.08;
  compositionMeasures(composition.totals).forEach((measure, bar) => {
    for (const staff of ["treble", "bass"] as const) {
      let cursor = 0;
      measure[staff].forEach((event) => {
        const pulses = eventDuration(event); const first = event[0];
        if (typeof first !== "number") {
          const pitches = Array.isArray(first) ? first : [first];
          pitches.forEach((pitch) => scheduleTone(context, master, composition.instrument, pitchToMidi(pitch), startAt + (bar * 3 + cursor) * pulse, pulses * pulse * 0.95, staff === "bass" ? 0.72 : 1, nodes));
        }
        cursor += pulses;
      });
    }
  });
  const totalSeconds = 48 * pulse;
  active.timer = window.setInterval(() => {
    const elapsed = Math.max(0, context.currentTime - startAt);
    const progress = Math.min(1, elapsed / totalSeconds);
    onProgress(Math.min(15, Math.floor(elapsed / (pulse * 3))), progress);
    if (progress >= 1) { stopAudio(); onEnd(); }
  }, 50);
}
