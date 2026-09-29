import { MEASURES } from "../data/mozart";
import { eventDuration, measureId, midiToY, pitchToMidi } from "../lib/music";

function BarNotation({ position, total }: { position: number; total: number }) {
  const measure = MEASURES[measureId(position, total)];
  if (!measure) return null;
  const glyphs: React.ReactNode[] = [];
  for (const [staffIndex, staff] of (["treble", "bass"] as const).entries()) {
    let cursor = 0;
    measure[staff].forEach((event, index) => {
      const duration = eventDuration(event); const first = event[0]; const x = 18 + cursor * 24; const base = staffIndex ? 76 : 27;
      if (typeof first === "number") glyphs.push(<text key={`${staff}-${index}`} x={x} y={base + 4} className="rest-glyph">𝄽</text>);
      else {
        const pitches = Array.isArray(first) ? first : [first];
        pitches.forEach((pitch, pitchIndex) => {
          const y = base + midiToY(pitchToMidi(pitch), staff) * .42;
          glyphs.push(<g key={`${staff}-${index}-${pitchIndex}`}><ellipse cx={x} cy={y} rx="4" ry="3" transform={`rotate(-18 ${x} ${y})`}/>{duration <= 1.5 && <line x1={x + 3.5} y1={y} x2={x + 3.5} y2={y - 16}/>} {pitch.includes("#") && <text x={x - 10} y={y + 4} className="accidental">♯</text>}</g>);
        });
      }
      cursor += duration;
    });
  }
  return <svg viewBox="0 0 96 108" aria-hidden="true"><g className="staff-lines">{[18,23,28,33,38,68,73,78,83,88].map(y => <line key={y} x1="4" y1={y} x2="92" y2={y}/>)}</g><text x="5" y="34" className="clef">𝄞</text><text x="5" y="85" className="clef bass-clef">𝄢</text><g className="notes">{glyphs}</g></svg>;
}
export function Score({ totals, selected, playing, onSelect }: { totals: number[]; selected: number; playing: number | null; onSelect: (position: number) => void }) {
  return <div className="score" aria-label="Sixteen-bar generated musical score"><div className="score-heading"><span>Minuetto</span><span>3/8 · two phrases</span></div><div className="score-grid">{totals.map((total, position) => <button key={position} onClick={() => onSelect(position)} className={`score-bar ${selected === position ? "selected" : ""} ${playing === position ? "playing" : ""}`} aria-label={`Bar ${position + 1}, dice total ${total}, source measure ${measureId(position, total)}`}><span className="bar-number">{position + 1}</span><BarNotation position={position} total={total}/><span className="measure-id">m. {measureId(position, total)}</span></button>)}</div></div>;
}
