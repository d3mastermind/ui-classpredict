"""
make_figures.py - draws the charts used in Chapter Four from metrics.json
and the simulated dataset.  Output: ml/figures/*.png
"""
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
FIG = os.path.join(HERE, "figures")
os.makedirs(FIG, exist_ok=True)
M = json.load(open(os.path.join(HERE, "..", "backend", "models", "metrics.json")))
D = pd.read_csv(os.path.join(HERE, "data", "simulated_ui_students.csv"))

S = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]   # categorical slots 1-4
INK, INK2, GRID = "#0b0b0b", "#52514e", "#e4e3df"
CLASSES = M["classes"]
SHORT = {"First Class": "First", "Second Class Upper": "2:1",
         "Second Class Lower": "2:2", "Third Class": "Third"}
MODELS = ["Logistic Regression", "Decision Tree", "Random Forest", "Gradient Boosting"]

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.edgecolor": GRID,
    "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True,
    "grid.color": GRID, "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.titleweight": "bold", "axes.titlesize": 11, "axes.titlecolor": INK,
})


def save(fig, name):
    fig.tight_layout()
    fig.savefig(os.path.join(FIG, name), dpi=200, facecolor="white")
    plt.close(fig)


# 1. class distribution
counts = D["final_class"].value_counts().reindex(CLASSES)
fig, ax = plt.subplots(figsize=(6.4, 3.6))
b = ax.bar([SHORT[c] for c in CLASSES], counts.values, color=S[0], width=0.55)
for r, v in zip(b, counts.values):
    ax.text(r.get_x() + r.get_width() / 2, v + 30, f"{v:,} ({v / len(D):.1%})", ha="center", color=INK, fontsize=9)
ax.set_ylabel("Number of simulated students")
ax.set_xlabel("Final class of degree")
ax.grid(axis="x", visible=False)
ax.set_ylim(0, counts.max() * 1.15)
save(fig, "fig_class_distribution.png")

# 2. average GPA path by final class
cols = ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2", "gpa_300_1", "gpa_300_2", "gpa_400_1", "gpa_400_2"]
labels = ["100L\n1st", "100L\n2nd", "200L\n1st", "200L\n2nd", "300L\n1st", "300L\n2nd", "400L\n1st", "400L\n2nd"]
fig, ax = plt.subplots(figsize=(6.6, 3.8))
for i, c in enumerate(CLASSES):
    m = D[D.final_class == c][cols].mean()
    ax.plot(range(8), m.values, color=S[i], lw=2, marker="o", ms=4, label=SHORT[c])
    ax.text(7.15, m.values[-1], SHORT[c], color=INK2, va="center", fontsize=9)
ax.set_xticks(range(8), labels, fontsize=8)
ax.set_ylabel("Average semester GPA (4.0 scale)")
ax.set_ylim(1, 4)
ax.set_xlim(-0.3, 7.8)
ax.legend(frameon=False, ncol=4, loc="upper center", bbox_to_anchor=(0.5, 1.12), fontsize=9)
save(fig, "fig_gpa_paths.png")

# 3. model comparison at stage 3
st3 = M["stages"]["3"]["models"]
x = np.arange(len(MODELS))
w = 0.36
fig, ax = plt.subplots(figsize=(6.6, 3.8))
acc = [st3[m]["accuracy"] * 100 for m in MODELS]
f1 = [st3[m]["macro_f1"] * 100 for m in MODELS]
b1 = ax.bar(x - w / 2 - 0.01, acc, w, color=S[0], label="Accuracy")
b2 = ax.bar(x + w / 2 + 0.01, f1, w, color=S[1], label="Macro F1 score")
for bars in (b1, b2):
    for r in bars:
        ax.text(r.get_x() + r.get_width() / 2, r.get_height() + 0.6, f"{r.get_height():.1f}", ha="center", fontsize=8, color=INK)
ax.set_xticks(x, [m.replace(" ", "\n") for m in MODELS])
ax.set_ylabel("Score on test set (%)")
ax.set_ylim(60, 100)
ax.grid(axis="x", visible=False)
ax.legend(frameon=False, ncol=2, loc="upper left")
save(fig, "fig_model_comparison_stage3.png")

# 4. accuracy by stage (all models)
fig, ax = plt.subplots(figsize=(6.6, 3.8))
stages = ["1", "2", "3"]
for i, m in enumerate(MODELS):
    ys = [M["stages"][s]["models"][m]["accuracy"] * 100 for s in stages]
    ax.plot([0, 1, 2], ys, color=S[i], lw=2, marker="o", ms=5, label=m)
ax.set_xticks([0, 1, 2], ["End of 100 Level", "End of 200 Level", "End of 300 Level"])
ax.set_ylabel("Test accuracy (%)")
ax.set_ylim(60, 100)
ax.legend(frameon=False, fontsize=9, loc="lower right")
save(fig, "fig_accuracy_by_stage.png")

# 5. confusion matrix for best stage-3 model (sequential single hue)
from matplotlib.colors import LinearSegmentedColormap
blues = LinearSegmentedColormap.from_list("b", ["#f2f7fd", "#2a78d6", "#123f78"])
for s in ("2", "3"):
    best = M["stages"][s]["best_model"]
    cm = np.array(M["stages"][s]["models"][best]["confusion_matrix"])
    fig, ax = plt.subplots(figsize=(5.4, 4.4))
    ax.grid(False)
    rowpct = cm / cm.sum(axis=1, keepdims=True)
    ax.imshow(rowpct, cmap=blues, vmin=0, vmax=1)
    for i in range(4):
        for j in range(4):
            ax.text(j, i, f"{cm[i, j]}\n({rowpct[i, j]:.0%})", ha="center", va="center", fontsize=9,
                    color="white" if rowpct[i, j] > 0.55 else INK)
    ax.set_xticks(range(4), [SHORT[c] for c in CLASSES])
    ax.set_yticks(range(4), [SHORT[c] for c in CLASSES])
    ax.set_xlabel("Predicted class")
    ax.set_ylabel("Actual class")
    for sp in ax.spines.values():
        sp.set_visible(False)
    save(fig, f"fig_confusion_stage{s}.png")

# 6. feature importance for best stage-3 model
NICE = {"cgpa_so_far": "CGPA so far", "latest_gpa": "Latest semester GPA", "gpa_trend": "GPA trend",
        "carryovers_by_300l": "Carry-overs so far", "utme_score": "UTME score", "olevel_points": "O'Level points",
        "faculty": "Faculty", "entry_mode": "Entry mode"}
for k in cols:
    lvl, sem = k.split("_")[1], k.split("_")[2]
    NICE[k] = f"GPA {lvl}L {'1st' if sem == '1' else '2nd'} sem"
imp = M["stages"]["3"]["feature_importance"][:10][::-1]
fig, ax = plt.subplots(figsize=(6.6, 4.0))
ax.barh([NICE[d["feature"]] for d in imp], [max(d["importance"], 0) for d in imp], color=S[0], height=0.55)
ax.set_xlabel("Drop in macro F1 when the input is shuffled")
ax.grid(axis="y", visible=False)
save(fig, "fig_feature_importance_stage3.png")

print("Figures saved to", FIG, sorted(os.listdir(FIG)))
