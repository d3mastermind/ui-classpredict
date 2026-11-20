import { useId, useMemo, useState } from "react";
import { motion } from "motion/react";
import { TargetIcon, TuningSquare2Icon } from "@solar-icons/react/linear";
import { CLASS_COLOR, CLASS_FLOOR, CLASSES } from "../api";
import { rise, stagger } from "../lib/motion";
import { AnimatedNumber, Card, CardHead, ClassDot, Hint, Swap, TextReveal } from "../components/ui.jsx";
import { TargetBars } from "../charts/TargetBars.jsx";

/* Same rule as the API's target_gpas(): ceil to 2 dp so a target is never short. */
function targetsFor(cgpa, done, left) {
  return CLASSES.map((c) => {
    const floor = CLASS_FLOOR[c];
    if (left <= 0) return { class: c, floor, required_gpa: null, status: cgpa >= floor ? "secured" : "out_of_reach" };
    let need = (floor * (done + left) - cgpa * done) / left;
    need = Math.ceil(Math.round(need * 100 * 1e6) / 1e6) / 100;
    const status = need <= 0 ? "secured" : need > 4 ? "out_of_reach" : "reachable";
    return { class: c, floor, required_gpa: Math.round(need * 100) / 100, status };
  });
}

function SliderField({ label, value, onChange, min, max, step, decimals = 0, marks }) {
  const id = useId();
  const v = Number(value);
  const p = ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * 100;
  return (
    <div className="slider-field">
      <div className="slider-field__top">
        <label className="field__label" htmlFor={id}>{label}</label>
        <input
          className="slider-field__num num"
          type="number" inputMode="decimal" min={min} max={max} step={step}
          value={value} aria-label={`${label} value`}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => onChange(String(Math.min(max, Math.max(min, Number(value) || 0)).toFixed(decimals)))}
        />
      </div>
      <div className="slider-wrap">
        <input id={id} className="slider" type="range" min={min} max={max} step={step} value={Number.isNaN(v) ? min : v}
          style={{ "--p": `${p}%` }} onChange={(e) => onChange(Number(e.target.value).toFixed(decimals))} />
        {marks && (
          <div className="slider-marks" aria-hidden>
            {marks.map((m) => (
              <span key={m.v} style={{ left: `${((m.v - min) / (max - min)) * 100}%`, "--c": m.color }}>{m.label}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Calculator() {
  const [cgpa, setCgpa] = useState("3.12");
  const [done, setDone] = useState("105");
  const [left, setLeft] = useState("63");

  const c = Math.min(4, Math.max(0, Number(cgpa) || 0));
  const d = Math.max(1, Number(done) || 1);
  const l = Math.max(0, Number(left) || 0);
  const targets = useMemo(() => targetsFor(c, d, l), [c, d, l]);
  const best = targets.find((t) => t.status !== "out_of_reach") || targets[targets.length - 1];
  const bestNeed = best.status === "secured" ? null : best.required_gpa;

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
      <div className="page-head">
        <motion.h1 variants={rise} className="page-title">What <em>I need</em></motion.h1>
      </div>
      <div className="grid">
        <Card className="s5">
          <CardHead icon={TuningSquare2Icon} title="Your position">
            <Hint>Needed GPA = (Target × (units done + units left) − CGPA × units done) ÷ units left. Your units are on your result slips.</Hint>
          </CardHead>
          <div className="form-stack" style={{ gap: 28 }}>
            <SliderField label="Current CGPA" value={cgpa} onChange={setCgpa} min={0} max={4} step={0.01} decimals={2}
              marks={["Second Class Lower", "Second Class Upper", "First Class"].map((k) => ({ v: CLASS_FLOOR[k], label: CLASS_FLOOR[k].toFixed(1), color: CLASS_COLOR[k] }))} />
            <SliderField label="Units completed" value={done} onChange={setDone} min={1} max={240} step={1} />
            <SliderField label="Units remaining" value={left} onChange={setLeft} min={0} max={240} step={1} />
          </div>
        </Card>

        <div className="s7 stack">
          <Card className="pad-lg calc-hero">
            <div className="halftone flow calc-hero__art" aria-hidden />
            <span className="mono">Highest class within reach</span>
            <h2 className="calc-hero__class serif">
              <ClassDot c={best.class} size={12} />
              <TextReveal key={best.class} text={best.class} />
            </h2>
            <div className="calc-hero__need">
              <Swap k={bestNeed === null ? "secured" : "need"}>
                {bestNeed === null ? (
                  <span className="t2">Secured as long as you pass your remaining courses.</span>
                ) : (
                  <>
                    <span className="calc-hero__num"><AnimatedNumber value={bestNeed} decimals={2} duration={0.5} /></span>
                    <span className="t2">average needed from now on</span>
                  </>
                )}
              </Swap>
            </div>
          </Card>
          <Card>
            <CardHead icon={TargetIcon} title="Every class" />
            <TargetBars targets={targets} current={c} animateKey="calc" />
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
