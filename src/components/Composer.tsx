import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FolderOpen,
  HelpCircle,
  Play,
  Save,
  Share2,
  Square,
  Volume2,
} from "lucide-react";
import spanLogo from "../assets/span-logo.svg";
import { About, RollPath } from "./About";
import { Button } from "./Button";
import { DiceButton } from "./Dice";
import { Metronome } from "./Metronome";
import { Score } from "./Score";
import { SavedDrawer, type SavedMinuet } from "./SavedDrawer";
import {
  disposeAudio,
  playComposition,
  preloadInstrument,
  renderCompositionWav,
  setAudioLevel,
  stopAudio,
  unlockAudio,
  type AudioLoadState,
} from "../lib/audio";
import {
  ARRANGEMENTS,
  arrangementFor,
  DEFAULT_TOTALS,
  decodeShare,
  diceForTotal,
  encodeShare,
  isValidComposition,
  measureId,
  rollComposition,
  type Arrangement,
  type Composition,
  type DicePair,
} from "../lib/music";

const SAVE_KEY = "chance-music-saves-v1";
const SOUNDS = [
  { id: "piano", label: "Grand piano", arrangement: ARRANGEMENTS["solo-piano"] },
  { id: "harpsichord", label: "Harpsichord", arrangement: ARRANGEMENTS["solo-harpsichord"] },
  { id: "harp", label: "Harp", arrangement: ARRANGEMENTS["solo-harp"] },
  {
    id: "violin",
    label: "Violin & harpsichord",
    arrangement: { ...ARRANGEMENTS.chamber, bass: null, levels: [0.9, 0.7, 0], muted: [false, false, true] },
  },
  {
    id: "flute",
    label: "Flute & harp",
    arrangement: { ...ARRANGEMENTS.air, bass: null, levels: [0.88, 0.72, 0], muted: [false, false, true] },
  },
  { id: "clarinet", label: "Clarinet & piano", arrangement: ARRANGEMENTS.woodwinds },
  { id: "strings", label: "Violin, cello & piano", arrangement: { ...ARRANGEMENTS.chamber, accompaniment: "piano" } },
] satisfies { id: string; label: string; arrangement: Arrangement }[];
function soundFor(c: Composition) {
  const a = arrangementFor(c);
  return (
    SOUNDS.find(
      (s) =>
        s.arrangement.melody === a.melody &&
        s.arrangement.accompaniment === a.accompaniment &&
        s.arrangement.bass === a.bass,
    )?.id ?? "custom"
  );
}
function initialComposition(): Composition {
  return {
    totals: [...DEFAULT_TOTALS],
    dice: DEFAULT_TOTALS.map(diceForTotal),
    instrument: "piano",
    tempo: 120,
    arrangement: ARRANGEMENTS["solo-piano"],
  };
}
function readSaves(): SavedMinuet[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(SAVE_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter(
          (c): c is SavedMinuet =>
            isValidComposition(c) &&
            typeof (c as SavedMinuet).id === "string" &&
            typeof (c as SavedMinuet).name === "string" &&
            Number.isFinite((c as SavedMinuet).savedAt),
        )
      : [];
  } catch {
    return [];
  }
}

export function Composer({ onReplay }: { onReplay: () => void }) {
  const [composition, setComposition] = useState<Composition>(initialComposition);
  const current = useRef(composition);
  current.current = composition;
  const [screen, setScreen] = useState<"roll" | "result">("roll");
  const [mode, setMode] = useState<"roll" | "choose">("roll");
  const [rolling, setRolling] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [displayDice, setDisplayDice] = useState<DicePair>([3, 4]);
  const [selected, setSelected] = useState(0);
  const [playingBar, setPlayingBar] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioState, setAudioState] = useState<AudioLoadState>("idle");
  const [volume, setVolume] = useState(0.76);
  const [progress, setProgress] = useState(0);
  const [about, setAbout] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saves, setSaves] = useState<SavedMinuet[]>([]);
  const [name, setName] = useState("Bob’s minuet");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const timers = useRef<number[]>([]);
  const request = useRef(0);
  const exportRequest = useRef(0);
  const mounted = useRef(true);
  const stop = useCallback(() => {
    request.current++;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    stopAudio();
    setRolling(false);
    setRevealing(false);
    setPlaying(false);
    setPlayingBar(null);
    setProgress(0);
    setAudioState("idle");
  }, []);
  useEffect(() => {
    mounted.current = true;
    setSaves(readSaves());
    const shared = decodeShare(new URLSearchParams(location.search).get("m"));
    if (shared) {
      setComposition(shared);
      setScreen("result");
    }
    void preloadInstrument("piano").catch(() => undefined);
    return () => {
      mounted.current = false;
      request.current++;
      exportRequest.current++;
      timers.current.forEach(clearTimeout);
      disposeAudio();
    };
  }, []);
  useEffect(() => setAudioLevel(volume, false), [volume]);
  const play = useCallback(
    async (target: Composition = current.current) => {
      stop();
      const own = ++request.current;
      setStatus("");
      try {
        await playComposition(
          target,
          volume,
          (bar, p) => {
            if (own === request.current) {
              setPlayingBar(bar);
              setProgress(p);
            }
          },
          () => {
            if (own === request.current) {
              setPlaying(false);
              setPlayingBar(null);
              setProgress(0);
            }
          },
          (state) => {
            if (own === request.current) setAudioState(state);
          },
          () => {
            if (own === request.current) setPlaying(true);
          },
        );
      } catch {
        if (own === request.current) {
          setAudioState("error");
          setStatus("Couldn’t load the sound. Try Play again.");
        }
      }
    },
    [stop, volume],
  );
  const showResult = (next: Composition) => {
    setComposition(next);
    current.current = next;
    setSelected(0);
    setScreen("result");
    setRolling(false);
    setRevealing(false);
    setRollCount(0);
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById("result-title")?.focus());
    void play(next);
  };
  const compose = () => {
    if (rolling || revealing) return;
    void unlockAudio().catch(() => undefined);
    stop();
    setStatus("");
    const own = ++request.current;
    const next = mode === "roll" ? { ...current.current, ...rollComposition() } : current.current;
    setRollCount(0);
    setRolling(true);
    setComposition(next);
    current.current = next;
    if (mode === "roll")
      for (let i = 0; i < 16; i++)
        timers.current.push(
          window.setTimeout(
            () => {
              if (own === request.current) {
                setRollCount(i + 1);
                setDisplayDice(next.dice[i] ?? [3, 4]);
              }
            },
            350 + i * 155,
          ),
        );
    const settle = mode === "roll" ? 2950 : 350;
    timers.current.push(
      window.setTimeout(() => {
        if (own === request.current) {
          setRolling(false);
          setRevealing(true);
        }
      }, settle),
      window.setTimeout(() => {
        if (own === request.current) showResult(next);
      }, settle + 650),
    );
  };
  const changeSound = (id: string) => {
    const sound = SOUNDS.find((s) => s.id === id);
    if (!sound) return;
    const next = { ...current.current, arrangement: sound.arrangement };
    setComposition(next);
    current.current = next;
    void play(next);
  };
  const save = () => {
    const nextName = window.prompt("Name your minuet", name)?.trim();
    if (nextName === undefined) return;
    const title = nextName || "Bob’s minuet";
    const next = [{ ...current.current, id: crypto.randomUUID(), name: title, savedAt: Date.now() }, ...saves];
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaves(next);
      setName(title);
      setStatus("Saved.");
    } catch {
      setStatus("This browser couldn’t save your minuet.");
    }
  };
  const persist = (next: SavedMinuet[]) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(next));
      setSaves(next);
    } catch {
      setStatus("This browser couldn’t update your saved music.");
    }
  };
  const share = async () => {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("m", encodeShare(current.current));
    try {
      await navigator.clipboard.writeText(url.toString());
      setStatus("Link copied.");
    } catch {
      window.prompt("Copy your minuet’s link", url.toString());
    }
  };
  const download = async (target: Composition = current.current, title = name) => {
    if (exporting) return;
    const own = ++exportRequest.current;
    setExporting(true);
    setStatus("");
    try {
      const wav = await renderCompositionWav(target);
      if (!mounted.current || own !== exportRequest.current) return;
      const url = URL.createObjectURL(wav);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "minuet"}.wav`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus("WAV downloaded.");
    } catch {
      if (mounted.current) setStatus("Couldn’t export the audio. Please try again.");
    } finally {
      if (mounted.current && own === exportRequest.current) setExporting(false);
    }
  };
  const back = () => {
    stop();
    setScreen("roll");
    setStatus("");
    window.scrollTo({ top: 0 });
    requestAnimationFrame(() => document.getElementById("roll-title")?.focus());
  };
  const busy = playing || audioState === "loading";
  return (
    <main className={`chance-app ${screen === "roll" ? "at-table" : "at-score"}`} id="composer" tabIndex={-1}>
      <header className="chance-header">
        <a href="https://www.span.app/" target="_blank" rel="noreferrer" aria-label="Span website">
          <img className="span-logo" src={spanLogo} alt="Span" />
        </a>
        <span className="for-bob">A little chance music · for Bob Pisani</span>
        <nav>
          <Button variant="ghost" onClick={() => setSavedOpen(true)}>
            <FolderOpen />
            Saved
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              stop();
              onReplay();
            }}
          >
            The story
          </Button>
          <Button variant="ghost" onClick={() => setAbout(true)} aria-label="About the music">
            <HelpCircle />
          </Button>
        </nav>
      </header>
      {screen === "roll" ? (
        <section
          className={`chance-room ${rolling ? "is-rolling" : ""} ${revealing ? "is-revealing" : ""}`}
          aria-label="Compose a minuet"
        >
          <div className="room-heading">
            <p className="kicker">A Little Chance Music</p>
            <h1 id="roll-title" tabIndex={-1}>
              Let chance compose.
            </h1>
          </div>
          <div className="mode-switch" role="tablist" aria-label="Composition method">
            <button
              role="tab"
              aria-selected={mode === "roll"}
              disabled={rolling || revealing}
              onClick={() => setMode("roll")}
            >
              Roll the dice
            </button>
            <button
              role="tab"
              aria-selected={mode === "choose"}
              disabled={rolling || revealing}
              onClick={() => setMode("choose")}
            >
              Choose the numbers
            </button>
          </div>
          <div className="chance-table">
            <div className="felt-stage">
              <div className="felt-border" />
              {mode === "roll" ? (
                <>
                  <DiceButton values={displayDice} rolling={rolling} onRoll={compose} label="Roll your minuet" />
                  <div className="roll-sequence" aria-hidden="true">
                    {Array.from({ length: 16 }, (_, i) => (
                      <span className={i < rollCount ? "arrived" : ""} key={i}>
                        {i < rollCount ? composition.totals[i] : "·"}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="choose-panel">
                  <div className="choose-grid">
                    {composition.totals.map((total, i) => (
                      <label key={i}>
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <select
                          aria-label={`Dice total for bar ${i + 1}`}
                          value={total}
                          disabled={rolling || revealing}
                          onChange={(e) => {
                            const n = Number(e.target.value);
                            setComposition((c) => ({
                              ...c,
                              totals: c.totals.map((v, j) => (j === i ? n : v)),
                              dice: c.dice.map((v, j) => (j === i ? diceForTotal(n) : v)),
                            }));
                          }}
                        >
                          {Array.from({ length: 11 }, (_, j) => (
                            <option key={j} value={j + 2}>
                              {j + 2}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <Button onClick={compose} disabled={rolling || revealing}>
                    Make your minuet
                    <ArrowRight />
                  </Button>
                </div>
              )}
              <p className="roll-caption" role="status">
                {revealing
                  ? "Your minuet awaits…"
                  : rolling
                    ? `Choosing measure ${Math.max(1, rollCount)} of 16`
                    : mode === "roll"
                      ? "Two dice. Sixteen measures. Yours."
                      : "One dice total for each measure."}
              </p>
            </div>
            <div className="tempo-station">
              <Metronome
                tempo={composition.tempo}
                playing={rolling}
                onChange={(tempo) => {
                  if (!rolling && !revealing) setComposition((c) => ({ ...c, tempo }));
                }}
              />
              <span>Slide the weight</span>
            </div>
          </div>
          {(rolling || revealing) && (
            <Button variant="ghost" className="cancel-roll" onClick={stop}>
              Cancel
            </Button>
          )}
          <div className="page-turn" aria-hidden="true">
            <span>Minuetto</span>
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </section>
      ) : (
        <section className="minuet-page" aria-labelledby="result-title">
          <div className="result-topline">
            <Button variant="ghost" onClick={back}>
              <ArrowLeft />
              Back to the dice
            </Button>
            <span className="kicker">Sixteen choices, one composition</span>
          </div>
          <div className="result-heading">
            <div>
              <p className="kicker">A Little Chance Music</p>
              <h1 id="result-title" tabIndex={-1}>
                Your minuet.
              </h1>
            </div>
            <div className="piece-actions">
              <Button variant="ghost" onClick={save}>
                <Save />
                Save
              </Button>
              <Button variant="ghost" onClick={() => void share()}>
                <Share2 />
                Share
              </Button>
              <Button variant="outline" disabled={exporting} onClick={() => void download()}>
                <Download />
                {exporting ? "Preparing WAV…" : "Download WAV"}
              </Button>
            </div>
          </div>
          <div className="listening-bar">
            <Button onClick={() => (busy ? stop() : void play())}>
              {busy ? <Square /> : <Play />}
              {audioState === "loading" ? "Cancel loading" : playing ? "Stop" : "Play"}
            </Button>
            <label className="sound-choice">
              <span>Sound</span>
              <select
                aria-label="Instrument"
                value={soundFor(composition)}
                onChange={(e) => changeSound(e.target.value)}
              >
                {soundFor(composition) === "custom" && <option value="custom">Saved arrangement</option>}
                {SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <span className="piece-tempo">♪ {composition.tempo}</span>
            <label className="listening-volume">
              <Volume2 />
              <input
                aria-label="Volume"
                type="range"
                min="0"
                max="1"
                step=".05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
              />
            </label>
            <div
              className="piece-progress"
              role="progressbar"
              aria-label="Playback"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
          {status && (
            <p className="piece-status" role="status">
              {status}
            </p>
          )}
          <div className="score-arrival">
            <Score totals={composition.totals} selected={selected} playing={playingBar} onSelect={setSelected} />
          </div>
          <section className="your-path">
            <div className="path-title">
              <h2>The path of your minuet</h2>
              <span>
                Bar {(playingBar ?? selected) + 1} <b>·</b> Roll {composition.totals[playingBar ?? selected]}{" "}
                <ArrowRight /> Measure{" "}
                {measureId(playingBar ?? selected, composition.totals[playingBar ?? selected] ?? 7)}
              </span>
            </div>
            <RollPath totals={composition.totals} active={playingBar ?? selected} onSelect={setSelected} />
          </section>
        </section>
      )}
      <footer className="chance-footer">
        <span>Good systems give time back.</span>
        <a href="https://www.span.app/platform/src" target="_blank" rel="noreferrer">
          Meet Src by Span
          <ArrowRight />
        </a>
      </footer>
      <About open={about} onClose={() => setAbout(false)} totals={composition.totals} />
      <SavedDrawer
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        saves={saves}
        onLoad={(item) => {
          stop();
          setComposition(item);
          current.current = item;
          setName(item.name);
          setScreen("result");
          setStatus("");
        }}
        onRename={(item) => {
          const title = window.prompt("Rename your minuet", item.name)?.trim();
          if (title) persist(saves.map((s) => (s.id === item.id ? { ...s, name: title } : s)));
        }}
        onDelete={(item) => {
          if (confirm(`Delete “${item.name}”?`)) persist(saves.filter((s) => s.id !== item.id));
        }}
        onDownload={(item) => void download(item, item.name)}
      />
    </main>
  );
}
