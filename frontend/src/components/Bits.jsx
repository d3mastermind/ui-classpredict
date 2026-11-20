import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CLASSES, CLASS_COLOR, SHORT, pct } from "../api";

export function ProbabilityChart({ probs }) {
  const data = CLASSES.map((c) => ({ name: SHORT[c], full: c, p: probs[c] || 0 }));
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 48, top: 4, bottom: 4 }} barCategoryGap={8}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis type="category" dataKey="name" width={44} tickLine={false} axisLine={false} tick={{ fill: "#52514e", fontSize: 13 }} />
        <Tooltip formatter={(v) => pct(v, 1)} labelFormatter={(l, p) => (p && p[0] ? p[0].payload.full : l)} cursor={{ fill: "#f2f1ed" }} />
        <Bar dataKey="p" radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d) => <Cell key={d.full} fill={CLASS_COLOR[d.full]} />)}
          <LabelList dataKey="p" position="right" formatter={(v) => pct(v)} style={{ fill: "#0b0b0b", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

const STATUS = {
  secured: { t: "Secured", c: "ok" },
  reachable: { t: "Reachable", c: "mid" },
  out_of_reach: { t: "Out of reach", c: "bad" },
};

export function Targets({ targets, note }) {
  return (
    <div>
      <table className="tbl">
        <thead><tr><th>Class</th><th>Needs CGPA</th><th>Average GPA you need from now</th><th>Status</th></tr></thead>
        <tbody>
          {targets.map((t) => (
            <tr key={t.class}>
              <td><span className="dot" style={{ background: CLASS_COLOR[t.class] }} />{t.class}</td>
              <td>{t.floor.toFixed(2)}+</td>
              <td className="num">{t.status === "secured" ? "Just pass your remaining courses" : t.status === "out_of_reach" ? `${t.required_gpa === null ? "-" : t.required_gpa.toFixed(2)} (above 4.00)` : t.required_gpa.toFixed(2)}</td>
              <td><span className={`chip ${STATUS[t.status].c}`}>{STATUS[t.status].t}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {note && <p className="muted small">{note}</p>}
    </div>
  );
}

export function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function RiskChip({ risk }) {
  const c = risk === "High" ? "bad" : risk === "Watch" ? "mid" : "ok";
  const icon = risk === "High" ? "▲" : risk === "Watch" ? "●" : "✓";
  return <span className={`chip ${c}`}>{icon} {risk}</span>;
}
