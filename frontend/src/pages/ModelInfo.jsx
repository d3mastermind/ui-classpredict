import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChartSquareIcon, CpuBoltIcon, GraphNewUpIcon, LayersMinimalisticIcon, ListIcon, RadarIcon, RankingIcon, TargetIcon, Widget4Icon } from "@solar-icons/react/linear";
import { api, pct } from "../api";
import { rise, stagger } from "../lib/motion";
import { Card, CardHead, Segmented, Stat, Swap } from "../components/ui.jsx";
import { AccuracyLines, ConfusionGrid, ImportanceBars, MODELS, ModelLegend, Radar } from "../charts/ModelCharts.jsx";

const NICE = {
  cgpa_so_far: "CGPA so far", latest_gpa: "Latest GPA", gpa_trend: "GPA trend", carryovers_by_300l: "Carry-overs",
  utme_score: "UTME score", olevel_points: "O’Level points", faculty: "Faculty", entry_mode: "Entry mode",
};
const nice = (k) => NICE[k] || k.replace(/gpa_(\d)00_(\d)/, (_, l, s) => `GPA ${l}00L · ${s}`);

export default function ModelInfo() {
  const [m, setM] = useState(null);
  const [stage, setStage] = useState("3");
  const [focus, setFocus] = useState(null);
  useEffect(() => { api("/api/model/metrics").then(setM).catch(() => {}); }, []);

  if (!m) {
    return (
      <div>
        <div className="page-head"><h1 className="page-title">Model</h1></div>
        <div className="grid">{[0, 1, 2, 3].map((i) => <div key={i} className="s3 shimmer" style={{ height: 140 }} />)}</div>
      </div>
    );
  }

  const st = m.stages[stage];
  const best = st.models[st.best_model];
  const f = focus && MODELS.includes(focus) ? focus : st.best_model;
  const imp = st.feature_importance.slice(0, 8).map((d) => ({ name: nice(d.feature), v: Math.max(d.importance, 0) }));

  return (
    <motion.div variants={stagger(0.06)} initial="hidden" animate="show">
      <div className="page-head">
        <motion.h1 variants={rise} className="page-title">Model</motion.h1>
        <motion.div variants={rise}>
          <Segmented value={stage} onChange={(s) => { setStage(s); setFocus(null); }} label="Stage"
            options={["1", "2", "3"].map((s) => [s, m.stages[s].label.replace("End of ", "")])} />
        </motion.div>
      </div>

      <div className="grid">
        <div className="s3">
          <Card className="stat">
            <div className="stat__label"><CpuBoltIcon size={16} />Model in use</div>
            <div className="stat__value" style={{ fontSize: 26 }}><Swap k={st.best_model}>{st.best_model}</Swap></div>
            <div className="stat__foot">{st.label}</div>
          </Card>
        </div>
        <div className="s3"><Stat icon={TargetIcon} label="Test accuracy" value={best.accuracy * 100} decimals={1} suffix="%" foot={`5-fold CV ${pct(best.cv_accuracy_mean, 1)}`} /></div>
        <div className="s3"><Stat icon={RankingIcon} label="Macro F1" value={best.macro_f1} decimals={3} foot="Every class weighted equally" /></div>
        <div className="s3"><Stat icon={LayersMinimalisticIcon} label="Within one class" value={best.within_one_class * 100} decimals={0} suffix="%" foot="Never more than one class off" /></div>

        <motion.div variants={rise} className="s12 legend-bar">
          <ModelLegend focus={f} setFocus={setFocus} best={st.best_model} />
        </motion.div>

        <Card className="s6">
          <CardHead icon={GraphNewUpIcon} title="Accuracy as results come in" />
          <AccuracyLines stages={m.stages} focus={f} />
        </Card>
        <Card className="s6">
          <CardHead icon={RadarIcon} title={<Swap k={f}>{f}</Swap>} />
          <Radar models={st.models} focus={f} />
        </Card>

        <Card className="s6">
          <CardHead icon={Widget4Icon} title="Confusion matrix">
            <span className="mono">{st.best_model} · {st.test_size} test records</span>
          </CardHead>
          <ConfusionGrid key={stage} matrix={best.confusion_matrix} />
        </Card>
        <Card className="s6">
          <CardHead icon={ChartSquareIcon} title="What the model relies on" />
          <ImportanceBars key={stage} items={imp} />
        </Card>

        <Card className="s12">
          <CardHead icon={ListIcon} title="All four models" />
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr><th>Model</th><th className="r">Accuracy</th><th className="r">Macro F1</th><th className="r">Precision</th><th className="r">Recall</th><th className="r">CV accuracy</th></tr>
              </thead>
              <tbody>
                {MODELS.map((md) => {
                  const r = st.models[md];
                  return (
                    <tr key={md} onPointerEnter={() => setFocus(md)} className={md === f ? "is-focus" : ""}>
                      <td><span className="cls"><span className="line-key" style={{ background: md === f ? "var(--accent)" : "var(--text-3)" }} />{md}{md === st.best_model && <span className="chip accent" style={{ height: 20, fontSize: 11, padding: "0 7px" }}>In use</span>}</span></td>
                      <td className="r num">{pct(r.accuracy, 1)}</td>
                      <td className="r num">{r.macro_f1.toFixed(3)}</td>
                      <td className="r num">{r.macro_precision.toFixed(3)}</td>
                      <td className="r num">{r.macro_recall.toFixed(3)}</td>
                      <td className="r num">{pct(r.cv_accuracy_mean, 1)} <span className="t3">± {pct(r.cv_accuracy_std, 1)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
