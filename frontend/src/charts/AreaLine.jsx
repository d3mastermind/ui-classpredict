import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { area, curveMonotoneX, line } from "d3-shape";
import { CLASS_COLOR, SHORT } from "../api";
import { ease } from "../lib/motion";
import { useWidth } from "../lib/useSize";

/**
 * Single-series line over ordered points with a halftone (dotted) area wash,
 * labelled class thresholds, a diamond on the latest point and a crosshair + pill on hover.
 * points: [{ x: "label", y: number, color?: css, tip?: ReactNode }]
 */
export function AreaLine({ points, height = 230, yDomain = [1, 4], thresholds = [], fmt = (v) => v.toFixed(2), label }) {
  // Start the axis at 1.0 (Third Class floor) unless a value sits lower, so the line uses the height.
  const lo = Math.min(yDomain[0], Math.floor(Math.min(...points.map((p) => p.y), yDomain[0])));
  const dom = [lo, yDomain[1]];
  const yTicks = Array.from({ length: dom[1] - dom[0] + 1 }, (_, i) => dom[0] + i);
  const uid = useId().replace(/:/g, "");
  const [ref, width] = useWidth(560);
  const [hover, setHover] = useState(null);
  const m = { l: 30, r: thresholds.length ? 58 : 16, t: 22, b: 34 };
  const W = Math.max(200, width);
  const iw = W - m.l - m.r;
  const ih = height - m.t - m.b;
  const n = points.length;
  const x = (i) => m.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => m.t + ih - ((v - dom[0]) / (dom[1] - dom[0])) * ih;

  const { linePath, areaPath } = useMemo(() => {
    const pts = points.map((p, i) => [x(i), y(p.y)]);
    return {
      linePath: line().curve(curveMonotoneX)(pts),
      areaPath: area().curve(curveMonotoneX).y0(m.t + ih).y1((d) => d[1])(pts),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, W, height]);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    let bd = Infinity;
    points.forEach((_, i) => { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  };

  const last = n - 1;
  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="areachart" ref={ref}>
      <svg width={W} height={height} role="img" aria-label={label}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <pattern id={`dots-${uid}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="0.9" style={{ fill: "var(--series-ink)" }} />
          </pattern>
          <linearGradient id={`fade-${uid}`} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0.05" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="0.75" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={`mask-${uid}`}>
            <rect x="0" y="0" width={W} height={height} fill={`url(#fade-${uid})`} />
          </mask>
          <clipPath id={`clip-${uid}`}>
            <motion.rect x={0} y={0} height={height} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.3, ease }} />
          </clipPath>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} className="gridline" />
            <text x={m.l - 10} y={y(t) + 3.5} textAnchor="end" className="axis-text">{t}</text>
          </g>
        ))}

        {thresholds.map((t) => (
          <g key={t.c}>
            <line x1={m.l} x2={W - m.r} y1={y(t.v)} y2={y(t.v)} className="threshold" style={{ stroke: CLASS_COLOR[t.c] }} />
            <circle cx={W - m.r + 10} cy={y(t.v)} r="3" style={{ fill: CLASS_COLOR[t.c] }} />
            <text x={W - m.r + 18} y={y(t.v) + 3.5} className="axis-text">{SHORT[t.c]}</text>
          </g>
        ))}

        {n > 1 && (
          <g clipPath={`url(#clip-${uid})`}>
            <path d={areaPath} fill={`url(#dots-${uid})`} mask={`url(#mask-${uid})`} />
          </g>
        )}
        {n > 1 && (
          <motion.path d={linePath} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ stroke: "var(--series-ink)" }}
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.3, ease }} />
        )}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={m.t - 6} y2={m.t + ih} className="crosshair" />
        )}

        {points.map((p, i) => {
          const isLast = i === last;
          const fill = p.color || "var(--series-ink)";
          const active = hover === i;
          return (
            <motion.g key={i} initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.25 + (i / Math.max(1, n)) * 1.0, ease }}>
              {isLast ? (
                <rect x={x(i) - 5.5} y={y(p.y) - 5.5} width="11" height="11" rx="2"
                  transform={`rotate(45 ${x(i)} ${y(p.y)})`}
                  style={{ fill, stroke: "var(--surface-1)", strokeWidth: 2 }} />
              ) : (
                <circle cx={x(i)} cy={y(p.y)} r={active ? 5.5 : 4} style={{ fill, stroke: "var(--surface-1)", strokeWidth: 2, transition: "r .2s" }} />
              )}
            </motion.g>
          );
        })}

        {/* value pill above the latest point */}
        {n > 0 && hover === null && (
          <motion.g initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5, ease }}>
            <rect x={x(last) - (thresholds.length ? 40 : 22)} y={y(points[last].y) - 32} width="44" height="20" rx="10" className="pill-bg" />
            <text x={x(last) - (thresholds.length ? 18 : 0)} y={y(points[last].y) - 18.5} textAnchor="middle" className="pill-text">{fmt(points[last].y)}</text>
          </motion.g>
        )}

        {points.map((p, i) => (
          <text key={`x${i}`} x={x(i)} y={height - 10} textAnchor="middle" className="axis-text"
            style={{ opacity: hover !== null && hover !== i ? 0.35 : 1, transition: "opacity .2s" }}>
            {p.x}
          </text>
        ))}

        {/* crosshair pill on the axis (bklit style) */}
        {hp && (
          <g>
            <rect x={x(hover) - 34} y={height - 26} width="68" height="22" rx="11" className="pill-bg strong" />
            <text x={x(hover)} y={height - 11} textAnchor="middle" className="pill-text strong">{hp.x}</text>
          </g>
        )}
        <rect x={m.l - 12} y={0} width={iw + 24} height={height} fill="transparent" />
      </svg>

      <AnimatePresence>
        {hp && (
          <motion.div
            className="tip"
            style={{ left: Math.min(Math.max(x(hover) + 14, 0), W - 200), top: Math.max(0, y(hp.y) - 80) }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease }}
          >
            {hp.tip || (
              <div className="tip__row"><span>{hp.x}</span><b>{fmt(hp.y)}</b></div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
