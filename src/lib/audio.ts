import { compositionMeasures, eventDuration, pitchToMidi, arrangementFor, type Composition, type PlayerInstrument } from "./music";
import { SAMPLE_MANIFEST, nearestSample } from "./sampleManifest";
import { arrangeMeasure } from "./orchestration";

export type AudioLoadState = "idle"|"loading"|"ready"|"error";
interface ActiveAudio { context: AudioContext; master: GainNode; nodes: Set<AudioBufferSourceNode>; timer?: number; generation: number }
const bytes = new Map<string,Promise<ArrayBuffer>>();
const decoded = new WeakMap<BaseAudioContext,Map<string,Promise<AudioBuffer>>>();
let active:ActiveAudio|null=null;let generation=0;let latestVolume=.75;let latestMuted=false;

const trims:Record<PlayerInstrument,number>={piano:.58,harpsichord:.45,harp:.6,violin:.42,cello:.44,flute:.48,clarinet:.48};
const releases:Record<PlayerInstrument,number>={piano:.85,harpsichord:.55,harp:1.05,violin:.3,cello:.35,flute:.22,clarinet:.25};

function fetchSample(url:string){
  const existing=bytes.get(url);if(existing)return existing;
  const request=fetch(url).then(r=>{if(!r.ok)throw new Error(`Could not load recorded instrument (${r.status}).`);return r.arrayBuffer()}).catch(error=>{bytes.delete(url);throw error});bytes.set(url,request);return request;
}
export function preloadInstrument(instrument:PlayerInstrument="piano"){return Promise.all(SAMPLE_MANIFEST[instrument].map(s=>fetchSample(s.url))).then(()=>undefined)}
async function decodeSample(context:AudioContext,url:string){let cache=decoded.get(context);if(!cache){cache=new Map();decoded.set(context,cache)}const found=cache.get(url);if(found)return found;const promise=fetchSample(url).then(data=>context.decodeAudioData(data.slice(0))).catch(error=>{cache?.delete(url);throw error});cache.set(url,promise);return promise}
async function loadInstruments(context:AudioContext,instruments:PlayerInstrument[]){const unique=[...new Set(instruments)];await Promise.all(unique.flatMap(instrument=>SAMPLE_MANIFEST[instrument].map(sample=>decodeSample(context,sample.url))));}

export function stopAudio(){generation+=1;if(!active)return;if(active.timer)window.clearInterval(active.timer);active.nodes.forEach(node=>{try{node.stop()}catch{/* already stopped */}});active.context.close().catch(()=>undefined);active=null}
export function setAudioLevel(volume:number,muted:boolean){latestVolume=Math.max(0,Math.min(1,volume));latestMuted=muted;if(!active||active.context.state==="closed")return;const now=active.context.currentTime;active.master.gain.cancelScheduledValues(now);active.master.gain.setTargetAtTime(muted?0:latestVolume,now,muted?.005:.02)}

function scheduleSample(context:AudioContext,destination:AudioNode,instrument:PlayerInstrument,midi:number,start:number,duration:number,level:number,nodes:Set<AudioBufferSourceNode>,buffer:AudioBuffer,rootMidi:number){
  const source=context.createBufferSource();const gain=context.createGain();source.buffer=buffer;source.playbackRate.value=2**((midi-rootMidi)/12);
  const attack=instrument==="violin"||instrument==="cello"?.045:instrument==="flute"||instrument==="clarinet"?.025:.006;const release=releases[instrument];const end=start+duration;const stop=end+release;
  gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,trims[instrument]*level),start+Math.min(attack,duration*.3));gain.gain.setValueAtTime(Math.max(.0001,trims[instrument]*level*.8),end);gain.gain.exponentialRampToValueAtTime(.0001,stop);
  source.connect(gain).connect(destination);source.start(start);source.stop(stop+.03);nodes.add(source);source.onended=()=>nodes.delete(source);
}

export async function playComposition(composition:Composition,volume:number,onProgress:(bar:number,progress:number)=>void,onEnd:()=>void,onLoadState?:(state:AudioLoadState)=>void){
  stopAudio();const ownGeneration=generation;latestVolume=volume;const Ctx=window.AudioContext??(window as typeof window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!Ctx)throw new Error("Web Audio is not supported in this browser.");
  const context=new Ctx();const master=context.createGain();const dry=context.createGain();const room=context.createDelay(.2);const roomGain=context.createGain();const nodes=new Set<AudioBufferSourceNode>();master.gain.value=latestMuted?0:latestVolume;dry.gain.value=.92;room.delayTime.value=.055;roomGain.gain.value=.1;dry.connect(master);dry.connect(room).connect(roomGain).connect(master);master.connect(context.destination);active={context,master,nodes,generation:ownGeneration};
  const resume=context.resume();const arrangement=arrangementFor(composition);const instruments=[arrangement.melody,arrangement.accompaniment,...(arrangement.bass?[arrangement.bass]:[])];onLoadState?.("loading");
  try{await resume;await loadInstruments(context,instruments)}catch(error){if(active?.generation===ownGeneration)active=null;await context.close().catch(()=>undefined);onLoadState?.("error");throw error}
  if(generation!==ownGeneration||active?.generation!==ownGeneration){await context.close().catch(()=>undefined);return}onLoadState?.("ready");
  const loaded=new Map<string,AudioBuffer>();for(const instrument of new Set(instruments))for(const sample of SAMPLE_MANIFEST[instrument])loaded.set(sample.url,await decodeSample(context,sample.url));
  if(generation!==ownGeneration||active?.generation!==ownGeneration){await context.close().catch(()=>undefined);return}
  const pulse=60/composition.tempo;const startAt=context.currentTime+.08;const measures=compositionMeasures(composition.totals);
  const roleIndex={melody:0,accompaniment:1,bass:2} as const;const rolePan={melody:-.12,accompaniment:.12,bass:.02} as const;const panners=new Map<string,StereoPannerNode>();
  measures.forEach((measure,bar)=>{for(const note of arrangeMeasure(measure,arrangement)){if(arrangement.muted[roleIndex[note.role]])continue;let panner=panners.get(note.role);if(!panner){panner=context.createStereoPanner();panner.pan.value=rolePan[note.role];panner.connect(dry);panners.set(note.role,panner)}const sample=nearestSample(note.instrument,note.midi);const buffer=loaded.get(sample.url);if(buffer)scheduleSample(context,panner,note.instrument,note.midi,startAt+(bar*3+note.startPulse)*pulse,note.durationPulses*pulse*.92,note.level,nodes,buffer,sample.midi)}});
  const totalSeconds=48*pulse;active.timer=window.setInterval(()=>{const elapsed=Math.max(0,context.currentTime-startAt);const progress=Math.min(1,elapsed/totalSeconds);onProgress(Math.min(15,Math.floor(elapsed/(pulse*3))),progress);if(progress>=1&&active?.generation===ownGeneration){stopAudio();onEnd()}},50);
}