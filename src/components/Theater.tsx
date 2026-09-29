import { useEffect, useState } from "react";
import { ChevronRight, FastForward, Play } from "lucide-react";
import mozartPuppet from "../assets/mozart-puppet.png";
import theaterProps from "../assets/theater-props.png";
import { Button } from "./Button";
import { Die } from "./Dice";

const scenes = [
  { title: "Before code, there was a pair of dice.", detail: "An eighteenth-century musical game, attributed to Mozart." },
  { title: "176 measures. Two dice. One little minuet.", detail: "Each throw chooses the next measure from a carefully arranged table." },
  { title: "Chance chooses. You compose.", detail: "Bob, the next performance is yours." },
];

export function Theater({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [started, setStarted] = useState(false); const [scene, setScene] = useState(0);
  useEffect(() => {
    if (!open || !started || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => scene < 2 ? setScene(scene + 1) : onClose(), scene === 1 ? 4500 : 3800);
    return () => window.clearTimeout(timer);
  }, [open, started, scene, onClose]);
  if (!open) return null;
  const activeScene = scenes[scene] ?? scenes[0];
  if (!activeScene) return null;
  const close = () => { localStorage.setItem("chance-music-intro", "seen"); onClose(); };
  return <section className="theater-overlay" aria-label="A Little Chance Music introduction" aria-modal="true" role="dialog">
    <div className="theater-top"><span className="wordmark">span</span><Button autoFocus variant="ghost" onClick={close}><FastForward size={15}/> Skip to composing</Button></div>
    <div className="proscenium" data-scene={started ? scene : "closed"}>
      <div className="curtain curtain-left"/><div className="curtain curtain-right"/>
      <div className="stage-title"><span>A private paper theatre</span><b>A Little Chance Music</b></div>
      <img className="puppet mozart" src={mozartPuppet} alt="Engraved paper puppet of Mozart on a wooden stick" width={1024} height={1536}/>
      <img className="puppet props" src={theaterProps} alt="Paper props: a keyboard, score, and dice on wooden sticks" width={1536} height={1024}/>
      {started && scene === 1 && <div className="intro-roll" aria-label="Dice total seven selects measure 104"><span><Die value={3} small/><Die value={4} small/></span><b>7 → 104</b><small>position 1</small></div>}
      <div className="stage-floor"/>
      {!started ? <div className="opening-copy"><p className="kicker">Composed for one listener</p><h1>A Little Chance Music</h1><p>A little chance music, for Bob Pisani.</p><div className="opening-actions"><Button onClick={() => setStarted(true)}><Play size={15}/> Raise the curtain</Button><Button variant="outline" onClick={close}>Start composing</Button></div></div>
      : <div className="caption-strip" key={scene}><span>Scene {scene + 1} of 3</span><h2>{activeScene.title}</h2><p>{activeScene.detail}</p><Button variant="ghost" aria-label="Next scene" onClick={() => scene < 2 ? setScene(scene + 1) : close()}>{scene < 2 ? "Next" : "Compose"}<ChevronRight size={16}/></Button></div>}
    </div>
  </section>;
}
