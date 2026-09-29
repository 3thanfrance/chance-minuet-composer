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
  setRoleLevel,
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
  PLAYER_INSTRUMENTS,
  type Arrangement,
  type PlayerInstrument,
  type Composition,
  type DicePair,
} from "../lib/music";

const SAVE_KEY = "chance-music-saves-v1";
const INSTRUMENT_NAMES: Record<PlayerInstrument, string> = {
  piano: "Grand piano",
  harpsichord: "Harpsichord",
  harp: "Harp",
  violin: "Violin",
  cello: "Cello",
  flute: "Flute",
  clarinet: "Clarinet",
};
const LAYERS = [
  { role: "melody", label: "Melody", detail: "The leading voice", choices: [...PLAYER_INSTRUMENTS] },
  {
    role: "accompaniment",
    label: "Accompaniment",
    detail: "The harmony underneath",
    choices: ["piano", "harpsichord", "harp"],
  },
  {
    role: "bass",
    label: "Bass",
    detail: "A little extra depth",
    choices: ["cello", "piano", "harpsichord", "harp", "clarinet"],
  },
] as const;
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
    async (target: Composition = current.current, fromProgress = 0) => {
      stop();
      setProgress(fromProgress);
      setPlayingBar(fromProgress > 0 ? Math.min(15, Math.floor(fromProgress * 16)) : null);
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
          fromProgress,
        );
      } catch {
        if (own === request.current) {
          setAudioState("error");
          setPlayingBar(null);
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
              }
            },
            350 + i * 140,
          ),
        );
    const settle = mode === "roll" ? 2850 : 350;
    timers.current.push(
      window.setTimeout(() => {
        if (own === request.current) setDisplayDice(next.dice[15] ?? [3, 4]);
      }, settle - 100),
    );
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
  const changeLayer = (role: "melody" | "accompaniment" | "bass", value: string) => {
    const a = arrangementFor(current.current);
    const index = role === "melody" ? 0 : role === "accompaniment" ? 1 : 2;
    const levels = [...a.levels] as [number, number, number];
    const muted = [...a.muted] as [boolean, boolean, boolean];
    if (value !== "none" && role === "bass" && a.bass === null) {
      levels[index] = 0.4;
      muted[index] = false;
    }
    const next = {
      ...current.current,
      arrangement: { ...a, [role]: value === "none" ? null : value, levels, muted },
    } as Composition;
    setComposition(next);
    current.current = next;
    if (busy) void play(next, progress);
    else if (value !== "none") void preloadInstrument(value as PlayerInstrument).catch(() => undefined);
  };
  const mixLayer = (index: number, level: number, muted: boolean) => {
    const a = arrangementFor(current.current);
    const levels = [...a.levels] as [number, number, number];
    const mutes = [...a.muted] as [boolean, boolean, boolean];
    levels[index] = level;
    mutes[index] = muted;
    const next = { ...current.current, arrangement: { ...a, levels, muted: mutes } };
    setComposition(next);
    current.current = next;
    setRoleLevel(LAYERS[index]!.role, level, muted);
  };
  const changeTempo = (tempo: number) => {
    const next = { ...current.current, tempo };
    setComposition(next);
    current.current = next;
    if (busy) void play(next, progress);
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
  const arrangement = arrangementFor(composition);
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
              Your turn, Bob.
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
            <div className="chance-paper">
              {mode === "roll" ? (
                <>
                  <DiceButton values={displayDice} rolling={rolling} onRoll={compose} label="Roll the dice" />
                  <div className={`roll-sequence ${rolling || revealing ? "visible" : ""}`} aria-hidden="true">
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
                      ? "Sixteen choices. One minuet, just for you."
                      : "One dice total for each measure."}
              </p>
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
            <span className="listen-caption">{playing ? "Follow the music." : "Make it sound like you."}</span>
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
          <div className="music-desk">
            <div className="music-pages">
              <div className="score-arrival">
                <Score
                  totals={composition.totals}
                  selected={selected}
                  playing={playingBar}
                  progress={progress}
                  onSelect={(position) => {
                    setSelected(position);
                    if (playing) void play(current.current, position / 16);
                  }}
                />
              </div>
              <section className="voice-layers" aria-label="Choose instruments for each layer">
                {LAYERS.map((layer, index) => {
                  const instrument = arrangement[layer.role];
                  const disabled = instrument === null;
                  return (
                    <div className={`voice-layer ${disabled ? "layer-off" : ""}`} key={layer.role}>
                      <div className="voice-label">
                        <span className="layer-roman">{["I", "II", "III"][index]}</span>
                        <div>
                          <label htmlFor={`voice-${layer.role}`}>{layer.label}</label>
                          <small>{layer.detail}</small>
                        </div>
                        <button
                          className="layer-mute"
                          aria-label={`${arrangement.muted[index] ? "Unmute" : "Mute"} ${layer.label.toLowerCase()}`}
                          aria-pressed={arrangement.muted[index]}
                          disabled={disabled}
                          onClick={() => mixLayer(index, arrangement.levels[index]!, !arrangement.muted[index])}
                        >
                          <Volume2 />
                          <span>{arrangement.muted[index] ? "Off" : "On"}</span>
                        </button>
                      </div>
                      <select
                        id={`voice-${layer.role}`}
                        aria-label={`${layer.label} instrument`}
                        value={instrument ?? "none"}
                        onChange={(e) => changeLayer(layer.role, e.target.value)}
                      >
                        {layer.role === "bass" && <option value="none">No added bass</option>}
                        {![...layer.choices].includes(instrument as never) && instrument && (
                          <option value={instrument}>{INSTRUMENT_NAMES[instrument]}</option>
                        )}
                        {layer.choices.map((v) => (
                          <option key={v} value={v}>
                            {INSTRUMENT_NAMES[v]}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`${layer.label} level`}
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        disabled={disabled}
                        value={arrangement.levels[index]}
                        onChange={(e) => mixLayer(index, Number(e.target.value), arrangement.muted[index]!)}
                      />
                    </div>
                  );
                })}
              </section>
            </div>
            <aside className="tempo-at-score">
              <span className="kicker">Set the pace</span>
              <Metronome tempo={composition.tempo} playing={playing} onChange={changeTempo} />
            </aside>
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
