import { useEffect, useState } from "react";
import { api, CLASS_COLOR, pct } from "../api";

export default function History() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/api/predictions/me").then(setRows).catch((e) => setErr(e.message)); }, []);

  return (
    <div>
      <header className="page-head">
        <h2>Prediction history</h2>
        <p className="muted">Every prediction you make is saved here, so you can see how your outlook changes from semester to semester.</p>
      </header>
      <div className="card">
        {err && <div className="error">{err}</div>}
        {rows && rows.length === 0 && <div className="empty"><p>No predictions yet. Go to <b>Predict my class</b> to make your first one.</p></div>}
        {rows && rows.length > 0 && (
          <table className="tbl">
            <thead><tr><th>Date</th><th>Stage</th><th>Model</th><th>CGPA so far</th><th>Predicted class</th><th>Confidence</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.prediction_id}>
                  <td>{new Date(r.created_at + (r.created_at.endsWith("Z") ? "" : "Z")).toLocaleString()}</td>
                  <td>Stage {r.stage}</td>
                  <td>{r.model_name}</td>
                  <td className="num">{r.cgpa_so_far.toFixed(2)}</td>
                  <td><span className="dot" style={{ background: CLASS_COLOR[r.predicted_class] }} />{r.predicted_class}</td>
                  <td className="num">{pct(r.confidence)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
