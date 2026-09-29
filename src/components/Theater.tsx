import { useCallback, useEffect, useRef, useState } from "react";
import spanLogo from "../assets/span-logo.svg";
import { ChevronRight, FastForward, Play, RefreshCw } from "lucide-react";
import mozartPuppet from "../assets/mozart-puppet.png";
import theaterProps from "../assets/theater-props.png";
import { Button } from "./Button";
import { Die } from "./Dice";
import { measureId, rollPair, type DicePair } from "../lib/music";
import { useDialogFocus } from "../lib/dialogFocus";

const scenes = [
  { title: "Before code, there was a pair of dice.", detail: "An eighteenth-century musical game, attributed to Mozart." },
  { title: "176 measures. Two dice. One little minuet.", detail: "Each throw chooses the next measure from a carefully arranged table." },
  { title: "Chance chooses. You compose.", detail: "Bob, the next performance is yours." },
];

export function Theater({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [started, setStarted] = useState(false); const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<"visible"|"exchange"|"closing">("visible"); const [dice, setDice] = useState<DicePair>([3,4]);
  const dialogRef = useRef<HTMLElement>(null); const closeTimer = useRef<number | null>(null); const exchangeTimer = useRef<number | null>(null);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const dismiss = useCallback(() => { try { localStorage.setItem("chance-music-intro", "seen"); } catch { /* blocked storage must not block composing */ } if (reduced()) { onClose(); return; } setPhase("closing"); if(closeTimer.current)window.clearTimeout(closeTimer.current);closeTimer.current=window.setTimeout(onClose,560); }, [onClose]);
  useDialogFocus(open, dialogRef, dismiss);
  useEffect(() => { if (!open) return; setStarted(false); setScene(0); setDice([3,4]); setPhase("visible"); return () => { if(closeTimer.current)window.clearTimeout(closeTimer.current);if(exchangeTimer.current)window.clearTimeout(exchangeTimer.current); }; }, [open]);
  const advance = useCallback(() => { if (scene >= 2) { dismiss(); return; } if (reduced()) { setScene((current) => current + 1); return; } setPhase("exchange"); if(exchangeTimer.current)window.clearTimeout(exchangeTimer.current);exchangeTimer.current=window.setTimeout(() => { setScene((current) => current + 1); setPhase("visible"); }, 520); }, [scene, dismiss]);
  useEffect(() => { if (!open || !started || reduced() || phase !== "visible") return; const timer=window.setTimeout(() => scene < 2 ? advance() : dismiss(),scene===1?4500:3800);return()=>window.clearTimeout(timer); }, [open,started,scene,phase,advance,dismiss]);
  if (!open) return null;
  const activeScene=scenes[scene]??scenes[0];if(!activeScene)return null;const total=dice[0]+dice[1];
  return <section ref={dialogRef} className={`theater-overlay theater-${phase}`} aria-label="A Little Chance Music introduction" aria-modal="true" role="dialog">
    <div className="theater-top"><img className="span-logo span-logo-inverse" src={spanLogo} alt="Span" width={110} height={26}/><Button autoFocus variant="ghost" onClick={dismiss}><FastForward size={15}/> Skip to composing</Button></div>
    <div className="proscenium" data-scene={started?scene:"closed"} data-phase={phase}><div className="curtain curtain-left"/><div className="curtain curtain-right"/><div className="stage-title"><span>A private paper theatre</span><b>A Little Chance Music</b></div>
      <img className="puppet mozart" src={mozartPuppet} alt="Engraved paper puppet of Mozart on a wooden stick" width={1024} height={1536}/><img className="puppet props" src={theaterProps} alt="Paper props: a keyboard, score, and dice on wooden sticks" width={1536} height={1024}/>
      {started&&scene===1&&<div className="intro-roll" aria-live="polite" aria-label={`Dice total ${total} selects measure ${measureId(0,total)}`}><span><Die value={dice[0]} small/><Die value={dice[1]} small/></span><b>{total} → {measureId(0,total)}</b><small>position 1</small><Button variant="ghost" onClick={()=>setDice(rollPair())}><RefreshCw size={14}/> Roll these dice</Button></div>}<div className="stage-floor"/>
      {!started?<div className="opening-copy"><p className="kicker">Composed for one listener</p><h1>A Little Chance Music</h1><p>A little chance music, for Bob Pisani.</p><div className="opening-actions"><Button onClick={()=>setStarted(true)}><Play size={15}/> Raise the curtain</Button><Button variant="outline" onClick={dismiss}>Start composing</Button></div></div>:<div className="caption-strip" key={scene}><span>Scene {scene+1} of 3</span><h2>{activeScene.title}</h2><p>{activeScene.detail}</p><Button variant="ghost" aria-label="Next scene" onClick={advance}>{scene<2?"Next":"Compose"}<ChevronRight size={16}/></Button></div>}
    </div>
  </section>;
}