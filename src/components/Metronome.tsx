import { useId } from "react";
export function tempoToWeightTop(tempo: number) {
  return 14 + ((tempo - 60) / 120) * 52;
}
export function Metronome({
  tempo,
  playing,
  onChange,
}: {
  tempo: number;
  playing: boolean;
  onChange: (tempo: number) => void;
}) {
  const id = useId().replace(/:/g, "");
  const weight = 72 + (tempo - 60) * 0.7;
  return (
    <section
      className={`walnut-clock ${playing ? "swinging" : ""}`}
      style={{ "--beat-duration": `${60 / tempo}s` } as React.CSSProperties}
      aria-label="Walnut metronome"
    >
      <div className="clock-object">
        <svg viewBox="0 0 200 290" aria-hidden="true">
          <defs>
            <linearGradient id={`${id}-wood`}>
              <stop stopColor="#332119" />
              <stop offset=".28" stopColor="#856043" />
              <stop offset=".48" stopColor="#ac8060" />
              <stop offset=".65" stopColor="#694530" />
              <stop offset="1" stopColor="#35251c" />
            </linearGradient>
            <linearGradient id={`${id}-gold`}>
              <stop stopColor="#6b5736" />
              <stop offset=".45" stopColor="#e3c588" />
              <stop offset="1" stopColor="#887044" />
            </linearGradient>
            <pattern id={`${id}-grain`} width="14" height="70" patternUnits="userSpaceOnUse">
              <path
                d="M2-10q16 28 1 53t3 40M8-15Q1 26 10 62"
                fill="none"
                stroke="#2b150f"
                opacity=".23"
                strokeWidth=".8"
              />
            </pattern>
          </defs>
          <ellipse cx="102" cy="276" rx="79" ry="8" fill="#3b2b21" opacity=".15" />
          <path d="M66 19 132 13 178 257 28 264Z" fill="#352419" stroke="#231910" />
          <path d="M61 14Q99 3 137 14L166 251 32 251Z" fill={`url(#${id}-wood)`} stroke="#523922" strokeWidth="2" />
          <path d="M61 14Q99 3 137 14L166 251 32 251Z" fill={`url(#${id}-grain)`} />
          <path d="M65 23Q99 14 132 23L158 240 41 240Z" fill="none" stroke="#c19960" strokeWidth="1" />
          <path d="M73 33 126 33 146 195 54 195Z" fill="#302f26" stroke={`url(#${id}-gold)`} strokeWidth="3" />
          <path d="M79 39h40l14 148H66Z" fill="#e4d5b6" />
          <path d="M82 40h34l4 144H76Z" fill="#f7ecd4" />
          {[60, 80, 100, 120, 140, 160, 180].map((v, i) => (
            <g key={v}>
              <path d={`M99 ${72 + i * 14}h18`} stroke="#564b37" strokeWidth=".7" />
              <text x="125" y={75 + i * 14} fontSize="7" fill="#51452f" textAnchor="end" fontFamily="Georgia">
                {v}
              </text>
            </g>
          ))}
          <g className="clock-pendulum">
            <path d="M99 49v150" stroke="#443b2b" strokeWidth="6" />
            <path d="M99 49v150" stroke={`url(#${id}-gold)`} strokeWidth="3" />
            <rect x="84" y={weight - 7} width="30" height="14" rx="2" fill={`url(#${id}-gold)`} stroke="#5e482b" />
            <path d={`M88 ${weight - 3}h22M88 ${weight + 3}h22`} stroke="#f7dfa9" opacity=".6" />
            <circle cx="99" cy="195" r="9" fill={`url(#${id}-gold)`} stroke="#4b3725" />
            <circle cx="99" cy="195" r="3" fill="#3b2a20" />
          </g>
          <path d="M72 39 84 39 72 181 62 181Z" fill="white" opacity=".12" />
          <rect x="63" y="216" width="73" height="22" rx="3" fill={`url(#${id}-gold)`} stroke="#453421" />
          <text x="99" y="230" textAnchor="middle" fontSize="8" letterSpacing="2" fill="#3c2c21" fontFamily="Georgia">
            MINUETTO
          </text>
          <path d="M29 249h141l7 12H23Z" fill={`url(#${id}-wood)`} stroke="#362317" />
          <path d="M25 262h149v7H25Z" fill="#513728" />
          <path d="M37 269v7h17v-7M144 269v7h17v-7" fill="#38291f" />
        </svg>
        <input
          className="clock-slider"
          aria-label="Tempo"
          aria-valuetext={`${tempo} eighth-note pulses per minute`}
          type="range"
          min="60"
          max="180"
          step="1"
          value={tempo}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <div className="clock-tempo">
        <button aria-label="Slower" disabled={tempo <= 60} onClick={() => onChange(Math.max(60, tempo - 4))}>
          −
        </button>
        <span>
          <strong>{tempo}</strong>
          <small>♪ / MIN</small>
        </span>
        <button aria-label="Faster" disabled={tempo >= 180} onClick={() => onChange(Math.min(180, tempo + 4))}>
          +
        </button>
      </div>
      <p>Slide the brass weight</p>
    </section>
  );
}
