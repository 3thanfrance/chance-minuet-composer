const patterns = ["c", "tl br", "tl c br", "tl tr bl br", "tl tr c bl br", "tl ml bl tr mr br"];
export function Die({ value, small = false }: { value: number; small?: boolean }) {
  const pattern = patterns[Math.max(0, Math.min(5, value - 1))] ?? "c";
  return <span className={small ? "die die-small" : "die"} aria-label={`${value}`} role="img">{pattern.split(" ").map((position, i) => <i key={i} className={`pip pip-${position}`} />)}</span>;
}
