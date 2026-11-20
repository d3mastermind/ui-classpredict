import { useEffect, useState } from "react";
import { api, CLASS_COLOR, pct } from "../api";
import { ProbabilityChart, Targets } from "../components/Bits.jsx";

const LEVELS = [100, 200, 300];
const EMPTY = { matric_no: "", faculty: "Science", entry_mode: "UTME", utme_score: "", olevel_points: "", carryovers: "0",
  gpa_100_1: "", gpa_100_2: "", gpa_200_1: "", gpa_200_2: "", gpa_300_1: "", gpa_300_2: "" };

export default function Predict({ user }) {
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState(EMPTY);
  const [res, setRes] = useState(null);
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

  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const isDE = f.entry_mode === "DE";

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const num = (v) => (v === "" || v === null ? null : Number(v));
    const body = {
      matric_no: f.matric_no || null, faculty: f.faculty, entry_mode: f.entry_mode,
      utme_score: isDE ? null : num(f.utme_score), olevel_points: num(f.olevel_points), carryovers: num(f.carryovers) || 0,
    };
    ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2", "gpa_300_1", "gpa_300_2"].forEach((k) => {
      body[k] = isDE && k.startsWith("gpa_100") ? null : num(f[k]);
    });
    try { setRes(await api("/api/predict", { method: "POST", body })); }
    catch (e2) { setErr(e2.message); setRes(null); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <header className="page-head">
        <h2>Predict my final class</h2>
        <p className="muted">Fill in the results you have so far. Leave later semesters blank; the system picks the right model for your stage.</p>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <h3>Your details</h3>
          <div className="row">
            <label>Faculty
              <select value={f.faculty} onChange={up("faculty")}>
                {(meta ? meta.faculties : [EMPTY.faculty]).map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>Matric no. <span className="muted">(optional)</span><input value={f.matric_no} onChange={up("matric_no")} placeholder="e.g. 223456" /></label>
          </div>
          <div className="seg">
            <span>Entry mode</span>
            {["UTME", "DE"].map((m) => (
              <button type="button" key={m} className={f.entry_mode === m ? "on" : ""} onClick={() => setF({ ...f, entry_mode: m })}>
                {m === "UTME" ? "UTME (from 100 Level)" : "Direct Entry (from 200 Level)"}
              </button>
            ))}
          </div>
          <div className="row three">
            {!isDE && <label>UTME score<input type="number" min="180" max="400" value={f.utme_score} onChange={up("utme_score")} required /></label>}
            <label title="Add the grade points of your five relevant O'Level subjects: A1=6, B2=5, B3=4, C4=3, C5=2, C6=1">O'Level points<input type="number" min="5" max="30" value={f.olevel_points} onChange={up("olevel_points")} required placeholder="5 - 30" /></label>
            <label>Carry-overs so far<input type="number" min="0" max="60" value={f.carryovers} onChange={up("carryovers")} /></label>
          </div>
          <p className="muted small">O'Level points: add up your five relevant subjects with A1 = 6, B2 = 5, B3 = 4, C4 = 3, C5 = 2, C6 = 1.</p>
          <h3>Semester GPAs <span className="muted">(0.00 - 4.00)</span></h3>
          <table className="gpa-grid">
            <thead><tr><th></th><th>1st semester</th><th>2nd semester</th></tr></thead>
            <tbody>
              {LEVELS.map((L) => (
                <tr key={L} className={isDE && L === 100 ? "off" : ""}>
                  <th>{L} Level</th>
                  {[1, 2].map((s) => (
                    <td key={s}><input type="number" step="0.01" min="0" max="4" disabled={isDE && L === 100}
                      value={isDE && L === 100 ? "" : f[`gpa_${L}_${s}`]} onChange={up(`gpa_${L}_${s}`)} placeholder={isDE && L === 100 ? "n/a" : "-"} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {err && <div className="error">{err}</div>}
          <button className="btn primary wide" disabled={busy}>{busy ? "Predicting..." : "Predict my class"}</button>
        </form>

        <div className="card result">
          {!res && (
            <div className="empty">
              <div className="empty-ic">◎</div>
              <p>Your prediction will show here.</p>
              <p className="muted small">Accuracy on test data: {meta ? Object.values(meta.stages).map((s) => `${s.label.replace("End of ", "")} ${pct(s.accuracy)}`).join(" · ") : "..."}</p>
            </div>
          )}
          {res && (
            <>
              <div className="muted small">Most likely final class</div>
              <div className="big-class" style={{ borderColor: CLASS_COLOR[res.predicted_class] }}>{res.predicted_class}</div>
              <div className="pills">
                <span className="pill">{pct(res.confidence)} likely</span>
                <span className="pill">CGPA so far {res.cgpa_so_far.toFixed(2)}</span>
                <span className="pill">{res.stage_label} model · {res.model_name} · {pct(res.stage_accuracy, 1)} test accuracy</span>
              </div>
              <h4>Chance of each class</h4>
              <ProbabilityChart probs={res.probabilities} />
              <p className="advice">{res.advice}</p>
              <h4>What you need from here</h4>
              <Targets targets={res.targets} note="Assumes about 21 units per semester for the rest of your programme. Use the What I need page for exact units." />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
