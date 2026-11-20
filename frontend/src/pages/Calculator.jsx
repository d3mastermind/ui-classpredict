import { useState } from "react";
import { api } from "../api";
import { Targets } from "../components/Bits.jsx";

export default function Calculator() {
  const [f, setF] = useState({ current_cgpa: "", units_completed: "", units_remaining: "" });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState("");
  const up = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      setRes(await api("/api/calculator", { method: "POST", body: {
        current_cgpa: Number(f.current_cgpa), units_completed: Number(f.units_completed), units_remaining: Number(f.units_remaining) } }));
    } catch (e2) { setErr(e2.message); setRes(null); }
  }

  return (
    <div>
      <header className="page-head">
        <h2>What I need</h2>
        <p className="muted">Find the average GPA you need in your remaining courses to finish in each class. You will find your units on your result slips.</p>
      </header>
      <div className="grid-2">
        <form className="card" onSubmit={submit}>
          <label>Current CGPA<input type="number" step="0.01" min="0" max="4" value={f.current_cgpa} onChange={up("current_cgpa")} required placeholder="e.g. 2.84" /></label>
          <label>Units completed so far<input type="number" min="1" max="400" value={f.units_completed} onChange={up("units_completed")} required placeholder="e.g. 126" /></label>
          <label>Units remaining<input type="number" min="0" max="400" value={f.units_remaining} onChange={up("units_remaining")} required placeholder="e.g. 42" /></label>
          {err && <div className="error">{err}</div>}
          <button className="btn primary wide">Calculate</button>
          <div className="formula">
            Needed GPA = (Target × (Units done + Units left) − CGPA × Units done) ÷ Units left
          </div>
        </form>
        <div className="card">
          {res ? <Targets targets={res.targets} /> : <div className="empty"><div className="empty-ic">÷</div><p>Your targets will show here.</p></div>}
        </div>
      </div>
    </div>
  );
}
