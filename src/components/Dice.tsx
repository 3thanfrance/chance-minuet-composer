import { useId } from "react";
const patterns: [number, number][][] = [
  [[50, 50]],
  [
    [29, 29],
    [71, 71],
  ],
  [
    [29, 29],
    [50, 50],
    [71, 71],
  ],
  [
    [29, 29],
    [71, 29],
    [29, 71],
    [71, 71],
  ],
  [
    [29, 29],
    [71, 29],
    [50, 50],
    [29, 71],
    [71, 71],
  ],
  [
    [29, 27],
    [29, 50],
    [29, 73],
    [71, 27],
    [71, 50],
    [71, 73],
  ],
];
export function Die({
  value,
  small = false,
  rolling = false,
  index = 0,
}: {
  value: number;
  small?: boolean;
  rolling?: boolean;
  index?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={`paper-die ${small ? "small" : ""} ${rolling ? "tumbling" : ""}`}
      style={
        {
          "--direction": index === 0 ? -1 : 1,
          "--rest-angle": index === 0 ? "-11deg" : "12deg",
          "--delay": index === 0 ? "0ms" : "80ms",
        } as React.CSSProperties
      }
      role="img"
      aria-label={`Die showing ${value}`}
    >
      <span className="paper-die-shadow" />
      <svg className="paper-die-art" viewBox="0 0 120 130" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-ivory`} x2=".8" y2="1">
            <stop stopColor="#fff9e8" />
            <stop offset=".7" stopColor="#f0e5c9" />
            <stop offset="1" stopColor="#d7c6a4" />
          </linearGradient>
        </defs>
        <path
          d="M11 21 99 13 111 24 109 108Q109 116 101 117L20 125 9 113Z"
          fill="#b8a789"
          stroke="#564a32"
          strokeWidth="1.2"
        />
        <path d="M11 21 99 13 111 24 25 33Z" fill="#e4d6b9" />
        <rect
          x="6"
          y="12"
          width="100"
          height="100"
          rx="13"
          fill={`url(#${id}-ivory)`}
          stroke="#c4b496"
          strokeWidth="1.4"
        />
        <rect x="11" y="17" width="90" height="90" rx="10" fill="none" stroke="#fffdf2" opacity=".6" />
        {patterns[value - 1]?.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x + 6} cy={y + 12} r="6" fill="#32382a" />
            <path d={`M${x + 2} ${y + 14}q1-6 7-6`} fill="none" stroke="#93836a" strokeWidth="1" />
          </g>
        ))}
        <path d="M100 32v70M103 36v65M23 117l74-7M30 120l62-7" fill="none" stroke="#897957" opacity=".35" />
      </svg>
    </span>
  );
}
export function DiceButton({
  values,
  rolling,
  onRoll,
  label = "Roll a new minuet",
}: {
  values: readonly [number, number];
  rolling: boolean;
  onRoll: () => void;
  label?: string;
}) {
  return (
    <button className="paper-dice-button" onClick={onRoll} disabled={rolling} aria-label={label}>
      <span className="paper-dice-pair">
        <Die value={values[0]} rolling={rolling} />
        <Die value={values[1]} rolling={rolling} index={1} />
      </span>
      <span className="paper-dice-label">
        {rolling ? "A little chance at work…" : label}
        <span aria-hidden="true">↗</span>
      </span>
    </button>
  );
}
