import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, CLASSES, pct } from "../api";
import { Stat } from "../components/Bits.jsx";

const MODELS = ["Logistic Regression", "Decision Tree", "Random Forest", "Gradient Boosting"];
const MCOLOR = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
const NICE = { cgpa_so_far: "CGPA so far", latest_gpa: "Latest GPA", gpa_trend: "GPA trend", carryovers_by_300l: "Carry-overs",
  utme_score: "UTME score", olevel_points: "O'Level points", faculty: "Faculty", entry_mode: "Entry mode" };
const nice = (k) => NICE[k] || k.replace(/gpa_(\d)00_(\d)/, (_, l, s) => `GPA ${l}00L sem ${s}`);

export default function ModelInfo() {
  const [m, setM] = useState(null);
  const [stage, setStage] = useState("3");
  useEffect(() => { api("/api/model/metrics").then(setM); }, []);
  if (!m) return <div className="card">Loading...</div>;

  const st = m.stages[stage];
  const best = st.models[st.best_model];
  const line = ["1", "2", "3"].map((s) => {
    const o = { name: m.stages[s].label.replace("End of ", "") };
    MODELS.forEach((md) => { o[md] = +(m.stages[s].models[md].accuracy * 100).toFixed(1); });
    return o;
  });
  const imp = st.feature_importance.slice(0, 8).map((d) => ({ name: nice(d.feature), v: Math.max(d.importance, 0) }));

  return (
    <div>
      <header className="page-head">
        <h2>Model performance</h2>
        <p className="muted">Four models were trained at each stage on {m.dataset.records.toLocaleString()} simulated records and tested on 20% held back. The best model (by macro F1) is used for predictions.</p>
      </header>
      <div className="seg">
        <span>Stage</span>
        {["1", "2", "3"].map((s) => <button key={s} className={stage === s ? "on" : ""} onClick={() => setStage(s)}>{m.stages[s].label}</button>)}
      </div>
      <div className="stats">
        <Stat label="Model in use" value={st.best_model} sub={st.label} />
        <Stat label="Test accuracy" value={pct(best.accuracy, 1)} sub={`5-fold CV ${pct(best.cv_accuracy_mean, 1)}`} />
        <Stat label="Macro F1" value={best.macro_f1.toFixed(3)} sub="Treats every class equally" />
        <Stat label="Within one class" value={pct(best.within_one_class)} sub="Never more than one class off" />
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Accuracy as more results come in</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={line} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="#e4e3df" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#e4e3df" }} tick={{ fill: "#52514e", fontSize: 12 }} />
              <YAxis domain={[60, 100]} unit="%" tickLine={false} axisLine={false} tick={{ fill: "#52514e", fontSize: 12 }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {MODELS.map((md, i) => <Line key={md} dataKey={md} stroke={MCOLOR[i]} strokeWidth={2} dot={{ r: 4 }} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3>What the model relies on most</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={imp} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fill: "#52514e", fontSize: 12 }} />
              <Tooltip formatter={(v) => v.toFixed(3)} cursor={{ fill: "#f2f1ed" }} />
              <Bar dataKey="v" name="Importance" fill="#2a78d6" radius={[0, 4, 4, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>All four models at this stage</h3>
          <table className="tbl">
            <thead><tr><th>Model</th><th>Accuracy</th><th>Macro F1</th><th>Precision</th><th>Recall</th><th>CV accuracy</th></tr></thead>
            <tbody>{MODELS.map((md) => { const r = st.models[md]; return (
              <tr key={md} className={md === st.best_model ? "hl" : ""}>
                <td>{md}{md === st.best_model ? " ★" : ""}</td><td className="num">{pct(r.accuracy, 1)}</td><td className="num">{r.macro_f1.toFixed(3)}</td>
                <td className="num">{r.macro_precision.toFixed(3)}</td><td className="num">{r.macro_recall.toFixed(3)}</td>
                <td className="num">{pct(r.cv_accuracy_mean, 1)} ± {pct(r.cv_accuracy_std, 1)}</td></tr>); })}
            </tbody>
          </table>
        </div>
        <div className="card">
          <h3>Confusion matrix ({st.best_model})</h3>
          <table className="tbl cm">
            <thead><tr><th>Actual ↓ / Predicted →</th>{CLASSES.map((c) => <th key={c}>{c.replace("Second Class ", "2nd ")}</th>)}</tr></thead>
            <tbody>{best.confusion_matrix.map((row, i) => {
              const tot = row.reduce((a, b) => a + b, 0);
              return (<tr key={i}><th>{CLASSES[i]}</th>{row.map((v, j) => (
                <td key={j} className="num" style={{ background: `rgba(42,120,214,${(v / tot) * 0.85})`, color: v / tot > 0.55 ? "white" : "#0b0b0b" }}>{v}</td>))}</tr>);
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
