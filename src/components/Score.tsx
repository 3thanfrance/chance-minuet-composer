import { memo, useEffect, useRef } from "react";
import { MEASURES } from "../data/mozart";
import { eventDuration, measureId } from "../lib/music";
import { eventDenominator, flagCount, ledgerLineYs, pitchAccidental, staffPitchY } from "../lib/notation";

function RestSymbol({ x, y, denominator }: { x: number; y: number; denominator: number }) {
  if (denominator <= 4)
    return (
      <g className="rest-symbol" data-rest-duration={denominator}>
        <path d={`M ${x - 3} ${y - 8} l 5 5 -4 4 5 5 -3 6 -1-1 2-5 -6-6 5-5 -4-4 z`} />
      </g>
    );
  const tails = denominator >= 16 ? 2 : 1;
  return (
    <g className="rest-symbol" data-rest-duration={denominator}>
      <path d={`M ${x + 3} ${y - 10} q -1 10 -7 18`} />
      {Array.from({ length: tails }, (_, i) => (
        <g key={i}>
          <circle cx={x + 1} cy={y - 7 + i * 5} r="2.1" />
          <path d={`M ${x + 1} ${y - 6 + i * 5} q 5 1 2 7`} />
        </g>
      ))}
    </g>
  );
}

const BarNotation = memo(function BarNotation({ position, total }: { position: number; total: number }) {
  const measure = MEASURES[measureId(position, total)];
  if (!measure) return null;
  const glyphs: React.ReactNode[] = [];
  for (const staff of ["treble", "bass"] as const) {
    let cursor = 0;
    measure[staff].forEach((event, index) => {
      const duration = eventDuration(event);
      const denominator = eventDenominator(event);
      const first = event[0];
      const x = 18 + cursor * 34;
      if (typeof first === "number")
        glyphs.push(
          <RestSymbol key={`${staff}-${index}`} x={x} y={staff === "treble" ? 29 : 79} denominator={denominator} />,
        );
      else {
        const pitches = Array.isArray(first) ? first : [first];
        const ys = pitches.map((pitch) => staffPitchY(pitch, staff));
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const stemUp = maxY > 28 + (staff === "bass" ? 50 : 0);
        const stemX = x + (stemUp ? 3.5 : -3.5);
        const stemStart = stemUp ? maxY : minY;
        const stemEnd = stemUp ? minY - 17 : maxY + 17;
        const flags = flagCount(denominator);
        const ledgers = [...new Set(ys.flatMap((y) => ledgerLineYs(y, staff)))];
        glyphs.push(
          <g key={`${staff}-${index}`} data-note-duration={denominator} data-chord-size={pitches.length}>
            {ledgers.map((y) => (
              <line key={y} className="ledger-line" x1={x - 6} y1={y} x2={x + 7} y2={y} />
            ))}
            {pitches.map((pitch, pitchIndex) => {
              const y = ys[pitchIndex] ?? 38;
              const accidental = pitchAccidental(pitch);
              return (
                <g key={pitchIndex} data-pitch={pitch}>
                  <ellipse cx={x} cy={y} rx="4" ry="3" transform={`rotate(-18 ${x} ${y})`} />
                  {accidental === "#" && (
                    <text x={x - 10} y={y + 4} className="accidental">
                      ♯
                    </text>
                  )}
                  {accidental === "b" && (
                    <text x={x - 10} y={y + 4} className="accidental">
                      ♭
                    </text>
                  )}
                </g>
              );
            })}
            <line className="note-stem" x1={stemX} y1={stemStart} x2={stemX} y2={stemEnd} />
            {Array.from({ length: flags }, (_, flag) => (
              <path
                key={flag}
                className="note-flag"
                d={
                  stemUp
                    ? `M ${stemX} ${stemEnd + flag * 5} q 8 3 7 10`
                    : `M ${stemX} ${stemEnd - flag * 5} q -8 -3 -7 -10`
                }
              />
            ))}
          </g>,
        );
      }
      cursor += duration;
    });
  }
  return <g className="notes">{glyphs}</g>;
});

export function Score({
  totals,
  selected,
  playing,
  progress = 0,
  onSelect,
}: {
  totals: number[];
  selected: number;
  playing: number | null;
  progress?: number;
  onSelect: (position: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const position = Math.min(15.9999, Math.max(0, progress) * 16);
  const row = Math.floor(position / 8);
  const bar = Math.floor(position) % 8;
  const fraction = position % 1;
  const playheadX = 54 + bar * 128 + 18 + fraction * 102;
  useEffect(() => {
    const el = scrollRef.current;
    if (playing === null || !el || el.scrollWidth <= el.clientWidth) return;
    const x = ((54 + (playing % 8) * 128 + 18) * el.scrollWidth) / 1100;
    el.scrollTo({
      left: Math.max(0, x - el.clientWidth * 0.35),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [playing]);
  return (
    <div className="continuous-score" aria-label="Sixteen-bar generated musical score">
      <div className="score-heading">
        <span>Minuetto</span>
        <span>3/8 · two phrases</span>
      </div>
      <div className="staff-scroll" ref={scrollRef}>
        <svg
          className="continuous-manuscript"
          viewBox="0 0 1100 306"
          role="group"
          aria-label="Two connected systems of music"
        >
          {[0, 1].map((system) => (
            <g key={system} transform={`translate(0,${26 + system * 146})`}>
              <g className="staff-lines">
                {[18, 23, 28, 33, 38, 68, 73, 78, 83, 88].map((y) => (
                  <line key={y} x1="13" y1={y} x2="1082" y2={y} />
                ))}
              </g>
              <path d="M12 18v70M8 18q-10 16-4 31t0 39" fill="none" stroke="currentColor" strokeWidth="1.2" />
              <text x="18" y="36" className="clef">
                𝄞
              </text>
              <text x="19" y="85" className="clef bass-clef">
                𝄢
              </text>
              {system === 0 && (
                <g className="time-signature">
                  <text x="44" y="27">
                    3
                  </text>
                  <text x="44" y="38">
                    8
                  </text>
                  <text x="44" y="77">
                    3
                  </text>
                  <text x="44" y="88">
                    8
                  </text>
                </g>
              )}
              {totals.slice(system * 8, system * 8 + 8).map((total, index) => {
                const n = system * 8 + index;
                return (
                  <g
                    key={n}
                    transform={`translate(${54 + index * 128},0)`}
                    className={`engraved-measure ${selected === n ? "selected" : ""} ${playing === n ? "sounding" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Bar ${n + 1}, dice total ${total}, source measure ${measureId(n, total)}`}
                    onClick={() => onSelect(n)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(n);
                      }
                    }}
                  >
                    <rect className="measure-hit" x="0" y="-2" width="128" height="112" />
                    <text className="measure-number" x="8" y="6">
                      {n + 1}
                    </text>
                    <BarNotation position={n} total={total} />
                    <path className="musical-barline" d="M128 18v70" />
                  </g>
                );
              })}
              <path d="M1081 18v70" stroke="currentColor" strokeWidth={system === 1 ? 3 : 1} />
            </g>
          ))}
          {playing !== null && (
            <g className="score-playhead" transform={`translate(0,${26 + row * 146})`} aria-hidden="true">
              <g style={{ transform: `translateX(${playheadX}px)` }}>
                <rect x="-11" y="10" width="22" height="88" fill="url(#playhead-wash)" />
                <path d="M0 11v86" stroke="#8f4033" strokeWidth="1.7" />
                <path d="m-4 6 4 5 4-5Z" fill="#8f4033" />
              </g>
            </g>
          )}
          <defs>
            <linearGradient id="playhead-wash">
              <stop stopColor="#a65e43" stopOpacity="0" />
              <stop offset=".5" stopColor="#a65e43" stopOpacity=".16" />
              <stop offset="1" stopColor="#a65e43" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="score-bottom">
        <span>Composed by chance. Made yours by ear.</span>
        <span>{playing !== null ? `Playing · measure ${playing + 1} of 16` : "Sixteen measures · one minuet"}</span>
      </div>
    </div>
  );
}
