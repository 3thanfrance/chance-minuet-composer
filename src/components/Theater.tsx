import { useCallback, useEffect, useRef, useState } from "react";
import spanLogo from "../assets/span-logo.svg";
import { ChevronRight, FastForward, Play } from "lucide-react";
import { Button } from "./Button";
import { Die } from "./Dice";
import { measureId, rollPair, type DicePair } from "../lib/music";
import { preloadInstrument } from "../lib/audio";
import { useDialogFocus } from "../lib/dialogFocus";

const scenes=[
  {title:"A shortcut from blank page to minuet.",detail:"In 1793, a dice game published under Mozart’s name offered just that."},
  {title:"Two dice choose a measure.",detail:"Sixteen choices become a minuet."},
  {title:"The structure holds.",detail:"The possibilities change."},
  {title:"Bob, your turn.",detail:"Give chance a turn, then choose who plays."},
];
export function Theater({open,onClose}:{open:boolean;onClose:()=>void}){
  const [started,setStarted]=useState(false);const [scene,setScene]=useState(0);const [phase,setPhase]=useState<"visible"|"exchange"|"closing">("visible");const [dice,setDice]=useState<DicePair>([3,4]);const [rolling,setRolling]=useState(false);const ref=useRef<HTMLElement>(null);const timers=useRef<number[]>([]);const reduced=()=>window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clear=()=>{timers.current.forEach(clearTimeout);timers.current=[]};
  const dismiss=useCallback(()=>{try{localStorage.setItem("chance-music-intro","seen")}catch{/* composing remains available */}clear();if(reduced()){onClose();return}setPhase("closing");timers.current.push(window.setTimeout(onClose,580))},[onClose]);useDialogFocus(open,ref,dismiss);
  useEffect(()=>{if(!open)return;clear();setStarted(false);setScene(0);setDice([3,4]);setRolling(false);setPhase("visible");return clear},[open]);
  const advance=useCallback(()=>{if(scene>=3){dismiss();return}if(reduced()){setScene(s=>s+1);return}setPhase("exchange");clear();timers.current.push(window.setTimeout(()=>{setScene(s=>s+1);setPhase("visible")},520))},[scene,dismiss]);
  useEffect(()=>{if(!open||!started||reduced()||phase!=="visible")return;const timer=window.setTimeout(()=>scene<3?advance():dismiss(),scene===0?4000:scene===1?4500:3500);return()=>window.clearTimeout(timer)},[open,started,scene,phase,advance,dismiss]);
  const throwDice=()=>{if(rolling)return;setRolling(true);const next=rollPair();timers.current.push(window.setTimeout(()=>{setDice(next);setRolling(false)},1150))};
  if(!open)return null;const active=scenes[scene]??scenes[0];if(!active)return null;const total=dice[0]+dice[1];
  return <section ref={ref} className={`theater-overlay theater-${phase}`} role="dialog" aria-modal="true" aria-label="A Little Chance Music introduction"><div className="theater-top"><img className="span-logo span-logo-inverse" src={spanLogo} alt="Span"/><Button autoFocus variant="ghost" onClick={dismiss}><FastForward/> Skip to composing</Button></div><div className="proscenium" data-scene={started?scene:"closed"} data-phase={phase}><div className="curtain curtain-left"/><div className="curtain curtain-right"/><div className="stage-title"><span>A private paper theatre</span><b>A Little Chance Music</b></div>
    <div className="stage-world" aria-hidden={!started}><div className="vienna-cutout">VIENNA<br/><b>1793</b></div><div className="mozart-cutout"><span className="head">M</span><span className="body"/><span className="arm"/><span className="stick"/></div><div className="writing-desk"><span className="quill">⌁</span><span className="manuscript">♪ &nbsp; ♫ &nbsp; ♪</span></div><div className="paper-hand"><span/><i/></div><div className="theater-dice" onClick={throwDice}><Die value={dice[0]} small rolling={rolling}/><Die value={dice[1]} small rolling={rolling} index={1}/></div><div className="lookup-prop"><b>11 × 16</b><span>{Array.from({length:24},(_,i)=><i className={i===8?"chosen":""} key={i}/>)}</span><strong>{total} → {measureId(0,total)}</strong></div><div className="instrument-prop keyboard">▥</div><div className="instrument-prop violin">𝆑</div><div className="instrument-prop flute">━</div><div className="music-strips"><i>𝄞 ♪ ♫</i><i>𝄢 ♩ ♪</i></div></div><div className="stage-floor"/>
    {!started?<div className="opening-copy"><p className="kicker">Composed for one listener</p><h1>A Little Chance Music</h1><p>A little chance music, for Bob Pisani.</p><div className="opening-actions"><Button onClick={()=>{void preloadInstrument("piano");setStarted(true)}}><Play/> Raise the curtain</Button><Button variant="outline" onClick={dismiss}>Start composing</Button></div></div>:<div className="caption-strip" key={scene}><span>Scene {scene+1} of 4</span><h2>{active.title}</h2><p>{active.detail}</p>{scene===1&&<button className="scene-roll" onClick={throwDice} disabled={rolling}>Roll the dice · {total} → measure {measureId(0,total)}</button>}<Button variant="ghost" onClick={advance}>{scene<3?"Next":"Compose"}<ChevronRight/></Button></div>}
  </div></section>;
}