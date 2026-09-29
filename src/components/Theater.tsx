import { useCallback, useEffect, useRef, useState } from "react";
import spanLogo from "../assets/span-logo.svg";
import mozartPuppet from "../assets/mozart-puppet.png";
import { ChevronRight, FastForward, Play } from "lucide-react";
import { Button } from "./Button";
import { Die } from "./Dice";
import { measureId, rollPair, type DicePair } from "../lib/music";
import { preloadInstrument, unlockAudio } from "../lib/audio";
import { useDialogFocus } from "../lib/dialogFocus";

const scenes = [
  {
    title: "A shortcut from blank page to minuet.",
    detail: "In 1793, a dice game published under Mozart’s name offered just that.",
  },
  { title: "Two dice choose a measure.", detail: "Sixteen choices become a minuet." },
  { title: "The structure holds.", detail: "The possibilities change." },
  { title: "Bob, your turn.", detail: "Give chance a turn, then choose who plays." },
];

function KeyboardCutout() {
  return (
    <svg className="cutout keyboard-cutout" viewBox="0 0 320 190" aria-label="Engraved keyboard cutout">
      <path className="paper" d="M20 35 285 18l18 125-270 28z" />
      <path className="ink" d="M32 54 285 38v84L42 143zM43 72l233-14M45 91l230-12M48 111l225-10" />
      <g className="keys">
        {Array.from({ length: 15 }, (_, i) => (
          <path key={i} d={`M${48 + i * 15} 111v30`} />
        ))}
      </g>
      <path className="stick" d="M169 150v85" />
    </svg>
  );
}
function ViolinCutout() {
  return (
    <svg className="cutout violin-cutout" viewBox="0 0 170 300" aria-label="Engraved violin and bow cutout">
      <path
        className="paper"
        d="M77 20c23 2 27 24 15 42l-4 34c30 8 35 34 16 51 19 20 10 48-19 55l-6 58H52l-2-58c-30-7-38-36-18-55-20-18-13-45 17-52l-5-34C33 43 39 23 62 20z"
      />
      <path
        className="ink"
        d="M69 21v230M59 71h20M47 106c23 11 44 5 52-7M46 184c21-10 42-5 57 6M54 136c7 7 9 16 0 25M89 135c-8 7-9 16-1 25M118 38l30 198"
      />
      <path className="stick" d="M65 250v70" />
    </svg>
  );
}
function FluteCutout() {
  return (
    <svg className="cutout flute-cutout" viewBox="0 0 330 110" aria-label="Engraved flute cutout">
      <path className="paper" d="m18 33 282-10 8 48L22 82z" />
      <path className="ink" d="m35 56 250-9M52 43v26M278 35v25" />
      {[90, 125, 160, 195, 230].map((x) => (
        <circle className="hole" key={x} cx={x} cy={52} r="5" />
      ))}
      <path className="stick" d="M170 70v92" />
    </svg>
  );
}
function HandDiceTable({
  dice,
  rolling,
  onRoll,
  total,
}: {
  dice: DicePair;
  rolling: boolean;
  onRoll: () => void;
  total: number;
}) {
  return (
    <div className="scene-two-art">
      <svg className="cutout hand-cutout" viewBox="0 0 310 210" aria-label="Engraved hand throwing dice">
        <path
          className="paper"
          d="M12 132c31-28 59-51 94-57l45-61c8-11 27 1 19 14l-28 47 60-51c13-10 28 8 16 19l-48 43 57-30c14-7 25 14 11 22l-59 35c41-2 61 10 87 35l-30 54c-57-28-111-24-166-5z"
        />
        <path
          className="ink"
          d="M29 137c57-19 93-36 124-66M104 76l37 16M151 51l34 24M173 84l34 21M61 168c61-26 117-26 171 9"
        />
        <path className="stick" d="M220 182l34 70" />
      </svg>
      <button className="theater-dice" onClick={onRoll} aria-label="Roll the theater dice">
        <Die value={dice[0]} small rolling={rolling} />
        <Die value={dice[1]} small rolling={rolling} index={1} />
      </button>
      <div className="lookup-prop">
        <b>11 × 16</b>
        <span>
          {Array.from({ length: 176 }, (_, i) => (
            <i className={i === (total - 2) * 16 ? "chosen" : ""} key={i} />
          ))}
        </span>
        <strong>
          {total} → measure {measureId(0, total)}
        </strong>
      </div>
    </div>
  );
}
function ScoreStrips() {
  return (
    <div className="engraved-strips" aria-label="Assembling strips of engraved music">
      <svg viewBox="0 0 520 120">
        <path className="paper" d="M8 9h500v95L4 113z" />
        {[30, 42, 54, 66, 78].map((y) => (
          <path className="ink" key={y} d={`M20 ${y}h474`} />
        ))}
        {[55, 88, 132, 177, 224, 267, 312, 358, 402, 450].map((x, i) => (
          <g key={x} transform={`translate(${x} ${i % 2 ? 48 : 61})`}>
            <ellipse className="note" rx="6" ry="4" />
            <path className="ink" d="M5 0v-24" />
          </g>
        ))}
      </svg>
    </div>
  );
}
function SceneArt({
  scene,
  dice,
  rolling,
  onRoll,
  total,
}: {
  scene: number;
  dice: DicePair;
  rolling: boolean;
  onRoll: () => void;
  total: number;
}) {
  if (scene === 0)
    return (
      <div className="scene-group scene-publication">
        <div className="vienna-placard">
          <small>VIENNA</small>
          <strong>1793</strong>
          <span>Musikalisches Würfelspiel</span>
        </div>
        <img className="mozart-engraving" src={mozartPuppet} alt="Engraved paper puppet of Mozart" />
        <div className="writing-desk">
          <svg viewBox="0 0 360 150" aria-label="Writing desk and manuscript">
            <path className="paper" d="M10 40h335l-12 85H22z" />
            <path className="ink" d="M22 55h310M48 72h180M48 85h215M48 98h145" />
          </svg>
          <i className="quill-arm">
            <span />
          </i>
          <b className="desk-stick" />
        </div>
      </div>
    );
  if (scene === 1)
    return (
      <div className="scene-group scene-selection">
        <HandDiceTable dice={dice} rolling={rolling} onRoll={onRoll} total={total} />
      </div>
    );
  if (scene === 2)
    return (
      <div className="scene-group scene-players">
        <KeyboardCutout />
        <ViolinCutout />
        <FluteCutout />
        <ScoreStrips />
      </div>
    );
  return (
    <div className="scene-group scene-takeover">
      <div className="takeover-dice">
        <Die value={dice[0]} rolling={rolling} />
        <Die value={dice[1]} rolling={rolling} index={1} />
      </div>
      <span className="takeover-stick" />
    </div>
  );
}

export function Theater({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [started, setStarted] = useState(false);
  const [scene, setScene] = useState(0);
  const [phase, setPhase] = useState<"visible" | "exchange" | "closing">("visible");
  const [dice, setDice] = useState<DicePair>([3, 4]);
  const [rolling, setRolling] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const dismiss = useCallback(() => {
    try {
      localStorage.setItem("chance-music-intro", "seen");
    } catch {
      /* composing remains available */
    }
    clear();
    if (reduced()) {
      onClose();
      return;
    }
    setPhase("closing");
    timers.current.push(window.setTimeout(onClose, 580));
  }, [onClose]);
  useDialogFocus(open, ref, dismiss);
  useEffect(() => {
    if (!open) return;
    clear();
    setStarted(false);
    setScene(0);
    setDice([3, 4]);
    setRolling(false);
    setPhase("visible");
    return clear;
  }, [open]);
  const advance = useCallback(() => {
    if (scene >= 3) {
      dismiss();
      return;
    }
    if (reduced()) {
      setScene((s) => s + 1);
      return;
    }
    setPhase("exchange");
    clear();
    timers.current.push(
      window.setTimeout(() => {
        setScene((s) => s + 1);
        setPhase("visible");
      }, 520),
    );
  }, [scene, dismiss]);
  useEffect(() => {
    if (!open || !started || reduced() || phase !== "visible") return;
    const timer = window.setTimeout(
      () => (scene < 3 ? advance() : dismiss()),
      scene === 0 ? 4000 : scene === 1 ? 4500 : 3500,
    );
    return () => window.clearTimeout(timer);
  }, [open, started, scene, phase, advance, dismiss]);
  const throwDice = () => {
    if (rolling) return;
    setRolling(true);
    const next = rollPair();
    timers.current.push(
      window.setTimeout(() => {
        setDice(next);
        setRolling(false);
      }, 1150),
    );
  };
  if (!open) return null;
  const active = scenes[scene] ?? scenes[0];
  if (!active) return null;
  const total = dice[0] + dice[1];
  return (
    <section
      ref={ref}
      className={`theater-overlay theater-${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label="A Little Chance Music introduction"
    >
      <div className="theater-top">
        <img className="span-logo span-logo-inverse" src={spanLogo} alt="Span" />
        <Button autoFocus variant="ghost" onClick={dismiss}>
          <FastForward /> Skip to composing
        </Button>
      </div>
      <div className="proscenium" data-scene={started ? scene : "closed"} data-phase={phase}>
        <div className="curtain curtain-left" />
        <div className="curtain curtain-right" />
        <div className="stage-title">
          <span>A private paper theatre</span>
          <b>A Little Chance Music</b>
        </div>
        {started && (
          <div className="stage-world">
            <SceneArt scene={scene} dice={dice} rolling={rolling} onRoll={throwDice} total={total} />
          </div>
        )}
        <div className="stage-floor" />
        {!started ? (
          <div className="opening-copy">
            <p className="kicker">Composed for one listener</p>
            <h1>A Little Chance Music</h1>
            <p>A little chance music, for Bob Pisani.</p>
            <div className="opening-actions">
              <Button
                onClick={() => {
                  void unlockAudio().catch(() => undefined);
                  void preloadInstrument("piano").catch(() => undefined);
                  setStarted(true);
                }}
              >
                <Play /> Raise the curtain
              </Button>
              <Button variant="outline" onClick={dismiss}>
                Start composing
              </Button>
            </div>
          </div>
        ) : (
          <div className="caption-strip" key={scene}>
            <span>Scene {scene + 1} of 4</span>
            <h2>{active.title}</h2>
            <p>{active.detail}</p>
            {scene === 1 && (
              <button className="scene-roll" onClick={throwDice} disabled={rolling}>
                Roll the dice · {total} → measure {measureId(0, total)}
              </button>
            )}
            <Button variant="ghost" onClick={advance}>
              {scene < 3 ? "Next" : "Compose"}
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
