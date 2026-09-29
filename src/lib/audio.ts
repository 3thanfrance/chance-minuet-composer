import { compositionMeasures, arrangementFor, type Composition, type PlayerInstrument } from "./music";
import { SAMPLE_MANIFEST, nearestSample } from "./sampleManifest";
import { arrangeMeasure, type ArrangementRole } from "./orchestration";

export type AudioLoadState = "idle" | "loading" | "ready" | "error";
interface AudioEngine {
  context: AudioContext;
  master: GainNode;
  dry: GainNode;
  room: DelayNode;
  roomGain: GainNode;
}
interface ActiveAudio {
  nodes: Set<AudioBufferSourceNode>;
  timer?: number;
  generation: number;
  roleGains: Record<ArrangementRole, GainNode>;
}
const bytes = new Map<string, Promise<ArrayBuffer>>();
const decoded = new WeakMap<BaseAudioContext, Map<string, Promise<AudioBuffer>>>();
let engine: AudioEngine | null = null;
let active: ActiveAudio | null = null;
let generation = 0;
let latestVolume = 0.75;
let latestMuted = false;
const trims: Record<PlayerInstrument, number> = {
  piano: 0.58,
  harpsichord: 0.45,
  harp: 0.6,
  violin: 0.42,
  cello: 0.44,
  flute: 0.48,
  clarinet: 0.48,
};
export const releases: Record<PlayerInstrument, number> = {
  piano: 0.85,
  harpsichord: 0.55,
  harp: 1.05,
  violin: 0.3,
  cello: 0.35,
  flute: 0.22,
  clarinet: 0.25,
};

function audioConstructor() {
  return (
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  );
}
function getEngine() {
  if (engine && engine.context.state !== "closed") return engine;
  const Ctx = audioConstructor();
  if (!Ctx) throw new Error("Web Audio is not supported in this browser.");
  const context = new Ctx();
  const master = context.createGain();
  const dry = context.createGain();
  const room = context.createDelay(0.2);
  const roomGain = context.createGain();
  master.gain.value = latestMuted ? 0 : latestVolume;
  dry.gain.value = 0.92;
  room.delayTime.value = 0.055;
  roomGain.gain.value = 0.1;
  dry.connect(master);
  dry.connect(room).connect(roomGain).connect(master);
  master.connect(context.destination);
  engine = { context, master, dry, room, roomGain };
  return engine;
}
export function unlockAudio() {
  try {
    return getEngine().context.resume();
  } catch (error) {
    return Promise.reject(error);
  }
}
function fetchSample(url: string) {
  const existing = bytes.get(url);
  if (existing) return existing;
  const request = fetch(url)
    .then((r) => {
      if (!r.ok) throw new Error(`Could not load recorded instrument (${r.status}).`);
      return r.arrayBuffer();
    })
    .catch((error) => {
      bytes.delete(url);
      throw error;
    });
  bytes.set(url, request);
  return request;
}
export function preloadInstrument(instrument: PlayerInstrument = "piano") {
  return Promise.all(SAMPLE_MANIFEST[instrument].map((s) => fetchSample(s.url))).then(() => undefined);
}
async function decodeSample(context: BaseAudioContext, url: string) {
  let cache = decoded.get(context);
  if (!cache) {
    cache = new Map();
    decoded.set(context, cache);
  }
  const found = cache.get(url);
  if (found) return found;
  const promise = fetchSample(url)
    .then((data) => context.decodeAudioData(data.slice(0)))
    .catch((error) => {
      cache?.delete(url);
      throw error;
    });
  cache.set(url, promise);
  return promise;
}
async function loadInstruments(context: BaseAudioContext, instruments: PlayerInstrument[]) {
  await Promise.all(
    [...new Set(instruments)].flatMap((instrument) =>
      SAMPLE_MANIFEST[instrument].map((sample) => decodeSample(context, sample.url)),
    ),
  );
}

export function stopAudio() {
  generation += 1;
  if (!active) return;
  if (active.timer) window.clearInterval(active.timer);
  active.nodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      /* already stopped */
    }
  });
  active = null;
}
export function disposeAudio() {
  stopAudio();
  const old = engine;
  engine = null;
  if (old) void old.context.close().catch(() => undefined);
}
export function setAudioLevel(volume: number, muted: boolean) {
  latestVolume = Math.max(0, Math.min(1, volume));
  latestMuted = muted;
  if (!engine || engine.context.state === "closed") return;
  const now = engine.context.currentTime;
  engine.master.gain.cancelScheduledValues(now);
  engine.master.gain.setTargetAtTime(muted ? 0 : latestVolume, now, muted ? 0.005 : 0.02);
}
export function setRoleLevel(role: ArrangementRole, level: number, muted: boolean) {
  const gain = active?.roleGains[role];
  if (!gain || !engine) return;
  const now = engine.context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setTargetAtTime(muted ? 0 : Math.max(0, Math.min(1, level)), now, 0.015);
}

function scheduleSample(
  context: BaseAudioContext,
  destination: AudioNode,
  instrument: PlayerInstrument,
  midi: number,
  start: number,
  duration: number,
  nodes: Set<AudioBufferSourceNode>,
  buffer: AudioBuffer,
  rootMidi: number,
) {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = 2 ** ((midi - rootMidi) / 12);
  const attack =
    instrument === "violin" || instrument === "cello"
      ? 0.045
      : instrument === "flute" || instrument === "clarinet"
        ? 0.025
        : 0.006;
  const release = releases[instrument];
  const end = start + duration;
  const stop = end + release;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, trims[instrument]), start + Math.min(attack, duration * 0.3));
  gain.gain.setValueAtTime(Math.max(0.0001, trims[instrument] * 0.8), end);
  gain.gain.exponentialRampToValueAtTime(0.0001, stop);
  source.connect(gain).connect(destination);
  source.start(start);
  source.stop(stop + 0.03);
  nodes.add(source);
  source.onended = () => nodes.delete(source);
}
export function playbackDuration(composition: Composition) {
  const arrangement = arrangementFor(composition);
  const instruments = [arrangement.melody, arrangement.accompaniment, ...(arrangement.bass ? [arrangement.bass] : [])];
  return 48 * (60 / composition.tempo) + Math.max(...instruments.map((instrument) => releases[instrument])) + 0.08;
}

export async function playComposition(
  composition: Composition,
  volume: number,
  onProgress: (bar: number, progress: number) => void,
  onEnd: () => void,
  onLoadState?: (state: AudioLoadState) => void,
  onStarted?: () => void,
  fromProgress = 0,
) {
  stopAudio();
  const ownGeneration = generation;
  latestVolume = volume;
  const shared = getEngine();
  const { context, dry } = shared;
  const arrangement = arrangementFor(composition);
  const instruments = [arrangement.melody, arrangement.accompaniment, ...(arrangement.bass ? [arrangement.bass] : [])];
  onLoadState?.("loading");
  try {
    await context.resume();
    await loadInstruments(context, instruments);
  } catch (error) {
    if (generation !== ownGeneration) return;
    if (active?.generation === ownGeneration) active = null;
    onLoadState?.("error");
    throw error;
  }
  if (generation !== ownGeneration) return;
  const loaded = new Map<string, AudioBuffer>();
  for (const instrument of new Set(instruments))
    for (const sample of SAMPLE_MANIFEST[instrument]) loaded.set(sample.url, await decodeSample(context, sample.url));
  if (generation !== ownGeneration) return;
  const nodes = new Set<AudioBufferSourceNode>();
  const roleIndex = { melody: 0, accompaniment: 1, bass: 2 } as const;
  const rolePan = { melody: -0.12, accompaniment: 0.12, bass: 0.02 } as const;
  const roleGains = {} as Record<ArrangementRole, GainNode>;
  for (const role of Object.keys(roleIndex) as ArrangementRole[]) {
    const panner = context.createStereoPanner();
    const gain = context.createGain();
    panner.pan.value = rolePan[role];
    gain.gain.value = arrangement.muted[roleIndex[role]] ? 0 : arrangement.levels[roleIndex[role]];
    gain.connect(panner).connect(dry);
    roleGains[role] = gain;
  }
  active = { nodes, generation: ownGeneration, roleGains };
  setAudioLevel(latestVolume, latestMuted);
  onLoadState?.("ready");
  onStarted?.();
  const pulse = 60 / composition.tempo;
  const startAt = context.currentTime + 0.08;
  const offsetSeconds = Math.min(0.9999, Math.max(0, fromProgress)) * 48 * pulse;
  const measures = compositionMeasures(composition.totals);
  measures.forEach((measure, bar) => {
    for (const note of arrangeMeasure(measure, arrangement)) {
      const sample = nearestSample(note.instrument, note.midi);
      const buffer = loaded.get(sample.url);
      const onset = (bar * 3 + note.startPulse) * pulse;
      const end = onset + note.durationPulses * pulse * 0.92;
      if (buffer && end > offsetSeconds)
        scheduleSample(
          context,
          roleGains[note.role],
          note.instrument,
          note.midi,
          startAt + Math.max(0, onset - offsetSeconds),
          end - Math.max(onset, offsetSeconds),
          nodes,
          buffer,
          sample.midi,
        );
    }
  });
  const scoreSeconds = 48 * pulse;
  const finishSeconds = playbackDuration(composition);
  active.timer = window.setInterval(() => {
    if (generation !== ownGeneration) return;
    const elapsed = offsetSeconds + Math.max(0, context.currentTime - startAt);
    onProgress(Math.min(15, Math.floor(elapsed / (pulse * 3))), Math.min(1, elapsed / scoreSeconds));
    if (elapsed >= finishSeconds && active?.generation === ownGeneration) {
      stopAudio();
      onEnd();
    }
  }, 50);
}

/** Interleaved stereo PCM, with room and release tails matching live playback. */
export function encodeWav(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const frames = channels[0]?.length ?? 0;
  if (!channels.length || channels.some((c) => c.length !== frames)) throw new Error("Invalid audio channels.");
  const blockAlign = channels.length * 2;
  const dataBytes = frames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, dataBytes, true);
  let peak = 1;
  for (const channel of channels) for (const value of channel) peak = Math.max(peak, Math.abs(value));
  for (let frame = 0; frame < frames; frame++)
    for (let channel = 0; channel < channels.length; channel++) {
      const value = Math.max(-1, Math.min(1, (channels[channel]?.[frame] ?? 0) / peak));
      view.setInt16(
        44 + (frame * channels.length + channel) * 2,
        Math.round(value * (value < 0 ? 32768 : 32767)),
        true,
      );
    }
  return buffer;
}
export async function renderCompositionWav(composition: Composition): Promise<Blob> {
  const sampleRate = 44100;
  const context = new OfflineAudioContext(2, Math.ceil((playbackDuration(composition) + 0.2) * sampleRate), sampleRate);
  const a = arrangementFor(composition);
  const instruments = [a.melody, a.accompaniment, ...(a.bass ? [a.bass] : [])];
  await loadInstruments(context, instruments);
  const loaded = new Map<string, AudioBuffer>();
  for (const instrument of new Set(instruments))
    for (const sample of SAMPLE_MANIFEST[instrument]) loaded.set(sample.url, await decodeSample(context, sample.url));
  const master = context.createGain();
  master.gain.value = 0.76;
  master.connect(context.destination);
  const dry = context.createGain();
  dry.gain.value = 0.92;
  dry.connect(master);
  const delay = context.createDelay(0.2);
  delay.delayTime.value = 0.055;
  const wet = context.createGain();
  wet.gain.value = 0.1;
  dry.connect(delay).connect(wet).connect(master);
  const roleGains = {} as Record<ArrangementRole, GainNode>;
  const roles = ["melody", "accompaniment", "bass"] as const;
  roles.forEach((role, index) => {
    const gain = context.createGain();
    gain.gain.value = a.muted[index] ? 0 : (a.levels[index] ?? 0);
    const pan = context.createStereoPanner();
    pan.pan.value = [-0.12, 0.12, 0.02][index] ?? 0;
    gain.connect(pan).connect(dry);
    roleGains[role] = gain;
  });
  const pulse = 60 / composition.tempo;
  const nodes = new Set<AudioBufferSourceNode>();
  compositionMeasures(composition.totals).forEach((measure, bar) => {
    for (const note of arrangeMeasure(measure, a)) {
      const sample = nearestSample(note.instrument, note.midi);
      const buffer = loaded.get(sample.url);
      if (!buffer) throw new Error("Missing recorded sample.");
      scheduleSample(
        context,
        roleGains[note.role],
        note.instrument,
        note.midi,
        0.08 + (bar * 3 + note.startPulse) * pulse,
        note.durationPulses * pulse * 0.92,
        nodes,
        buffer,
        sample.midi,
      );
    }
  });
  const rendered = await context.startRendering();
  return new Blob([encodeWav([rendered.getChannelData(0), rendered.getChannelData(1)], sampleRate)], {
    type: "audio/wav",
  });
}
