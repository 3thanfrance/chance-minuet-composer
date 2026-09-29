import { useCallback, useRef } from "react";
import { X } from "lucide-react";
import { LOOKUP_TABLE } from "../data/mozart";
import { measureId } from "../lib/music";
import { useDialogFocus } from "../lib/dialogFocus";
import { Button } from "./Button";

export function RollPath({
  totals,
  active = 0,
  onSelect,
}: {
  totals: number[];
  active?: number;
  onSelect?: (bar: number) => void;
}) {
  const points = totals.map((total, c) => `${c * 48 + 24},${(total - 2) * 30 + 15}`).join(" ");
  return (
    <div className="roll-path-scroll">
      <div className="roll-path-map">
        <table aria-label="The 176-measure table with your minuet’s sixteen selections">
          <thead>
            <tr>
              <th>Σ</th>
              {Array.from({ length: 16 }, (_, i) => (
                <th scope="col" key={i}>
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOOKUP_TABLE.map((row, r) => (
              <tr key={r}>
                <th scope="row">{r + 2}</th>
                {row.map((id, c) => (
                  <td
                    key={c}
                    className={`${totals[c] === r + 2 ? "chosen-cell" : ""} ${c === active && totals[c] === r + 2 ? "active-cell" : ""}`}
                  >
                    {totals[c] === r + 2 && onSelect ? (
                      <button
                        aria-label={`Trace bar ${c + 1}: roll ${r + 2}, measure ${id}`}
                        aria-pressed={c === active}
                        onClick={() => onSelect(c)}
                      >
                        {id}
                      </button>
                    ) : (
                      id
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <svg className="roll-path-line" viewBox="0 0 768 330" aria-hidden="true">
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
          {totals.map((total, c) => (
            <circle
              key={c}
              cx={c * 48 + 24}
              cy={(total - 2) * 30 + 15}
              r={c === active ? 17 : 13}
              fill="none"
              stroke="currentColor"
              strokeWidth={c === active ? 3 : 1}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}

export function About({ open, onClose, totals }: { open: boolean; onClose: () => void; totals: number[] }) {
  const dialogRef = useRef<HTMLElement>(null);
  const close = useCallback(onClose, [onClose]);
  useDialogFocus(open, dialogRef, close);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <section
        ref={dialogRef}
        className="paper-modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
      >
        <Button variant="ghost" className="modal-close" onClick={close} aria-label="Close">
          <X size={18} />
        </Button>
        <p className="kicker">The mechanism</p>
        <h2 id="about-title">The table behind the music</h2>
        <p>
          For each of sixteen positions, two dice choose a row by their total. The cell points to one of 176 precomposed
          measures. The marked cells trace your minuet.
        </p>
        <RollPath totals={totals} />
        <p className="probability-note">
          <b>Chance is weighted.</b> Two fair dice make 7 six times more likely than 2 or 12. The sums are never
          selected uniformly.
        </p>
        <h3>A note on attribution</h3>
        <p>
          The familiar 176-measure game was published under Mozart's name; its attribution is disputed. It is often
          labeled K. 516f / K. Anh. 294d, though Mozart's surviving K. 516f manuscript is a distinct source.
        </p>
        <h3>The recorded players</h3>
        <p>
          The grand piano is Alexander Holm’s Salamander Yamaha C5 (CC BY 3.0). Harpsichord comes from the CC0 Versilian
          Community Sample Library. Violin, cello, flute, clarinet and harp use Nicholaus P. Brosowsky’s processed
          tonejs-instruments sample set (CC BY 3.0).{" "}
        </p>
        <div className="source-links">
          <a href="https://github.com/timmydoza/mozart-dice-game" target="_blank" rel="noreferrer">
            Note data · UNLICENSE ↗
          </a>
          <a href="https://github.com/craigsapp/Musikalisches-Wuerfelspiel" target="_blank" rel="noreferrer">
            Rellstab transcription · Sapp, Shanahan & Rodriguez ↗
          </a>
          <a href="https://github.com/Tonejs/audio/tree/master/salamander" target="_blank" rel="noreferrer">
            Salamander piano · Alexander Holm ↗
          </a>
          <a href="https://github.com/sgossner/VCSL" target="_blank" rel="noreferrer">
            VCSL harpsichord · CC0 ↗
          </a>
          <a href="https://github.com/nbrosowsky/tonejs-instruments" target="_blank" rel="noreferrer">
            Recorded orchestral samples · Nicholaus P. Brosowsky ↗
          </a>
          <a href="https://kv.mozarteum.at/de/work/musikalische-wurfelspiele-8820" target="_blank" rel="noreferrer">
            Mozarteum catalogue ↗
          </a>
        </div>
      </section>
    </div>
  );
}
