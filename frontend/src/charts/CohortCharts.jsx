import { useId, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircleIcon, DangerTriangleIcon, EyeIcon } from "@solar-icons/react/linear";
import { CLASSES, CLASS_COLOR, SHORT } from "../api";
import { ease } from "../lib/motion";
import { useWidth } from "../lib/useSize";

const niceMax = (v) => {
  if (v <= 5) return 5;
  const step = v <= 20 ? 5 : v <= 50 ? 10 : v <= 200 ? 25 : 100;
  return Math.ceil(v / step) * step;
};

/** Top-rounded column path anchored square at the baseline. */
const colPath = (x, y, w, h, r = 4) => {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
};

/**
 * Grouped columns per predicted class: students predicted (solid) beside those needing attention (hatched).
 * rows: [{ class, total, risk }]
 */
export function ClassColumns({ rows, height = 260 }) {
  const uid = useId().replace(/:/g, "");
  const [ref, width] = useWidth(520);
  const [hover, setHover] = useState(null);
  const m = { l: 32, r: 8, t: 26, b: 34 };
  const W = Math.max(260, width);
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const max = niceMax(Math.max(1, ...rows.map((r) => r.total)));
  const ticks = [0, max / 2, max];
  const y = (v) => m.t + ih - (v / max) * ih;
  const band = iw / rows.length;
  const bw = 22;
  const gap = 4;

  return (
    <div className="areachart" ref={ref}>
      <svg width={W} height={height} role="img" aria-label="Predicted class spread with students needing attention">
        <defs>
          {rows.map((r) => (
            <pattern key={r.class} id={`h-${uid}-${SHORT[r.class]}`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="5" height="5" style={{ fill: CLASS_COLOR[r.class], opacity: 0.14 }} />
              <rect width="1.8" height="5" style={{ fill: CLASS_COLOR[r.class] }} />
            </pattern>
          ))}
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={m.l - 10} y={y(t) + 3.5} textAnchor="end" className="axis-text">{t}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = m.l + band * i + band / 2;
          const x1 = cx - bw - gap / 2;
          const x2 = cx + gap / 2;
          const dim = hover !== null && hover !== i;
          return (
            <g key={r.class} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} style={{ opacity: dim ? 0.4 : 1, transition: "opacity .3s" }}>
              <rect x={cx - band / 2} y={m.t} width={band} height={ih} fill="transparent" />
              <motion.g style={{ originY: 1 }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease }}>
                <path d={colPath(x1, y(r.total), bw, y(0) - y(r.total))} style={{ fill: CLASS_COLOR[r.class] }} />
                <path d={colPath(x2, y(r.risk), bw, y(0) - y(r.risk))} fill={`url(#h-${uid}-${SHORT[r.class]})`} />
              </motion.g>
              <motion.text x={x1 + bw / 2} y={y(r.total) - 8} textAnchor="middle" className="cap-text"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.08 }}>{r.total}</motion.text>
              {r.risk > 0 && (
                <motion.text x={x2 + bw / 2} y={y(r.risk) - 8} textAnchor="middle" className="cap-text muted"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 + i * 0.08 }}>{r.risk}</motion.text>
              )}
              <text x={cx} y={height - 10} textAnchor="middle" className="axis-text">{SHORT[r.class]}</text>
            </g>
          );
        })}
      </svg>
      <AnimatePresence>
        {hover !== null && (
          <motion.div className="tip" style={{ left: Math.min(m.l + band * hover + band / 2 + 30, W - 190), top: 8 }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease }}>
            <div className="tip__title">{rows[hover].class}</div>
            <div className="tip__row"><span className="key"><span className="dot" style={{ background: CLASS_COLOR[rows[hover].class] }} />Predicted</span><b>{rows[hover].total}</b></div>
            <div className="tip__row"><span className="key"><span className="dot hatch-dot" style={{ "--c": CLASS_COLOR[rows[hover].class] }} />Need attention</span><b>{rows[hover].risk}</b></div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="legend-row">
        <span className="legend-key"><span className="swatch" style={{ background: "var(--text-2)" }} />Predicted</span>
        <span className="legend-key"><span className="swatch hatch-dot" style={{ "--c": "var(--text-2)" }} />Need attention</span>
      </div>
    </div>
  );
}

const RISKS = [
  { k: "High", c: "var(--bad)", Icon: DangerTriangleIcon },
  { k: "Watch", c: "var(--warn)", Icon: EyeIcon },
  { k: "Low", c: "var(--good)", Icon: CheckCircleIcon },
];

/** Tall segmented bar: one whole cohort split by risk level. */
export function RiskBar({ counts }) {
  const total = RISKS.reduce((a, r) => a + (counts[r.k] || 0), 0) || 1;
  return (
    <div className="riskbar">
      <div className="riskbar__bar" role="img" aria-label={RISKS.map((r) => `${r.k} ${counts[r.k] || 0}`).join(", ")}>
        {RISKS.filter((r) => counts[r.k] > 0).map((r, i) => {
          const share = counts[r.k] / total;
          return (
            <motion.div key={r.k} className="riskbar__seg" style={{ background: r.c }}
              initial={{ flexGrow: 0.0001 }} animate={{ flexGrow: share }} transition={{ duration: 1, delay: 0.2 + i * 0.1, ease }}
              title={`${r.k}: ${counts[r.k]} (${Math.round(share * 100)}%)`}>
              {share >= 0.1 && <span>{Math.round(share * 100)}%</span>}
            </motion.div>
          );
        })}
      </div>
      <div className="legend-row">
        {RISKS.map((r) => (
          <span className="legend-key" key={r.k}>
            <r.Icon size={14} style={{ color: r.c }} />
            {r.k === "Watch" ? "On watch" : r.k === "High" ? "High risk" : "Low risk"}
            <b className="num">{counts[r.k] || 0}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
