import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CLASSES, SHORT, pct } from "../api";
import { ease } from "../lib/motion";
import { useWidth } from "../lib/useSize";

export const MODELS = ["Logistic Regression", "Decision Tree", "Random Forest", "Gradient Boosting"];
export const MODEL_SHORT = { "Logistic Regression": "LogReg", "Decision Tree": "Tree", "Random Forest": "Forest", "Gradient Boosting": "Boosting" };

/* Emphasis encoding: the focused model wears the accent, the rest recede to muted ink. */
const strokeFor = (md, focus) => (md === focus ? "var(--accent)" : "var(--text-3)");

/** Legend that doubles as the focus control for both model charts. */
export function ModelLegend({ focus, setFocus, best }) {
  return (
    <div className="model-legend" role="group" aria-label="Highlight a model">
      {MODELS.map((md) => (
        <button key={md} type="button" aria-pressed={focus === md} onClick={() => setFocus(md)} onPointerEnter={() => setFocus(md)} className="model-legend__item">
          <span className="line-key" style={{ background: strokeFor(md, focus) }} />
          {md}
          {md === best && <span className="chip accent" style={{ height: 20, fontSize: 11, padding: "0 7px" }}>In use</span>}
        </button>
      ))}
    </div>
  );
}

/** Accuracy at each stage for all four models; one is emphasised. */
export function AccuracyLines({ stages, focus, height = 250 }) {
  const [ref, width] = useWidth(520);
  const [hover, setHover] = useState(null);
  const keys = ["1", "2", "3"];
  const m = { l: 40, r: 24, t: 18, b: 34 };
  const W = Math.max(260, width);
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const lo = 0.6;
  const hi = 1;
  const x = (i) => m.l + (i / (keys.length - 1)) * iw;
  const y = (v) => m.t + ih - ((v - lo) / (hi - lo)) * ih;
  const ticks = [0.6, 0.7, 0.8, 0.9, 1];
  const ordered = [...MODELS.filter((md) => md !== focus), focus];

  return (
    <div className="areachart" ref={ref}>
      <svg width={W} height={height} role="img" aria-label="Test accuracy by stage for each model"
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - r.left;
          setHover(Math.max(0, Math.min(2, Math.round(((px - m.l) / iw) * 2))));
        }}
        onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={m.l - 10} y={y(t) + 3.5} textAnchor="end" className="axis-text">{Math.round(t * 100)}%</text>
          </g>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + ih} className="crosshair" />}
        {ordered.map((md) => {
          const pts = keys.map((k, i) => [x(i), y(stages[k].models[md].accuracy)]);
          const d = `M${pts.map((p) => p.join(",")).join("L")}`;
          const on = md === focus;
          return (
            <g key={md}>
              <motion.path d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
                style={{ stroke: strokeFor(md, focus), strokeWidth: on ? 2 : 1.25, opacity: on ? 1 : 0.6, transition: "stroke .3s, opacity .3s" }}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease }} />
              {pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r={on ? 4.5 : 3} style={{ fill: strokeFor(md, focus), stroke: "var(--surface-1)", strokeWidth: 2, transition: "fill .3s" }} />
              ))}
              {on && (
                <text x={pts[2][0] - 8} y={pts[2][1] - 12} textAnchor="end" className="cap-text">{pct(stages["3"].models[md].accuracy, 1)}</text>
              )}
            </g>
          );
        })}
        {keys.map((k, i) => (
          <text key={k} x={x(i)} y={height - 10} textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"} className="axis-text">
            {stages[k].label.replace("End of ", "")}
          </text>
        ))}
      </svg>
      <AnimatePresence>
        {hover !== null && (
          <motion.div className="tip" style={{ left: Math.min(x(hover) + 14, W - 210), top: 6 }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease }}>
            <div className="tip__title">{stages[keys[hover]].label}</div>
            {MODELS.map((md) => (
              <div className="tip__row" key={md}>
                <span className="key"><span className="line-key" style={{ background: strokeFor(md, focus) }} />{md}</span>
                <b>{pct(stages[keys[hover]].models[md].accuracy, 1)}</b>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const AXES = [
  ["accuracy", "Accuracy"],
  ["macro_f1", "Macro F1"],
  ["macro_precision", "Precision"],
  ["macro_recall", "Recall"],
  ["cv_accuracy_mean", "CV accuracy"],
];

/** Radar comparing the four models on five scores at one stage. */
export function Radar({ models, focus, size = 300 }) {
  const c = size / 2;
  const R = c - 46;
  const vals = MODELS.flatMap((md) => AXES.map(([k]) => models[md][k]));
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.05) * 20) / 20);
  const hi = 1;
  const ang = (i) => -Math.PI / 2 + (i / AXES.length) * Math.PI * 2;
  const pt = (i, v) => {
    const r = ((v - lo) / (hi - lo)) * R;
    return [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r];
  };
  const levels = [0.25, 0.5, 0.75, 1];
  const ordered = [...MODELS.filter((md) => md !== focus), focus];

  return (
    <div className="radar">
      <svg width="100%" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Scores for ${focus}`} style={{ maxWidth: size }}>
        {levels.map((l) => (
          <polygon key={l} className="gridline" fill="none"
            points={AXES.map((_, i) => [c + Math.cos(ang(i)) * R * l, c + Math.sin(ang(i)) * R * l].join(",")).join(" ")} />
        ))}
        {AXES.map(([, lab], i) => {
          const [ex, ey] = [c + Math.cos(ang(i)) * R, c + Math.sin(ang(i)) * R];
          const [tx, ty] = [c + Math.cos(ang(i)) * (R + 18), c + Math.sin(ang(i)) * (R + 18)];
          return (
            <g key={lab}>
              <line x1={c} y1={c} x2={ex} y2={ey} className="gridline" />
              <text x={tx} y={ty + 4} textAnchor={Math.abs(tx - c) < 4 ? "middle" : tx < c ? "end" : "start"} className="axis-text strong">{lab}</text>
            </g>
          );
        })}
        {/* ring values sit just right of the top spoke, below the axis label */}
        <text x={c + 5} y={c - R * 0.5 + 11} className="axis-text" style={{ fontSize: 9 }}>{Math.round((lo + (hi - lo) * 0.5) * 100)}</text>
        <text x={c + 5} y={c - R + 11} className="axis-text" style={{ fontSize: 9 }}>100</text>
        {ordered.map((md) => {
          const on = md === focus;
          const pts = AXES.map(([k], i) => pt(i, models[md][k]));
          return (
            <motion.g key={md} initial={{ scale: 0.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease }}
              style={{ originX: `${c}px`, originY: `${c}px`, transformBox: "view-box" }}>
              <polygon points={pts.map((p) => p.join(",")).join(" ")}
                style={{ fill: on ? "var(--accent-soft)" : "transparent", stroke: strokeFor(md, focus), strokeWidth: on ? 2 : 1.1, opacity: on ? 1 : 0.55, transition: "all .35s" }}
                strokeLinejoin="round" />
              {on && pts.map((p, i) => (
                <circle key={i} cx={p[0]} cy={p[1]} r="4" style={{ fill: "var(--accent)", stroke: "var(--surface-1)", strokeWidth: 2 }} />
              ))}
            </motion.g>
          );
        })}
      </svg>
      <div className="radar__scores">
        {AXES.map(([k, lab]) => (
          <div key={k}><span className="mono">{lab}</span><span className="num">{pct(models[focus][k], 1)}</span></div>
        ))}
      </div>
    </div>
  );
}

/** Row-normalised confusion matrix as a heatmap of rounded cells (single-hue sequential). */
export function ConfusionGrid({ matrix }) {
  const [hover, setHover] = useState(null);
  return (
    <div className="cm">
      <div className="cm__grid" role="table" aria-label="Confusion matrix, rows are actual classes">
        <div className="cm__corner mono" role="columnheader">Actual / Predicted</div>
        {CLASSES.map((c) => <div key={c} className="cm__col mono" role="columnheader">{SHORT[c]}</div>)}
        {matrix.map((row, i) => {
          const tot = row.reduce((a, b) => a + b, 0) || 1;
          return [
            <div key={`r${i}`} className="cm__row mono" role="rowheader">{SHORT[CLASSES[i]]}</div>,
            ...row.map((v, j) => {
              const share = v / tot;
              const hot = share > 0.55;
              return (
                <motion.div key={`${i}-${j}`} role="cell"
                  className={`cm__cell${hot ? " hot" : ""}${i === j ? " diag" : ""}`}
                  style={{ "--share": `${Math.round(share * 100)}%` }}
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 + (i + j) * 0.05, ease }}
                  onPointerEnter={() => setHover({ i, j, v, share })} onPointerLeave={() => setHover(null)}
                  aria-label={`Actual ${CLASSES[i]}, predicted ${CLASSES[j]}: ${v}`}>
                  <span className="num">{v}</span>
                </motion.div>
              );
            }),
          ];
        })}
      </div>
      <div className="cm__foot">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={hover ? `${hover.i}${hover.j}` : "none"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {hover
              ? <>Actual <b>{CLASSES[hover.i]}</b>, predicted <b>{CLASSES[hover.j]}</b>: {hover.v} students ({pct(hover.share)} of the row)</>
              : <span className="t3">Hover a cell for details</span>}
          </motion.span>
        </AnimatePresence>
        <span className="cm__scale" aria-hidden><span>0%</span><i /><span>100%</span></span>
      </div>
    </div>
  );
}

/** Horizontal bars for feature importance (one series, one colour). */
export function ImportanceBars({ items }) {
  const max = Math.max(...items.map((d) => d.v), 0.0001);
  return (
    <div className="imp">
      {items.map((d, i) => (
        <div className="imp__row" key={d.name}>
          <span className="imp__name">{d.name}</span>
          <div className="imp__track">
            <motion.span className="imp__fill" initial={{ width: 0 }} animate={{ width: `${(d.v / max) * 100}%` }}
              transition={{ duration: 1, delay: 0.1 + i * 0.06, ease }} />
          </div>
          <span className="imp__val num">{d.v.toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}
