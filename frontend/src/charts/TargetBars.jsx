import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { CLASS_COLOR, SHORT } from "../api";
import { ease } from "../lib/motion";
import { ClassDot, StatusChip } from "../components/ui.jsx";

/**
 * Average GPA needed from now on for each class, drawn against the 4.00 ceiling.
 * Reachable = solid bar to the required GPA. Out of reach = hatched bar that runs past the end.
 * Secured = no bar. A hairline marks the current CGPA on every track.
 */
export function TargetBars({ targets, current, animateKey }) {
  const pctOf = (v) => `${Math.max(0, Math.min(1, v / 4)) * 100}%`;
  // First paint staggers in; later changes (sliders) follow quickly with no delay.
  const settled = useRef(false);
  useEffect(() => { const t = setTimeout(() => { settled.current = true; }, 1400); return () => clearTimeout(t); }, []);
  return (
    <div className="targets" role="table" aria-label="Average GPA needed for each class">
      {current !== undefined && current !== null && (
        <div className="targets__now" aria-hidden>
          <span />
          <div className="targets__now-track">
            <motion.span className="targets__now-label mono" animate={{ left: pctOf(current) }} transition={{ duration: 0.6, ease }}>
              Now {current.toFixed(2)}
            </motion.span>
          </div>
        </div>
      )}
      {targets.map((t, i) => {
        const req = t.required_gpa;
        const out = t.status === "out_of_reach";
        const secured = t.status === "secured";
        const width = secured ? 0 : out ? 1 : Math.max(0, Math.min(1, req / 4));
        return (
          <div className="targets__row" role="row" key={t.class}>
            <div className="targets__name" role="cell">
              <ClassDot c={t.class} />
              <span className="full">{t.class}</span>
              <span className="short">{SHORT[t.class]}</span>
            </div>
            <div className="targets__track" role="cell" aria-label={secured ? "Secured" : out ? "Needs more than 4.00" : `Needs ${req.toFixed(2)}`}>
              <motion.span
                key={`${animateKey}-${t.class}`}
                className={`targets__fill${out ? " hatch" : ""}`}
                style={{ "--c": CLASS_COLOR[t.class] }}
                initial={{ width: 0 }}
                animate={{ width: `${width * 100}%` }}
                transition={settled.current ? { duration: 0.45, ease } : { duration: 1.1, delay: 0.15 + i * 0.08, ease }}
              />
              {current !== undefined && current !== null && <span className="targets__now-tick" style={{ left: pctOf(current) }} />}
            </div>
            <div className="targets__val num" role="cell">
              {secured ? "—" : out ? (req === null ? "> 4.00" : `${req.toFixed(2)}`) : req.toFixed(2)}
            </div>
            <div role="cell" className="targets__chip"><StatusChip status={t.status} /></div>
          </div>
        );
      })}
    </div>
  );
}
