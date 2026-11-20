import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRightIcon, ChartSquareIcon, HistoryIcon, StarsIcon, ListIcon } from "@solar-icons/react/linear";
import { api, CLASS_COLOR, CLASS_FLOOR, SHORT, pct } from "../api";
import { ease, rise, stagger } from "../lib/motion";
import { Alert, BeamButton, Card, CardHead, ClassDot, Empty, Stat } from "../components/ui.jsx";
import { AreaLine } from "../charts/AreaLine.jsx";

const when = (iso) => new Date(iso + (iso.endsWith("Z") ? "" : "Z"));
const THRESHOLDS = ["First Class", "Second Class Upper", "Second Class Lower"].map((c) => ({ c, v: CLASS_FLOOR[c] }));

export default function History() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");
  const nav = useNavigate();
  useEffect(() => { api("/api/predictions/me").then(setRows).catch((e) => setErr(e.message)); }, []);

  const points = useMemo(() => {
    if (!rows) return [];
    const day = (r) => when(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const sameDay = new Set(rows.map(day)).size === 1; // all on one day: label the axis by time instead
    return [...rows].sort((a, b) => when(a.created_at) - when(b.created_at)).map((r) => ({
      x: sameDay && rows.length > 1 ? when(r.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : day(r),
      y: r.cgpa_so_far,
      color: CLASS_COLOR[r.predicted_class],
      tip: (
        <>
          <div className="tip__title">{when(r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
          <div className="tip__row"><span>CGPA so far</span><b>{r.cgpa_so_far.toFixed(2)}</b></div>
          <div className="tip__row"><span className="key"><span className="dot" style={{ background: CLASS_COLOR[r.predicted_class] }} />{SHORT[r.predicted_class]}</span><b>{pct(r.confidence)}</b></div>
        </>
      ),
    }));
  }, [rows]);

  const latest = rows && rows.length ? rows.reduce((a, b) => (when(a.created_at) > when(b.created_at) ? a : b)) : null;

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
      <div className="page-head">
        <motion.h1 variants={rise} className="page-title">History</motion.h1>
      </div>
      {err && <Alert>{err}</Alert>}

      {!rows && !err && (
        <div className="grid">
          <div className="s8 shimmer" style={{ height: 320 }} />
          <div className="s4 shimmer" style={{ height: 320 }} />
        </div>
      )}

      {rows && rows.length === 0 && (
        <Card>
          <Empty icon={HistoryIcon} title="No predictions yet">
            <BeamButton small onClick={() => nav("/predict")}>Make your first<ArrowRightIcon size={16} className="arrow" /></BeamButton>
          </Empty>
        </Card>
      )}

      {rows && rows.length > 0 && (
        <div className="grid">
          <Card className="s8">
            <CardHead icon={ChartSquareIcon} title="CGPA at each prediction" />
            <AreaLine points={points} thresholds={THRESHOLDS} height={260} label="CGPA at each prediction" />
          </Card>
          <div className="s4 stack">
            <Stat icon={StarsIcon} label="Predictions" value={rows.length} />
            <Card className="stat">
              <div className="stat__label"><HistoryIcon size={16} />Latest outlook</div>
              <div className="latest">
                <ClassDot c={latest.predicted_class} size={10} />
                <span className="serif">{latest.predicted_class}</span>
              </div>
              <div className="stat__foot">{pct(latest.confidence)} likely · CGPA {latest.cgpa_so_far.toFixed(2)}</div>
            </Card>
          </div>

          <Card className="s12">
            <CardHead icon={ListIcon} title="All predictions" />
            <div className="table-scroll">
              <table className="tbl">
                <thead>
                  <tr><th>Date</th><th>Stage</th><th>Predicted class</th><th>Confidence</th><th className="r">CGPA</th><th>Model</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr key={r.prediction_id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.25 + Math.min(i, 20) * 0.03, ease }}>
                      <td className="t2 num">{when(r.created_at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td><span className="chip">{r.stage}00 Level</span></td>
                      <td><span className="cls"><ClassDot c={r.predicted_class} />{r.predicted_class}</span></td>
                      <td>
                        <span className="cls">
                          <span className="minibar"><span style={{ width: pct(r.confidence) }} /></span>
                          <span className="num">{pct(r.confidence)}</span>
                        </span>
                      </td>
                      <td className="r num">{r.cgpa_so_far.toFixed(2)}</td>
                      <td className="t2">{r.model_name}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
