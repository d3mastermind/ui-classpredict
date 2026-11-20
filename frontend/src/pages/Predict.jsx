import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRightIcon, ChartSquareIcon, LightbulbMinimalisticIcon, NotebookMinimalisticIcon, SpeedometerMiddleIcon, TargetIcon,
} from "@solar-icons/react/linear";
import { api, CLASS_COLOR, CLASS_FLOOR, classForGpa, pct } from "../api";
import { ease, rise, stagger } from "../lib/motion";
import {
  Alert, AnimatedNumber, PrimaryButton, Card, CardHead, Hint, NumberField, Segmented, Select, Swap, TextField, TextReveal,
} from "../components/ui.jsx";
import { ProbabilityRings, RingsPlaceholder } from "../charts/Rings.jsx";
import { CgpaGauge } from "../charts/Gauge.jsx";
import { AreaLine } from "../charts/AreaLine.jsx";
import { TargetBars } from "../charts/TargetBars.jsx";

const LEVELS = [100, 200, 300];
const GPA_KEYS = ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2", "gpa_300_1", "gpa_300_2"];
const EMPTY = {
  matric_no: "", faculty: "Science", entry_mode: "UTME", utme_score: "", olevel_points: "", carryovers: "0",
  gpa_100_1: "", gpa_100_2: "", gpa_200_1: "", gpa_200_2: "", gpa_300_1: "", gpa_300_2: "",
};
const THRESHOLDS = ["First Class", "Second Class Upper", "Second Class Lower"].map((c) => ({ c, v: CLASS_FLOOR[c] }));

function GpaCell({ level, sem, value, onChange, off }) {
  const v = parseFloat(value);
  const ok = !off && value !== "" && !Number.isNaN(v) && v >= 0 && v <= 4;
  return (
    <div className={`gpa-cell${off ? " off" : ""}`}>
      <span className="gpa-cell__sem mono">Sem {sem}</span>
      <input
        type="number" inputMode="decimal" step="0.01" min="0" max="4"
        value={off ? "" : value} onChange={(e) => onChange(e.target.value)} disabled={off}
        placeholder={off ? "n/a" : "0.00"} aria-label={`${level} Level semester ${sem} GPA`}
      />
      <span className="gpa-cell__bar" style={{ width: ok ? `${(v / 4) * 100}%` : "0%", background: ok ? CLASS_COLOR[classForGpa(v)] : "transparent" }} />
    </div>
  );
}

function EmptyResult({ meta }) {
  return (
    <Card className="result-empty" initial="hidden" animate="show" exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)", transition: { duration: 0.25 } }}>
      <div className="empty__art halftone flow" aria-hidden />
      <RingsPlaceholder />
      <div className="result-empty__title">Your forecast appears here</div>
      {meta && (
        <div className="result-empty__acc">
          {Object.values(meta.stages).map((s) => (
            <div key={s.label}>
              <span className="mono">{s.label.replace("End of ", "")}</span>
              <span className="num">{pct(s.accuracy)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Result({ res, points }) {
  return (
    <motion.div className="stack" variants={stagger(0.08)} initial="hidden" animate="show"
      exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.22 } }}>
      <Card className="hero pad-lg">
        <div className="hero__top">
          <span className="mono">Most likely final class</span>
          <div className="hero__meta">
            <span className="chip">{res.stage_label}</span>
            <span className="chip">{res.model_name} · {pct(res.stage_accuracy, 1)}</span>
          </div>
        </div>
        <h2 className="hero__class serif">
          <TextReveal key={res.predicted_class} text={res.predicted_class} delay={0.15} />
        </h2>
        <ProbabilityRings probs={res.probabilities} top={res.predicted_class} />
      </Card>

      <div className="split">
        <Card>
          <CardHead icon={SpeedometerMiddleIcon} title="CGPA so far" />
          <CgpaGauge value={res.cgpa_so_far} />
        </Card>
        <Card>
          <CardHead icon={ChartSquareIcon} title="Semester GPAs" />
          <AreaLine points={points} thresholds={THRESHOLDS} height={236} label="Semester GPAs entered" />
        </Card>
      </div>

      <Card>
        <CardHead icon={TargetIcon} title="What you need from here">
          <Hint>Average GPA needed across your remaining semesters, assuming about 21 units per semester. Use What I need for exact units.</Hint>
        </CardHead>
        <TargetBars targets={res.targets} current={res.cgpa_so_far} animateKey={res.predicted_class + res.cgpa_so_far} />
      </Card>

      <Card className="advice">
        <span className="advice__icon"><LightbulbMinimalisticIcon size={20} /></span>
        <p>{res.advice}</p>
      </Card>
    </motion.div>
  );
}

export default function Predict({ user }) {
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [res, setRes] = useState(null);
  const [points, setPoints] = useState([]);
  const [runs, setRuns] = useState(0);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/meta").then(setMeta).catch(() => {});
    if (user.role === "student") {
      api("/api/profile").then((p) => {
        if (!p) return;
        const g = {};
        Object.keys(EMPTY).forEach((k) => { if (p[k] !== undefined && p[k] !== null) g[k] = String(p[k]); });
        setF((old) => ({ ...old, ...g }));
      }).catch(() => {});
    }
  }, [user.role]);

  const set = (k) => (v) => setF((o) => ({ ...o, [k]: v }));
  const isDE = f.entry_mode === "DE";

  const live = useMemo(() => {
    const vals = GPA_KEYS.filter((k) => !(isDE && k.startsWith("gpa_100")))
      .map((k) => parseFloat(f[k])).filter((v) => !Number.isNaN(v) && v >= 0 && v <= 4);
    // round like the API (Python round on the float mean) so the live figure matches the result
    return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)) : null;
  }, [f, isDE]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const num = (v) => (v === "" || v === null ? null : Number(v));
    const body = {
      matric_no: f.matric_no || null, faculty: f.faculty, entry_mode: f.entry_mode,
      utme_score: isDE ? null : num(f.utme_score), olevel_points: num(f.olevel_points), carryovers: num(f.carryovers) || 0,
    };
    GPA_KEYS.forEach((k) => { body[k] = isDE && k.startsWith("gpa_100") ? null : num(f[k]); });
    try {
      const r = await api("/api/predict", { method: "POST", body });
      if (!r.stage) { setErr(r.message || "Enter more results to get a prediction."); setRes(null); return; }
      const pts = [];
      LEVELS.forEach((L) => [1, 2].forEach((s) => {
        const v = body[`gpa_${L}_${s}`];
        if (v !== null && v !== undefined) pts.push({ x: `${L}·${s}`, y: v, color: CLASS_COLOR[classForGpa(v)] });
      }));
      setPoints(pts);
      setRes(r);
      setRuns((n) => n + 1);
      if (window.innerWidth < 1080) setTimeout(() => document.querySelector(".result-col")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (e2) {
      setErr(e2.message);
      setRes(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
      <div className="page-head">
        <motion.h1 variants={rise} className="page-title">Predict <em>your class</em></motion.h1>
      </div>
      <div className="grid">
        <Card as="form" className="s5 predict-form" onSubmit={submit}>
          <CardHead icon={NotebookMinimalisticIcon} title="Your results">
            <span className="live-cgpa" aria-live="polite">
              <span className="mono">CGPA</span>
              {live === null ? <span className="t3">—</span> : <AnimatedNumber value={live} decimals={2} duration={0.6} />}
            </span>
          </CardHead>

          <div className="form-stack">
            <div className="row">
              <Select label="Faculty" value={f.faculty} options={meta ? meta.faculties : [EMPTY.faculty]} onChange={set("faculty")} />
              <TextField label="Matric no." optional value={f.matric_no} onChange={set("matric_no")} placeholder="223456" />
            </div>

            <div className="field">
              <div className="field__label">Entry mode</div>
              <Segmented block value={f.entry_mode} onChange={set("entry_mode")} options={[["UTME", "UTME"], ["DE", "Direct entry"]]} label="Entry mode" />
            </div>

            <div className="row">
              <AnimatePresence initial={false} mode="popLayout">
                {!isDE && (
                  <motion.div key="utme" style={{ flex: 1, minWidth: 0 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3, ease }}>
                    <NumberField label="UTME" value={f.utme_score} onChange={set("utme_score")} min={180} max={400} required placeholder="180–400" />
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div layout transition={{ duration: 0.35, ease }} style={{ flex: 1, minWidth: 0 }}>
                <NumberField label="O’Level points" value={f.olevel_points} onChange={set("olevel_points")} min={5} max={30} required placeholder="5–30"
                  hint="Add up your five relevant O’Level subjects: A1 = 6, B2 = 5, B3 = 4, C4 = 3, C5 = 2, C6 = 1." />
              </motion.div>
              <motion.div layout transition={{ duration: 0.35, ease }} style={{ flex: 1, minWidth: 0 }}>
                <NumberField label="Carry-overs" value={f.carryovers} onChange={set("carryovers")} min={0} max={60} stepper />
              </motion.div>
            </div>

            <div className="gpa">
              <div className="gpa__head">
                <span className="field__label">Semester GPAs</span>
                <span className="mono">0.00 – 4.00</span>
              </div>
              {LEVELS.map((L) => {
                const off = isDE && L === 100;
                return (
                  <div className={`gpa__row${off ? " off" : ""}`} key={L}>
                    <span className="gpa__lvl">{L}<span className="t3">L</span></span>
                    {[1, 2].map((s) => (
                      <GpaCell key={s} level={L} sem={s} off={off} value={f[`gpa_${L}_${s}`]} onChange={set(`gpa_${L}_${s}`)} />
                    ))}
                  </div>
                );
              })}
            </div>

            <AnimatePresence>{err && <Alert key="err">{err}</Alert>}</AnimatePresence>

            <PrimaryButton wide busy={busy} type="submit">
              <Swap k={busy ? "busy" : "idle"}>
                {busy ? "Reading your results" : res ? "Predict again" : "Predict my class"}
                {!busy && <ArrowRightIcon size={18} className="arrow" />}
              </Swap>
            </PrimaryButton>
          </div>
        </Card>

        <div className="s7 result-col">
          <AnimatePresence mode="wait">
            {res ? <Result key={`r${runs}`} res={res} points={points} /> : <EmptyResult key="empty" meta={meta} />}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
