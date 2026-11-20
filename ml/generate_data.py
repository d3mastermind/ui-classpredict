"""
generate_data.py
----------------
Builds the SIMULATED student dataset used to train ClassPredict.

Why simulated?  Real student records are protected and we did not have
approval to use them, so we generate records that follow the University of
Ibadan 4.0 grading rules instead.  Every record here is made up.  Nothing in
this file belongs to a real student.

How it works (in plain terms):
  * every simulated student gets a hidden "ability" score and a hidden
    "trend" (some students improve every semester, some slide down);
  * UTME score and O'Level points are drawn so that they are only loosely
    linked to ability (as published Nigerian studies report);
  * eight semester GPAs are drawn from ability + trend + random noise,
    with extra noise in 100 Level (freshers are still settling in);
  * Direct Entry (DE) students skip 100 Level, so their 100L GPAs are blank;
  * the final CGPA is unit-weighted over all semesters taken, and the class
    of degree follows the UI 4.0 scale:
        First Class        3.50 - 4.00
        Second Class Upper 3.00 - 3.49
        Second Class Lower 2.00 - 2.99
        Third Class        1.00 - 1.99
    Students who end below 1.00 do not graduate and are left out.

Run:  python generate_data.py --n 4000 --seed 476
"""
import argparse
import os

import numpy as np
import pandas as pd

FACULTIES = {
    # faculty: (share of students, small effect on GPA)
    "Science": (0.20, -0.05),
    "Technology": (0.14, -0.08),
    "Social Sciences": (0.16, 0.04),
    "Arts": (0.14, 0.06),
    "Agriculture": (0.12, 0.00),
    "Education": (0.12, 0.05),
    "Economics and Management Sciences": (0.12, 0.02),
}

CLASS_ORDER = [
    "First Class",
    "Second Class Upper",
    "Second Class Lower",
    "Third Class",
]


def classify(cgpa: float) -> str:
    """UI 4.0 scale classification."""
    if cgpa >= 3.50:
        return "First Class"
    if cgpa >= 3.00:
        return "Second Class Upper"
    if cgpa >= 2.00:
        return "Second Class Lower"
    if cgpa >= 1.00:
        return "Third Class"
    return "No Degree"


def generate(n: int, seed: int) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    names = list(FACULTIES)
    shares = np.array([FACULTIES[f][0] for f in names])
    shares = shares / shares.sum()

    rows = []
    sid = 0
    # draw a few extra students because some will end below 1.00 and be dropped
    while len(rows) < n:
        sid += 1
        faculty = rng.choice(names, p=shares)
        fac_effect = FACULTIES[faculty][1]
        entry_mode = "DE" if rng.random() < 0.12 else "UTME"

        ability = rng.normal(0, 1)
        trend = rng.normal(0, 0.045)          # change in GPA per semester
        if rng.random() < 0.06:               # a few "late bloomers"
            trend += 0.09
        base = 2.72 + 0.42 * ability + fac_effect

        # pre-admission scores: only loosely linked to ability
        utme = np.nan
        if entry_mode == "UTME":
            utme = float(np.clip(round(232 + 14 * ability + rng.normal(0, 24)), 180, 360))
        olevel = int(np.clip(round(19 + 1.8 * ability + rng.normal(0, 3.2)), 5, 30))

        gpas, units = [], []
        carry = 0
        for s in range(1, 9):
            u = int(rng.integers(18, 25))
            if entry_mode == "DE" and s <= 2:
                gpas.append(np.nan)
                units.append(0)
                continue
            g = base + trend * (s - 1) + rng.normal(0, 0.24)
            if s <= 2:                         # freshers settling in
                g += rng.normal(-0.05, 0.30)
            if s >= 7:                         # final year (project, fewer courses)
                g += 0.05
            g = float(np.clip(g, 0.0, 4.0))
            gpas.append(round(g, 2))
            units.append(u)
            # failed courses that semester, more likely when GPA is low
            lam = max(0.0, 1.5 - 0.62 * g)
            if s <= 6:
                carry += int(rng.poisson(lam))

        w = np.array(units, dtype=float)
        g = np.nan_to_num(np.array(gpas, dtype=float))
        final_cgpa = float((g * w).sum() / w.sum())
        cls = classify(final_cgpa)
        if cls == "No Degree":
            continue

        rows.append({
            "student_id": f"SIM{sid:05d}",
            "faculty": faculty,
            "entry_mode": entry_mode,
            "utme_score": utme,
            "olevel_points": olevel,
            "gpa_100_1": gpas[0], "gpa_100_2": gpas[1],
            "gpa_200_1": gpas[2], "gpa_200_2": gpas[3],
            "gpa_300_1": gpas[4], "gpa_300_2": gpas[5],
            "gpa_400_1": gpas[6], "gpa_400_2": gpas[7],
            "carryovers_by_300l": carry,
            "final_cgpa": round(final_cgpa, 2),
            "final_class": cls,
        })
    return pd.DataFrame(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--n", type=int, default=4000)
    ap.add_argument("--seed", type=int, default=476)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "data", "simulated_ui_students.csv"))
    a = ap.parse_args()
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    df = generate(a.n, a.seed)
    df.to_csv(a.out, index=False)
    print(f"Saved {len(df)} simulated records to {a.out}")
    print(df["final_class"].value_counts(normalize=True).reindex(CLASS_ORDER).round(3))
