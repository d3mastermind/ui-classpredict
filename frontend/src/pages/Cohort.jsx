import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AltArrowDownIcon, AltArrowUpIcon, ChartSquareIcon, CloseCircleIcon, CloudUploadIcon, CupStarIcon, DangerTriangleIcon,
  DownloadMinimalisticIcon, FileTextIcon, HistoryIcon, MagnifierIcon, PieChart2Icon, UsersGroupRoundedIcon, UploadMinimalisticIcon,
  ListIcon, ShieldWarningIcon,
} from "@solar-icons/react/linear";
import { api, CLASSES, pct } from "../api";
import { ease, rise, stagger } from "../lib/motion";
import { Alert, PrimaryButton, Card, CardHead, ClassDot, RiskChip, Segmented, Stat, Swap } from "../components/ui.jsx";
import { ClassColumns, RiskBar } from "../charts/CohortCharts.jsx";

function Dropzone({ file, setFile }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (f) => { if (f) setFile(f); };
  return (
    <div
      className={`drop${over ? " over" : ""}${file ? " has" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files[0]); }}
    >
      <div className="drop__art halftone flow" aria-hidden />
      <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} />
      <AnimatePresence mode="wait" initial={false}>
        {file ? (
          <motion.div key="file" className="drop__file" initial={{ opacity: 0, scale: 0.94, filter: "blur(6px)" }} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.35, ease }}>
            <span className="drop__icon"><FileTextIcon size={22} /></span>
            <div className="drop__meta">
              <div>{file.name}</div>
              <div className="mono">{(file.size / 1024).toFixed(1)} KB · CSV</div>
            </div>
            <button type="button" className="icon-btn" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} aria-label="Remove file">
              <CloseCircleIcon size={19} />
            </button>
          </motion.div>
        ) : (
          <motion.button key="pick" type="button" className="drop__pick" onClick={() => input.current?.click()}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <motion.span className="drop__icon" animate={over ? { y: -4, scale: 1.08 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
              <CloudUploadIcon size={24} />
            </motion.span>
            <span>Drop a CSV here or <u>browse</u></span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

const SORTS = { cgpa: (r) => r.cgpa_so_far, conf: (r) => r.confidence, third: (r) => r.probabilities["Third Class"] || 0 };

export default function Cohort() {
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [past, setPast] = useState([]);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ k: "third", dir: -1 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const loadPast = () => api("/api/batch").then(setPast).catch(() => {});
  useEffect(() => { loadPast(); }, []);

  async function upload(e) {
    e.preventDefault();
    if (!file) { setErr("Choose a CSV file first."); return; }
    setErr("");
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try { setRes(await api("/api/batch", { method: "POST", form })); loadPast(); setFile(null); }
    catch (e2) { setErr(e2.message); }
    finally { setBusy(false); }
  }

  async function downloadTemplate() {
    try {
      const text = await api("/api/batch/template");
      const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "classpredict_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e2) { setErr(e2.message); }
  }

  const derived = useMemo(() => {
    if (!res) return null;
    const risk = { High: 0, Watch: 0, Low: 0 };
    const byClass = CLASSES.map((c) => ({ class: c, total: 0, risk: 0 }));
    res.results.forEach((r) => {
      risk[r.risk] = (risk[r.risk] || 0) + 1;
      const row = byClass[CLASSES.indexOf(r.predicted_class)];
      if (row) { row.total += 1; if (r.risk !== "Low") row.risk += 1; }
    });
    return { risk, byClass };
  }, [res]);

  const rows = useMemo(() => {
    if (!res) return [];
    const needle = q.trim().toLowerCase();
    return res.results
      .filter((r) => filter === "all" || (filter === "risk" ? r.risk !== "Low" : r.risk === filter))
      .filter((r) => !needle || String(r.matric_no || "").toLowerCase().includes(needle) || r.predicted_class.toLowerCase().includes(needle))
      .sort((a, b) => (SORTS[sort.k](a) - SORTS[sort.k](b)) * sort.dir);
  }, [res, filter, q, sort]);

  const th = (k, label) => (
    <th className="sortable r" onClick={() => setSort((s) => ({ k, dir: s.k === k ? -s.dir : -1 }))} aria-sort={sort.k === k ? (sort.dir < 0 ? "descending" : "ascending") : "none"}>
      <span className="sort-head">{label}{sort.k === k && (sort.dir < 0 ? <AltArrowDownIcon size={12} /> : <AltArrowUpIcon size={12} />)}</span>
    </th>
  );

  return (
    <motion.div variants={stagger(0.07)} initial="hidden" animate="show">
      <div className="page-head">
        <motion.h1 variants={rise} className="page-title">Cohort</motion.h1>
        <motion.div variants={rise}>
          <button type="button" className="btn" onClick={downloadTemplate}><DownloadMinimalisticIcon size={16} />CSV template</button>
        </motion.div>
      </div>

      <div className="grid">
        <Card as="form" className="s12 upload" onSubmit={upload}>
          <Dropzone file={file} setFile={setFile} />
          <div className="upload__side">
            <PrimaryButton wide busy={busy} type="submit" disabled={!file && !busy}>
              <Swap k={busy ? "b" : "i"}>
                {busy ? "Predicting cohort" : "Upload and predict"}
                {!busy && <UploadMinimalisticIcon size={18} className="arrow" />}
              </Swap>
            </PrimaryButton>
            {past.length > 0 && (
              <div className="recent">
                <span className="mono"><HistoryIcon size={13} />Recent</span>
                <div className="recent__list">
                  {past.slice(0, 5).map((b) => (
                    <button type="button" key={b.batch_id} className="recent__item" onClick={() => api(`/api/batch/${b.batch_id}`).then(setRes).catch((e2) => setErr(e2.message))}>
                      <FileTextIcon size={15} />
                      <span className="recent__name">{b.file_name}</span>
                      <span className="num t3">{b.row_count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <AnimatePresence>{err && <div className="upload__err"><Alert key="err">{err}</Alert></div>}</AnimatePresence>
        </Card>
      </div>

      <AnimatePresence mode="wait">
        {res && derived && (
          <motion.div key={res.batch_id} className="cohort-results" variants={stagger(0.06)} initial="hidden" animate="show" exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 0.2 } }}>
            <div className="grid">
              <div className="s3"><Stat icon={UsersGroupRoundedIcon} label="Students" value={res.processed} foot={res.file_name} /></div>
              <div className="s3"><Stat icon={ShieldWarningIcon} label="Need attention" value={res.at_risk} foot={`${pct(res.at_risk / Math.max(1, res.processed))} of cohort`} /></div>
              <div className="s3"><Stat icon={CupStarIcon} label="Predicted First" value={res.class_counts["First Class"]} foot={`${pct(res.class_counts["First Class"] / Math.max(1, res.processed))} of cohort`} /></div>
              <div className="s3"><Stat icon={DangerTriangleIcon} label="Rows with errors" value={res.errors.length} foot={res.errors.length ? "Listed below" : "None"} /></div>

              <Card className="s7">
                <CardHead icon={ChartSquareIcon} title="Expected class spread" />
                <ClassColumns rows={derived.byClass} />
              </Card>
              <Card className="s5">
                <CardHead icon={PieChart2Icon} title="Risk mix" />
                <RiskBar counts={derived.risk} />
                <div className="watchlist">
                  <span className="mono">Highest chance of Third</span>
                  {[...res.results].sort((a, b) => (b.probabilities["Third Class"] || 0) - (a.probabilities["Third Class"] || 0)).slice(0, 4).map((r, i) => (
                    <div className="watchlist__row" key={`${r.matric_no}-${i}`}>
                      <span className="num">{r.matric_no || "—"}</span>
                      <span className="minibar" style={{ width: 90 }}><span style={{ width: pct(r.probabilities["Third Class"] || 0), background: "var(--c-third)" }} /></span>
                      <span className="num">{pct(r.probabilities["Third Class"] || 0)}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="s12">
                <CardHead icon={ListIcon} title={<>Students <span className="count num">{rows.length}</span></>}>
                  <div className="table-tools">
                    <div className="input-wrap search">
                      <MagnifierIcon className="lead" size={17} />
                      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search matric or class" aria-label="Search students" />
                    </div>
                    <Segmented size="sm" value={filter} onChange={setFilter} options={[["all", "All"], ["risk", "Need attention"], ["High", "High risk"]]} label="Filter students" />
                  </div>
                </CardHead>
                <div className="table-scroll tall">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Matric no.</th><th>Stage</th>
                        {th("cgpa", "CGPA")}
                        <th>Predicted class</th>
                        {th("conf", "Confidence")}
                        {th("third", "P(Third)")}
                        <th>Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {rows.map((r, i) => (
                          <motion.tr key={`${r.matric_no}-${r.row ?? i}`} layout="position"
                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.35, delay: Math.min(i, 16) * 0.02, ease }}>
                            <td className="num">{r.matric_no || "—"}</td>
                            <td className="t2">{r.stage}00 L</td>
                            <td className="r num">{r.cgpa_so_far.toFixed(2)}</td>
                            <td><span className="cls"><ClassDot c={r.predicted_class} />{r.predicted_class}</span></td>
                            <td className="r num">{pct(r.confidence)}</td>
                            <td className="r num">{pct(r.probabilities["Third Class"] || 0)}</td>
                            <td><RiskChip risk={r.risk} /></td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {rows.length === 0 && <div className="no-rows t2">No students match.</div>}
                </div>
              </Card>

              {res.errors.length > 0 && (
                <Card className="s12">
                  <CardHead icon={DangerTriangleIcon} title="Rows that could not be processed" />
                  <table className="tbl">
                    <thead><tr><th>Row</th><th>Matric no.</th><th>Problem</th></tr></thead>
                    <tbody>
                      {res.errors.map((e) => (
                        <tr key={e.row}><td className="num t2">{e.row}</td><td className="num">{e.matric_no || "—"}</td><td style={{ whiteSpace: "normal" }}>{e.error}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
