import { useState } from "react";
import { motion } from "motion/react";
import { CLASSES, CLASS_COLOR, SHORT, pct } from "../api";
import { ease } from "../lib/motion";
import { Swap } from "../components/ui.jsx";

/** Concentric probability rings, one ring per class (outer = First). Hovering a ring or legend row focuses it. */
export function ProbabilityRings({ probs, top, size = 236 }) {
  const [hover, setHover] = useState(null);
  const focus = hover || top;
  const stroke = 11;
  const gap = 7;
  const c = size / 2;

  return (
    <div className="prob">
      <div className="rings" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
          aria-label={CLASSES.map((k) => `${k} ${pct(probs[k] || 0)}`).join(", ")}>
          {CLASSES.map((k, i) => {
            const r = c - stroke / 2 - 2 - i * (stroke + gap);
            const p = probs[k] || 0;
            const dim = hover && hover !== k;
            return (
              <g key={k} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)}>
                <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--track)" }} strokeWidth={stroke} />
                <motion.circle
                  cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                  transform={`rotate(-90 ${c} ${c})`}
                  style={{ stroke: CLASS_COLOR[k], opacity: dim ? 0.22 : 1, transition: "opacity .35s" }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: Math.max(p, 0.003) }}
                  transition={{ duration: 1.5, delay: 0.2 + i * 0.12, ease }}
                />
                <circle cx={c} cy={c} r={r} fill="none" stroke="transparent" strokeWidth={stroke + gap} style={{ cursor: "pointer" }} />
              </g>
            );
          })}
        </svg>
        <div className="rings__center">
          <Swap k={focus}>
            <span className="rings__value">{pct(probs[focus] || 0)}</span>
          </Swap>
          <Swap k={`l-${focus}`}>
            <span className="mono">{SHORT[focus]}</span>
          </Swap>
        </div>
      </div>
      <ul className="legend-list">
        {CLASSES.map((k) => (
          <li key={k} data-dim={hover && hover !== k ? "" : undefined} onPointerEnter={() => setHover(k)} onPointerLeave={() => setHover(null)}>
            <span className="dot" style={{ background: CLASS_COLOR[k] }} />
            <span className="legend-list__name">{k}</span>
            <span className="legend-list__val num">{pct(probs[k] || 0)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Empty-state version: tracks only, slowly breathing. */
export function RingsPlaceholder({ size = 236 }) {
  const stroke = 11;
  const gap = 7;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="rings-ph">
      {CLASSES.map((k, i) => {
        const r = c - stroke / 2 - 2 - i * (stroke + gap);
        return (
          <g key={k}>
            <circle cx={c} cy={c} r={r} fill="none" style={{ stroke: "var(--track)" }} strokeWidth={stroke} />
            <motion.circle
              cx={c} cy={c} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
              style={{ stroke: CLASS_COLOR[k], originX: "50%", originY: "50%" }}
              initial={{ pathLength: 0.08, rotate: -90 + i * 40, opacity: 0.35 }}
              animate={{ pathLength: [0.08, 0.22, 0.08], rotate: [-90 + i * 40, 270 + i * 40], opacity: 0.35 }}
              transition={{ duration: 9 + i * 1.5, repeat: Infinity, ease: "linear" }}
            />
          </g>
        );
      })}
    </svg>
  );
}
