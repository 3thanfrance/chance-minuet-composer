import { useId } from "react";

export function tempoToWeightTop(tempo:number){return 14+((tempo-60)/120)*52}

export function Metronome({ tempo, playing, onChange }: { tempo: number; playing: boolean; onChange: (tempo: number) => void }) {
  const id=useId();
  const weightTop=tempoToWeightTop(tempo);
  return <section className={`metronome ${playing?"is-playing":""}`} aria-labelledby={id} style={{"--beat-duration":`${60/tempo}s`} as React.CSSProperties}>
    <div className="metronome-case">
      <div className="metronome-scale" aria-hidden="true"><span>60</span><span>120</span><span>180</span></div>
      <div className="pendulum" aria-hidden="true"><i style={{top:`${weightTop}%`}}/></div>
      <div className="metronome-plaque"><span id={id}>Tempo</span><strong>{tempo}</strong><small>♪ pulses/min</small></div>
      <input aria-label={`Tempo ${tempo}, eighth-note pulses per minute`} aria-valuetext={`${tempo} eighth-note pulses per minute`} type="range" min="60" max="180" value={tempo} onChange={e=>onChange(Number(e.target.value))}/>
    </div>
  </section>;
}