import { compositionMeasures, eventDuration, pitchToMidi, arrangementFor, type Composition, type PlayerInstrument } from "./music";
import { SAMPLE_MANIFEST, nearestSample } from "./sampleManifest";

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
  const roles=[{staff:"treble" as const,instrument:arrangement.melody,level:arrangement.levels[0],muted:arrangement.muted[0],pan:-.12,lowest:false},{staff:"bass" as const,instrument:arrangement.accompaniment,level:arrangement.levels[1],muted:arrangement.muted[1],pan:.12,lowest:false},...(arrangement.bass?[{staff:"bass" as const,instrument:arrangement.bass,level:arrangement.levels[2],muted:arrangement.muted[2],pan:.02,lowest:true}]:[])];
  for(const role of roles){if(role.muted)continue;const panner=context.createStereoPanner();panner.pan.value=role.pan;panner.connect(dry);measures.forEach((measure,bar)=>{let cursor=0;measure[role.staff].forEach(event=>{const pulses=eventDuration(event);const first=event[0];if(typeof first!=="number"){let pitches=Array.isArray(first)?first:[first];if(role.lowest)pitches=[pitches.reduce((low,pitch)=>pitchToMidi(pitch)<pitchToMidi(low)?pitch:low)];for(const pitch of pitches){const midi=pitchToMidi(pitch);const sample=nearestSample(role.instrument,midi);const buffer=loaded.get(sample.url);if(buffer)scheduleSample(context,panner,role.instrument,midi,startAt+(bar*3+cursor)*pulse,pulses*pulse*.92,role.level,nodes,buffer,sample.midi)}}cursor+=pulses})})}
  const totalSeconds=48*pulse;active.timer=window.setInterval(()=>{const elapsed=Math.max(0,context.currentTime-startAt);const progress=Math.min(1,elapsed/totalSeconds);onProgress(Math.min(15,Math.floor(elapsed/(pulse*3))),progress);if(progress>=1&&active?.generation===ownGeneration){stopAudio();onEnd()}},50);
}