import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Pause, Play } from "lucide-react";
import spanLogo from "../assets/span-logo.svg";
import mozart from "../assets/mozart-puppet.png";
import props from "../assets/theater-props.png";
import { LOOKUP_TABLE } from "../data/mozart";
import { useDialogFocus } from "../lib/dialogFocus";
import { Button } from "./Button";

const chapters = [
  { title: "A curious little invention.", copy: "In 1793, a musical dice game was published under Mozart’s name." },
  { title: "The music was already written.", copy: "176 short measures. A table of choices that fit together." },
  {
    title: "Chance would do the arranging.",
    copy: "Two dice choose each of sixteen measures. A new minuet, in moments.",
  },
];
function MusicSlip({ index }: { index: number }) {
  return (
    <span className="history-slip" style={{ "--slip": index } as React.CSSProperties}>
      <small>{String(index + 1).padStart(2, "0")}</small>
      <svg viewBox="0 0 84 62" aria-hidden="true">
        {[20, 26, 32, 38, 44].map((y) => (
          <path key={y} d={`M4 ${y}h76`} stroke="currentColor" strokeWidth=".5" />
        ))}
        {[18, 38, 62].map((x, i) => (
          <g key={x} transform={`translate(${x},${25 + ((index + i) % 4) * 6})`}>
            <ellipse rx="4" ry="3" fill="currentColor" transform="rotate(-18)" />
            <path d="M3 0v-20" stroke="currentColor" />
          </g>
        ))}
      </svg>
    </span>
  );
}
export function Theater({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [chapter, setChapter] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const transition = useRef<number | undefined>(undefined);
  const close = useCallback(() => {
    window.clearTimeout(transition.current);
    try {
      localStorage.setItem("chance-music-intro", "seen");
    } catch {}
    onClose();
  }, [onClose]);
  useDialogFocus(open, ref, close);
  useEffect(() => {
    if (!open) return;
    setChapter(0);
    setLeaving(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    setPaused(reduce);
    return () => window.clearTimeout(transition.current);
  }, [open]);
  const go = useCallback(
    (next: number) => {
      if (leaving) return;
      if (next > 2) {
        close();
        return;
      }
      if (reduced) {
        setChapter(next);
        return;
      }
      setLeaving(true);
      transition.current = window.setTimeout(() => {
        setChapter(next);
        setLeaving(false);
      }, 480);
    },
    [close, leaving, reduced],
  );
  useEffect(() => {
    if (!open || paused || leaving) return;
    const timer = window.setTimeout(() => go(chapter + 1), chapter === 0 ? 4800 : chapter === 1 ? 4500 : 5000);
    return () => window.clearTimeout(timer);
  }, [open, paused, leaving, chapter, go]);
  if (!open) return null;
  const scene = chapters[chapter]!;
  return (
    <section
      className="history-story"
      role="dialog"
      aria-modal="true"
      aria-label="The story of the musical dice game"
      ref={ref}
    >
      <header className="story-header">
        <img className="span-logo" src={spanLogo} alt="Span" />
        <span>A Little Chance Music</span>
        <Button autoFocus variant="ghost" onClick={close}>
          Skip story
          <ArrowRight />
        </Button>
      </header>
      <div className={`story-stage chapter-${chapter} ${leaving ? "scene-leaving" : ""}`}>
        <div className="story-curtain story-curtain-left" />
        <div className="story-curtain story-curtain-right" />
        <div className="history-set" key={chapter} aria-hidden="true">
          {chapter === 0 && (
            <>
              <img className="history-mozart" src={mozart} alt="" />
              <div className="history-book" style={{ backgroundImage: `url(${props})` }} />
              <div className="publication-card">
                <small>Musikalisches Würfelspiel</small>
                <strong>1793</strong>
                <span>A game of musical chance</span>
              </div>
              <div className="publisher-stamp">
                Published
                <br />
                under Mozart’s name
              </div>
            </>
          )}
          {chapter === 1 && (
            <>
              <div className="history-book" style={{ backgroundImage: `url(${props})` }} />
              <div className="history-table">
                <b>176</b>
                <span>MEASURES</span>
                <div>
                  {LOOKUP_TABLE.flat().map((id, i) => (
                    <i key={i}>{id}</i>
                  ))}
                </div>
              </div>
              <div className="loose-slips">
                {Array.from({ length: 4 }, (_, i) => (
                  <MusicSlip index={i} key={i} />
                ))}
              </div>
            </>
          )}
          {chapter === 2 && (
            <>
              <div className="history-piano" style={{ backgroundImage: `url(${props})` }} />
              <div className="assembled-slips">
                {Array.from({ length: 16 }, (_, i) => (
                  <MusicSlip index={i} key={i} />
                ))}
              </div>
              <div className="manuscript-title">Minuetto</div>
            </>
          )}
        </div>
        <div className="story-caption" key={`caption-${chapter}`}>
          <span className="kicker">{String(chapter + 1).padStart(2, "0")} / 03</span>
          <h1>{scene.title}</h1>
          <p>{scene.copy}</p>
        </div>
      </div>
      <div className="story-navigation">
        <Button
          variant="ghost"
          disabled={chapter === 0 || leaving}
          onClick={() => go(chapter - 1)}
          aria-label="Previous scene"
        >
          <ChevronLeft />
        </Button>
        <div className="chapter-progress" aria-label={`Scene ${chapter + 1} of 3`}>
          {chapters.map((_, i) => (
            <span key={i} className={i <= chapter ? "reached" : ""} />
          ))}
        </div>
        <Button variant="ghost" onClick={() => setPaused((v) => !v)} aria-label={paused ? "Play story" : "Pause story"}>
          {paused ? <Play /> : <Pause />}
        </Button>
        <Button variant="outline" disabled={leaving} onClick={() => go(chapter + 1)}>
          {chapter === 2 ? "Make your minuet" : "Next"}
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
