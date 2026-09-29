import { MEASURES } from "../data/mozart";
import { eventDuration, measureId } from "../lib/music";
import { eventDenominator, flagCount, ledgerLineYs, pitchAccidental, staffPitchY } from "../lib/notation";

function RestSymbol({ x, y, denominator }: { x: number; y: number; denominator: number }) {
  if (denominator <= 4) return <g className="rest-symbol" data-rest-duration={denominator}><path d={`M ${x-3} ${y-8} l 5 5 -4 4 5 5 -3 6 -1-1 2-5 -6-6 5-5 -4-4 z`}/></g>;
  const tails=denominator>=16?2:1;
  return <g className="rest-symbol" data-rest-duration={denominator}><path d={`M ${x+3} ${y-10} q -1 10 -7 18`}/>{Array.from({length:tails},(_,i)=><g key={i}><circle cx={x+1} cy={y-7+i*5} r="2.1"/><path d={`M ${x+1} ${y-6+i*5} q 5 1 2 7`}/></g>)}</g>;
}

function BarNotation({ position, total }: { position: number; total: number }) {
  const measure = MEASURES[measureId(position, total)];
  if (!measure) return null;
  const glyphs: React.ReactNode[] = [];
  for (const staff of ["treble", "bass"] as const) {
    let cursor = 0;
    measure[staff].forEach((event, index) => {
      const duration=eventDuration(event);const denominator=eventDenominator(event);const first=event[0];const x=22+cursor*22;
      if(typeof first==="number")glyphs.push(<RestSymbol key={`${staff}-${index}`} x={x} y={staff==="treble"?29:79} denominator={denominator}/>);
      else {
        const pitches=Array.isArray(first)?first:[first];const ys=pitches.map(pitch=>staffPitchY(pitch,staff));const minY=Math.min(...ys);const maxY=Math.max(...ys);const stemUp=maxY>28+(staff==="bass"?50:0);const stemX=x+(stemUp?3.5:-3.5);const stemStart=stemUp?maxY:minY;const stemEnd=stemUp?minY-17:maxY+17;const flags=flagCount(denominator);
        const ledgers=[...new Set(ys.flatMap(y=>ledgerLineYs(y,staff)))];
        glyphs.push(<g key={`${staff}-${index}`} data-note-duration={denominator} data-chord-size={pitches.length}>{ledgers.map(y=><line key={y} className="ledger-line" x1={x-6} y1={y} x2={x+7} y2={y}/>)}{pitches.map((pitch,pitchIndex)=>{const y=ys[pitchIndex]??38;const accidental=pitchAccidental(pitch);return <g key={pitchIndex} data-pitch={pitch}><ellipse cx={x} cy={y} rx="4" ry="3" transform={`rotate(-18 ${x} ${y})`}/>{accidental==="#"&&<text x={x-10} y={y+4} className="accidental">♯</text>}{accidental==="b"&&<text x={x-10} y={y+4} className="accidental">♭</text>}</g>})}<line className="note-stem" x1={stemX} y1={stemStart} x2={stemX} y2={stemEnd}/>{Array.from({length:flags},(_,flag)=><path key={flag} className="note-flag" d={stemUp?`M ${stemX} ${stemEnd+flag*5} q 8 3 7 10`:`M ${stemX} ${stemEnd-flag*5} q -8 -3 -7 -10`}/>)}</g>);
      }
      cursor+=duration;
    });
  }
  return <svg viewBox="0 0 96 108" aria-hidden="true"><g className="staff-lines">{[18,23,28,33,38,68,73,78,83,88].map(y=><line key={y} x1="4" y1={y} x2="92" y2={y}/>)}</g><text x="5" y="34" className="clef">𝄞</text><text x="5" y="85" className="clef bass-clef">𝄢</text><g className="notes">{glyphs}</g></svg>;
}

export function Score({ totals, selected, playing, onSelect }: { totals: number[]; selected: number; playing: number | null; onSelect: (position: number) => void }) {
  return <div className="score" aria-label="Sixteen-bar generated musical score"><div className="score-heading"><span>Minuetto</span><span>3/8 · two phrases</span></div><div className="score-grid">{totals.map((total,position)=><button key={position} onClick={()=>onSelect(position)} className={`score-bar ${selected===position?"selected":""} ${playing===position?"playing":""}`} aria-label={`Bar ${position+1}, dice total ${total}, source measure ${measureId(position,total)}`}><span className="bar-number">{position+1}</span><BarNotation position={position} total={total}/><span className="measure-id">m. {measureId(position,total)}</span></button>)}</div></div>;
}