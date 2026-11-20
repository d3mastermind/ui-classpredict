"""Draws the design diagrams used in Chapters Two and Three (Graphviz + matplotlib)."""
import os
import subprocess

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Ellipse, FancyBboxPatch

OUT = os.path.dirname(os.path.abspath(__file__))
FONT = "Liberation Sans"
NAVY, GOLD, LIGHT, INK = "#123f78", "#c9a227", "#eef3fa", "#1d1d1b"


def dot(name, src):
    path = os.path.join(OUT, name + ".dot")
    open(path, "w").write(src)
    subprocess.run(["dot", "-Tpng", "-Gdpi=200", path, "-o", os.path.join(OUT, name + ".png")], check=True)
    os.remove(path)


COMMON = f'fontname="{FONT}"; node [fontname="{FONT}", fontsize=11, color="{NAVY}"]; edge [fontname="{FONT}", fontsize=9, color="#555555"];'

# ---------- Figure 2.1: conceptual framework ----------
dot("fig2_1_conceptual_framework", f"""
digraph G {{ rankdir=LR; {COMMON} nodesep=0.35; ranksep=0.5;
  node [shape=box, style="rounded,filled", fillcolor="{LIGHT}"];
  subgraph cluster_in {{ label="Inputs (what we know about the student)"; style="rounded,dashed"; color="#999999"; fontsize=11;
    a [label="Pre-admission factors\\nUTME score, O'Level points,\\nentry mode (UTME / DE)"];
    b [label="Early academic record\\nSemester GPAs, CGPA so far,\\nGPA trend, carry-overs"];
    c [label="Programme context\\nFaculty"];
  }}
  m [label="Prediction model\\n(supervised classification:\\nLR, DT, RF, GB)", fillcolor="{NAVY}", fontcolor="white"];
  o [label="Predicted final class\\nFirst / 2:1 / 2:2 / Third\\n+ probability of each"];
  i [label="Use of the prediction\\nEarly warning, academic advising,\\nstudent goal setting", fillcolor="#fbf5e3", color="{GOLD}"];
  a -> m; b -> m; c -> m; m -> o; o -> i;
  i -> b [style=dashed, label="better study habits\\nchange later GPAs", constraint=false];
}}""")

# ---------- Figure 3.1: methodology workflow ----------
dot("fig3_1_methodology", f"""
digraph G {{ rankdir=LR; {COMMON} nodesep=0.3; ranksep=0.35;
  node [shape=box, style="rounded,filled", fillcolor="{LIGHT}", width=1.5];
  s1 [label="1. Problem\\nunderstanding\\n(UI grading rules,\\nclass of degree)"];
  s2 [label="2. Data\\npreparation\\n(simulated records,\\ncleaning, features)"];
  s3 [label="3. Modelling\\n(LR, DT, RF, GB;\\ngrid search,\\n5-fold CV)"];
  s4 [label="4. Evaluation\\n(accuracy, precision,\\nrecall, F1,\\nconfusion matrix)"];
  s5 [label="5. Deployment\\n(FastAPI backend +\\nReact web app)", fillcolor="{NAVY}", fontcolor="white"];
  s1 -> s2 -> s3 -> s4 -> s5;
  s4 -> s3 [label="tune again", style=dashed, constraint=false];
}}""")

# ---------- Figure 3.2: architecture ----------
dot("fig3_2_architecture", f"""
digraph G {{ rankdir=LR; {COMMON} nodesep=0.4; ranksep=0.6; compound=true;
  node [shape=box, style="rounded,filled", fillcolor="{LIGHT}"];
  subgraph cluster_p {{ label="Presentation tier"; style="rounded"; color="#999999";
    fe [label="React web app\\n(browser)\\nLogin, Predict, What I Need,\\nHistory, Cohort Upload,\\nModel Performance"]; }}
  subgraph cluster_l {{ label="Application tier"; style="rounded"; color="#999999";
    api [label="FastAPI REST API\\nauth (JWT), validation,\\nCSV parsing"];
    ml [label="Prediction engine\\nstage selection +\\nsaved scikit-learn models\\n(stage 1, 2, 3)", fillcolor="{NAVY}", fontcolor="white"];
    calc [label="CGPA target\\ncalculator"]; }}
  subgraph cluster_d {{ label="Data tier"; style="rounded"; color="#999999";
    db [label="SQLite database\\n(users, students, results,\\npredictions, batches)", shape=cylinder];
    mf [label="Model files (.joblib)\\n+ metrics.json", shape=folder]; }}
  fe -> api [label="HTTPS / JSON"]; api -> fe [style=dashed];
  api -> ml; api -> calc; api -> db; ml -> mf;
}}""")

# ---------- Figure 3.3: context diagram ----------
dot("fig3_3_context_dfd", f"""
digraph G {{ rankdir=LR; {COMMON} nodesep=0.6; ranksep=1.3;
  st [label="Student", shape=box, style=filled, fillcolor="#fbf5e3", color="{GOLD}", width=1.3, height=0.7];
  ad [label="Academic\\nAdviser", shape=box, style=filled, fillcolor="#fbf5e3", color="{GOLD}", width=1.3, height=0.7];
  p0 [label="0\\nClassPredict\\nSystem", shape=circle, style=filled, fillcolor="{NAVY}", fontcolor="white", width=1.7];
  st -> p0 [label="login details,\\nsemester GPAs, UTME,\\nO'Level, carry-overs,\\ntarget-CGPA details"];
  p0 -> st [label="predicted class,\\nclass probabilities,\\nrequired GPA per class,\\nprediction history"];
  ad -> p0 [label="login details,\\ncohort CSV file"];
  p0 -> ad [label="batch predictions,\\nat-risk list,\\nclass summary,\\nmodel performance"];
}}""")

# ---------- Figure 3.4: level 1 DFD ----------
dot("fig3_4_level1_dfd", f"""
digraph G {{ rankdir=TB; {COMMON} nodesep=0.5; ranksep=0.65; newrank=true;
  node [shape=box, style="rounded,filled", fillcolor="{LIGHT}", width=1.6];
  st [label="Student", shape=box, style=filled, fillcolor="#fbf5e3", color="{GOLD}"];
  ad [label="Adviser", shape=box, style=filled, fillcolor="#fbf5e3", color="{GOLD}"];
  p1 [label="1.0\\nAuthenticate user"];
  p2 [label="2.0\\nCapture and\\nvalidate results"];
  p4 [label="4.0\\nCompute\\ntarget GPAs"];
  p5 [label="5.0\\nProcess cohort\\nupload"];
  p3 [label="3.0\\nPredict final class"];
  p6 [label="6.0\\nReport results"];
  node [shape=record, style=filled, fillcolor="white", width=1.8];
  d1 [label="D1 | Users"]; d2 [label="D2 | Students and results"];
  d3 [label="D3 | Predictions"]; d4 [label="D4 | Trained models"];
  {{ rank=same; st; ad; }}
  {{ rank=same; p1; p2; p4; p5; }}
  {{ rank=same; d1; p3; d2; }}
  {{ rank=same; d4; d3; }}
  st -> p1 [label="email,\\npassword"]; ad -> p1;
  p1 -> d1 [label="user record /\\nstored hash", dir=both];
  st -> p2 [label="GPAs, UTME,\\nO'Level"];
  st -> p4 [label="CGPA,\\nunits"]; p4 -> st [label="required\\nGPA", style=dashed];
  ad -> p5 [label="CSV file"];
  p2 -> d2 [label="clean record"]; p5 -> d2 [label="student rows"];
  p2 -> p3 [label="feature vector"]; p5 -> p3 [label="batch features"];
  d4 -> p3 [label="model for stage"];
  p3 -> d3 [label="class +\\nprobabilities"];
  d3 -> p6 [label="saved\\npredictions"];
  p6 -> st [label="result and history", style=dashed, constraint=false];
  p6 -> ad [label="at-risk list, summary", style=dashed, constraint=false];
}}""")

# ---------- Figure 3.8: activity / flowchart of the prediction algorithm ----------
dot("fig3_8_prediction_flowchart", f"""
digraph G {{ rankdir=TB; {COMMON} nodesep=0.35; ranksep=0.3;
  node [shape=box, style="rounded,filled", fillcolor="{LIGHT}", width=2.6];
  start [label="Start", shape=oval, fillcolor="{NAVY}", fontcolor="white", width=1.2];
  in [label="Receive student inputs\\n(entry mode, faculty, UTME, O'Level,\\nsemester GPAs, carry-overs)", shape=parallelogram];
  v [label="All GPAs between 0.00 and 4.00?", shape=diamond, width=3.2, fillcolor="white"];
  err [label="Return validation error", fillcolor="#fde8e8", color="#c0392b"];
  c3 [label="300 Level GPAs complete?", shape=diamond, width=3.2, fillcolor="white"];
  c2 [label="200 Level GPAs complete?", shape=diamond, width=3.2, fillcolor="white"];
  c1 [label="UTME entry and\\n100 Level GPAs complete?", shape=diamond, width=3.2, fillcolor="white"];
  s3 [label="Use Stage 3 model"]; s2 [label="Use Stage 2 model"]; s1 [label="Use Stage 1 model"];
  no [label="Not enough results:\\nshow CGPA calculator only", fillcolor="#fbf5e3", color="{GOLD}"];
  f [label="Compute CGPA so far, latest GPA\\nand GPA trend; build feature vector"];
  p [label="Model returns probability of\\nFirst, 2:1, 2:2 and Third Class"];
  o [label="Predicted class = highest probability;\\nsave prediction; show result + advice", shape=parallelogram];
  end [label="Stop", shape=oval, fillcolor="{NAVY}", fontcolor="white", width=1.2];
  start -> in -> v; v -> err [label="No"]; v -> c3 [label="Yes"];
  c3 -> s3 [label="Yes"]; c3 -> c2 [label="No"]; c2 -> s2 [label="Yes"]; c2 -> c1 [label="No"];
  c1 -> s1 [label="Yes"]; c1 -> no [label="No"];
  s3 -> f; s2 -> f; s1 -> f; f -> p -> o -> end; err -> end; no -> end;
}}""")

# ---------- Figure 3.6: class diagram ----------
def cls(name, attrs, ops):
    a = "".join(f'<TR><TD ALIGN="LEFT">{x}</TD></TR>' for x in attrs)
    o = "".join(f'<TR><TD ALIGN="LEFT">{x}</TD></TR>' for x in ops) or '<TR><TD> </TD></TR>'
    return (f'{name} [shape=plain, label=<<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" COLOR="{NAVY}">'
            f'<TR><TD BGCOLOR="{NAVY}"><FONT COLOR="white"><B>{name}</B></FONT></TD></TR>'
            f'<TR><TD><TABLE BORDER="0" CELLSPACING="0">{a}</TABLE></TD></TR><HR/>'
            f'<TR><TD><TABLE BORDER="0" CELLSPACING="0">{o}</TABLE></TD></TR></TABLE>>];')


dot("fig3_6_class_diagram", f"""
digraph G {{ rankdir=TB; {COMMON} nodesep=0.5; ranksep=0.6;
  {cls("User", ["- user_id: int", "- full_name: str", "- email: str", "- password_hash: str", "- role: str"], ["+ register()", "+ login(): token"])}
  {cls("Student", ["- student_id: int", "- matric_no: str", "- entry_mode: str", "- utme_score: int", "- olevel_points: int", "- carryovers: int"], ["+ cgpa_so_far(): float", "+ completed_stage(): int"])}
  {cls("Faculty", ["- faculty_id: int", "- name: str"], [])}
  {cls("SemesterResult", ["- result_id: int", "- level: int", "- semester: int", "- gpa: float"], [])}
  {cls("Prediction", ["- prediction_id: int", "- stage: int", "- model_name: str", "- predicted_class: str", "- confidence: float", "- created_at: datetime"], ["+ top_class(): str"])}
  {cls("ClassProbability", ["- class_label: str", "- probability: float"], [])}
  {cls("BatchUpload", ["- batch_id: int", "- file_name: str", "- row_count: int"], ["+ parse_csv()", "+ at_risk(): list"])}
  {cls("Predictor", ["- models: dict", "- metrics: dict"], ["+ choose_stage(inputs): int", "+ predict(inputs): Prediction", "+ target_gpas(cgpa, units): list"])}
  User -> Student [arrowhead=none, headlabel="0..1", taillabel="1"];
  Faculty -> Student [arrowhead=none, headlabel="*", taillabel="1"];
  Student -> SemesterResult [arrowhead=diamond, dir=back, arrowtail=diamond, headlabel="1..8", taillabel="1"];
  Student -> Prediction [arrowhead=none, headlabel="*", taillabel="1"];
  Prediction -> ClassProbability [dir=back, arrowtail=diamond, headlabel="4", taillabel="1"];
  User -> BatchUpload [arrowhead=none, headlabel="*", taillabel="1"];
  BatchUpload -> Student [arrowhead=none, headlabel="*", taillabel="0..1"];
  Predictor -> Prediction [style=dashed, label="creates"];
}}""")

# ---------- Figure 3.9: ER diagram ----------
def table(name, cols):
    rows = "".join(f'<TR><TD ALIGN="LEFT" PORT="{c[0]}">{c[1]}</TD><TD ALIGN="LEFT"><FONT COLOR="#666666">{c[2]}</FONT></TD></TR>' for c in cols)
    return (f'{name} [shape=plain, label=<<TABLE BORDER="1" CELLBORDER="1" CELLSPACING="0" CELLPADDING="4" COLOR="{NAVY}">'
            f'<TR><TD COLSPAN="2" BGCOLOR="{NAVY}"><FONT COLOR="white"><B>{name}</B></FONT></TD></TR>{rows}</TABLE>>];')


dot("fig3_9_erd", f"""
digraph G {{ rankdir=TB; {COMMON} nodesep=0.6; ranksep=0.7; newrank=true;
  {table("users", [("id", "<B>user_id</B> (PK)", "INTEGER"), ("n", "full_name", "VARCHAR"), ("e", "email (UNIQUE)", "VARCHAR"), ("p", "password_hash", "VARCHAR"), ("r", "role", "VARCHAR"), ("c", "created_at", "DATETIME")])}
  {table("faculties", [("id", "<B>faculty_id</B> (PK)", "INTEGER"), ("n", "name (UNIQUE)", "VARCHAR")])}
  {table("batch_uploads", [("id", "<B>batch_id</B> (PK)", "INTEGER"), ("u", "uploaded_by (FK)", "INTEGER"), ("f", "file_name", "VARCHAR"), ("r", "row_count", "INTEGER"), ("c", "created_at", "DATETIME")])}
  {table("students", [("id", "<B>student_id</B> (PK)", "INTEGER"), ("u", "user_id (FK, UNIQUE)", "INTEGER"), ("b", "batch_id (FK)", "INTEGER"), ("m", "matric_no", "VARCHAR"), ("f", "faculty_id (FK)", "INTEGER"), ("e", "entry_mode", "VARCHAR"), ("ut", "utme_score", "INTEGER"), ("o", "olevel_points", "INTEGER"), ("co", "carryovers", "INTEGER")])}
  {table("semester_results", [("id", "<B>result_id</B> (PK)", "INTEGER"), ("s", "student_id (FK)", "INTEGER"), ("l", "level", "INTEGER"), ("se", "semester", "INTEGER"), ("g", "gpa", "REAL")])}
  {table("predictions", [("id", "<B>prediction_id</B> (PK)", "INTEGER"), ("s", "student_id (FK)", "INTEGER"), ("st", "stage", "INTEGER"), ("m", "model_name", "VARCHAR"), ("pc", "predicted_class", "VARCHAR"), ("cf", "confidence", "REAL"), ("cg", "cgpa_so_far", "REAL"), ("cb", "created_by (FK)", "INTEGER"), ("c", "created_at", "DATETIME")])}
  {table("prediction_probabilities", [("p", "<B>prediction_id</B> (PK, FK)", "INTEGER"), ("cl", "<B>class_label</B> (PK)", "VARCHAR"), ("pr", "probability", "REAL")])}
  users:id -> students:u [label="1 : 0..1", arrowhead=crow];
  faculties:id -> students:f [label="1 : N", arrowhead=crow];
  users:id -> batch_uploads:u [label="1 : N", arrowhead=crow];
  batch_uploads:id -> students:b [label="1 : N", arrowhead=crow];
  students:id -> semester_results:s [label="1 : N", arrowhead=crow];
  students:id -> predictions:s [label="1 : N", arrowhead=crow];
  users:id -> predictions:cb [label="1 : N", arrowhead=crow];
  predictions:id -> prediction_probabilities:p [label="1 : 4", arrowhead=crow];
  {{ rank=same; users; faculties; }}
  {{ rank=same; batch_uploads; students; }}
  {{ rank=same; semester_results; predictions; }}
}}""")


# ---------- Figure 3.5: use case diagram (matplotlib) ----------
def actor(ax, x, y, name):
    ax.add_patch(plt.Circle((x, y + 0.55), 0.13, fill=False, lw=1.5, color=NAVY))
    ax.plot([x, x], [y + 0.42, y + 0.05], color=NAVY, lw=1.5)
    ax.plot([x - 0.22, x + 0.22], [y + 0.3, y + 0.3], color=NAVY, lw=1.5)
    ax.plot([x, x - 0.18], [y + 0.05, y - 0.25], color=NAVY, lw=1.5)
    ax.plot([x, x + 0.18], [y + 0.05, y - 0.25], color=NAVY, lw=1.5)
    ax.text(x, y - 0.45, name, ha="center", fontsize=10, family=FONT)


fig, ax = plt.subplots(figsize=(8, 6.2))
ax.set_xlim(0, 10); ax.set_ylim(0, 8); ax.axis("off")
ax.add_patch(FancyBboxPatch((2.4, 0.3), 5.2, 7.3, boxstyle="round,pad=0.05", fill=False, ec="#888888", lw=1.2))
ax.text(5, 7.35, "ClassPredict System", ha="center", fontsize=11, weight="bold", family=FONT)
cases = {
    "Register / Log in": (5, 6.65), "Enter semester results": (5, 5.85), "Predict final class": (5, 5.05),
    "Compute required GPA": (5, 4.25), "View prediction history": (5, 3.45), "Upload cohort CSV": (5, 2.65),
    "View at-risk students": (5, 1.85), "View model performance": (5, 1.05),
}
for t, (x, y) in cases.items():
    ax.add_patch(Ellipse((x, y), 3.9, 0.62, fc=LIGHT, ec=NAVY, lw=1.2))
    ax.text(x, y, t, ha="center", va="center", fontsize=9.5, family=FONT)
actor(ax, 1.0, 4.4, "Student")
actor(ax, 9.0, 2.6, "Academic Adviser")
for t in ["Register / Log in", "Enter semester results", "Predict final class", "Compute required GPA",
          "View prediction history", "View model performance"]:
    x, y = cases[t]; ax.plot([1.25, x - 1.95], [4.75, y], color="#666666", lw=0.8)
for t in ["Register / Log in", "Upload cohort CSV", "View at-risk students", "View model performance", "Predict final class"]:
    x, y = cases[t]; ax.plot([8.75, x + 1.95], [2.95, y], color="#666666", lw=0.8)
fig.savefig(os.path.join(OUT, "fig3_5_use_case.png"), dpi=200, bbox_inches="tight", facecolor="white")
plt.close(fig)

# ---------- Figure 3.7: sequence diagram (matplotlib) ----------
fig, ax = plt.subplots(figsize=(8.6, 6.4))
ax.set_xlim(0, 10); ax.set_ylim(0, 10); ax.axis("off")
parts = [("Student", 0.9), ("React app", 3.0), ("FastAPI", 5.1), ("Prediction\nengine", 7.1), ("Database", 9.1)]
for name, x in parts:
    ax.add_patch(FancyBboxPatch((x - 0.7, 9.1), 1.4, 0.65, boxstyle="round,pad=0.03", fc=LIGHT, ec=NAVY))
    ax.text(x, 9.42, name, ha="center", va="center", fontsize=9, family=FONT)
    ax.plot([x, x], [0.4, 9.1], ls="--", color="#999999", lw=0.8)
msgs = [
    (0.9, 3.0, "fill form and click Predict", False), (3.0, 5.1, "POST /api/predict (JWT)", False),
    (5.1, 5.1, "validate inputs", None), (5.1, 7.1, "predict(inputs)", False),
    (7.1, 7.1, "choose stage, build features", None), (7.1, 5.1, "class + probabilities", True),
    (5.1, 9.1, "save student, results, prediction", False), (9.1, 5.1, "prediction_id", True),
    (5.1, 3.0, "JSON response", True), (3.0, 0.9, "show class, chart, advice", True),
]
y = 8.5
for x1, x2, label, ret in msgs:
    if ret is None:
        ax.annotate("", xy=(x1 + 0.05, y - 0.32), xytext=(x1 + 0.05, y),
                    arrowprops=dict(arrowstyle="->", connectionstyle="arc3,rad=-1.6", color=NAVY))
        ax.text(x1 + 0.35, y - 0.12, label, fontsize=8.5, family=FONT)
        y -= 0.85
        continue
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle="->", ls="--" if ret else "-", color="#555555" if ret else NAVY))
    ax.text((x1 + x2) / 2, y + 0.1, label, ha="center", fontsize=8.5, family=FONT)
    y -= 0.8
fig.savefig(os.path.join(OUT, "fig3_7_sequence.png"), dpi=200, bbox_inches="tight", facecolor="white")
plt.close(fig)
print(sorted(f for f in os.listdir(OUT) if f.endswith(".png")))
