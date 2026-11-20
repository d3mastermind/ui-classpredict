import { motion } from "motion/react";
import { CLASS_COLOR, classForGpa } from "../api";
import { ease } from "../lib/motion";
import { AnimatedNumber, ClassDot } from "../components/ui.jsx";

const START = 135; // degrees, bottom-left
const SWEEP = 270; // through the top to bottom-right
const rad = (d) => (d * Math.PI) / 180;

/** Segmented 270° gauge for CGPA on the 4.0 scale; each segment wears the colour of its class band. */
export function CgpaGauge({ value, max = 4, segments = 44, size = 248 }) {
  const c = size / 2;
  const len = 15;
  const thick = 5.5;
  const R = c - len / 2 - 22;
  const ticks = [0, 2, 3, 3.5, 4];
  const height = Math.ceil(c + Math.sin(rad(45)) * (R + len / 2) + 26);
  const band = classForGpa(value);

  return (
    <div className="gauge" style={{ width: size, height }}>
      <svg width={size} height={height} viewBox={`0 0 ${size} ${height}`} role="img" aria-label={`CGPA ${value.toFixed(2)} of ${max.toFixed(2)}, ${band} band`}>
        {Array.from({ length: segments }, (_, i) => {
          const at = (i + 0.5) / segments;
          const a = START + at * SWEEP;
          const g = at * max;
          const lit = g <= value;
          const t = `translate(${c} ${c}) rotate(${a}) translate(${R} 0)`;
          return (
            <g key={i} transform={t}>
              <rect x={-len / 2} y={-thick / 2} width={len} height={thick} rx={thick / 2} style={{ fill: "var(--track)" }} />
              {lit && (
                <motion.rect
                  x={-len / 2} y={-thick / 2} width={len} height={thick} rx={thick / 2}
                  style={{ fill: CLASS_COLOR[classForGpa(g)] }}
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.45, delay: 0.25 + i * 0.022, ease }}
                />
              )}
            </g>
          );
        })}
        {ticks.map((v) => {
          const a = rad(START + (v / max) * SWEEP);
          const rr = R + len / 2 + 13;
          const x = c + Math.cos(a) * rr;
          const y = c + Math.sin(a) * rr;
          const anchor = Math.abs(x - c) < 6 ? "middle" : x < c ? "end" : "start";
          return (
            <text key={v} x={x} y={y + 3.5} textAnchor={anchor} className="axis-text">
              {v.toFixed(v % 1 ? 1 : 0)}
            </text>
          );
        })}
      </svg>
      <div className="gauge__center" style={{ top: c - 30 }}>
        <AnimatedNumber value={value} decimals={2} className="gauge__value" duration={1.4} delay={0.2} />
        <span className="gauge__band"><ClassDot c={band} />{band}</span>
      </div>
    </div>
  );
}
