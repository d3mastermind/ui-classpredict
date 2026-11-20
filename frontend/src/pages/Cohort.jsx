import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, CLASSES, CLASS_COLOR, SHORT, pct } from "../api";
import { RiskChip, Stat } from "../components/Bits.jsx";

export default function Cohort() {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [past, setPast] = useState([]);
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPast = () => api("/api/batch").then(setPast).catch(() => {});
  useEffect(() => { loadPast(); }, []);

  async function upload(e) {
    e.preventDefault();
    if (!file) { setErr("Choose a CSV file first."); return; }
    setErr(""); setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try { setRes(await api("/api/batch", { method: "POST", form })); loadPast(); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  async function downloadTemplate() {
    const text = await api("/api/batch/template");
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "classpredict_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const rows = res ? res.results.filter((r) => filter === "all" || (filter === "risk" ? r.risk !== "Low" : r.risk === filter)) : [];
  const chart = res ? CLASSES.map((c) => ({ name: SHORT[c], full: c, n: res.class_counts[c] })) : [];

  return (
    <div>
      <header className="page-head">
        <h2>Cohort upload</h2>
        <p className="muted">Upload a CSV of your students to see the expected class spread and who needs attention early.</p>
      </header>
      <div className="card upload">
        <form onSubmit={upload} className="upload-row">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} />
          <button className="btn primary" disabled={busy}>{busy ? "Processing..." : "Upload and predict"}</button>
          <button type="button" className="btn ghost" onClick={downloadTemplate}>Download CSV template</button>
        </form>
        {err && <div className="error">{err}</div>}
        {past.length > 0 && (
          <div className="past">Previous uploads:{" "}
            {past.slice(0, 6).map((b) => (
              <button key={b.batch_id} className="linkish" onClick={() => api(`/api/batch/${b.batch_id}`).then(setRes)}>
                {b.file_name} ({b.row_count})
              </button>
            ))}
          </div>
        )}
      </div>

      {res && (
        <>
          <div className="stats">
            <Stat label="Students processed" value={res.processed} sub={res.file_name} />
            <Stat label="Need attention" value={res.at_risk} sub="High risk or on watch" />
            <Stat label="Predicted First Class" value={res.class_counts["First Class"]} />
            <Stat label="Rows with errors" value={res.errors.length} sub={res.errors.length ? "See list below" : "None"} />
          </div>
          <div className="grid-2 wide-right">
            <div className="card">
              <h3>Expected class spread</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chart} margin={{ top: 20, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="name" tickLine={false} axisLine={{ stroke: "#e4e3df" }} tick={{ fill: "#52514e" }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#52514e", fontSize: 12 }} />
                  <Tooltip labelFormatter={(l, p) => (p && p[0] ? p[0].payload.full : l)} cursor={{ fill: "#f2f1ed" }} />
                  <Bar dataKey="n" name="Students" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    {chart.map((d) => <Cell key={d.full} fill={CLASS_COLOR[d.full]} />)}
                    <LabelList dataKey="n" position="top" style={{ fill: "#0b0b0b", fontSize: 12 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="table-head">
                <h3>Students</h3>
                <div className="seg small">
                  {[["all", "All"], ["risk", "Need attention"], ["High", "High risk"]].map(([k, t]) => (
                    <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="scroll">
                <table className="tbl">
                  <thead><tr><th>Matric no.</th><th>Stage</th><th>CGPA</th><th>Predicted class</th><th>Confidence</th><th>P(Third)</th><th>Risk</th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{r.matric_no || "-"}</td>
                        <td>{r.stage}</td>
                        <td className="num">{r.cgpa_so_far.toFixed(2)}</td>
                        <td><span className="dot" style={{ background: CLASS_COLOR[r.predicted_class] }} />{r.predicted_class}</td>
                        <td className="num">{pct(r.confidence)}</td>
                        <td className="num">{pct(r.probabilities["Third Class"] || 0)}</td>
                        <td><RiskChip risk={r.risk} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {res.errors.length > 0 && (
            <div className="card">
              <h3>Rows that could not be processed</h3>
              <table className="tbl">
                <thead><tr><th>Row</th><th>Matric no.</th><th>Problem</th></tr></thead>
                <tbody>{res.errors.map((e) => <tr key={e.row}><td>{e.row}</td><td>{e.matric_no || "-"}</td><td>{e.error}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
