"""
train.py
--------
Trains and compares four classifiers (Logistic Regression, Decision Tree,
Random Forest and Gradient Boosting) at three points in a student's journey:

  Stage 1 - end of 100 Level  (UTME students only; DE students have no 100L)
  Stage 2 - end of 200 Level
  Stage 3 - end of 300 Level

For each stage the best model (by macro F1 on the held-out test set) is saved
to ../backend/models/ together with a metrics file the web app reads.

Run:  python train.py
"""
import json
import os
import time

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, f1_score)
from sklearn.model_selection import (GridSearchCV, StratifiedKFold,
                                     cross_val_score, train_test_split)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.utils.class_weight import compute_sample_weight

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data", "simulated_ui_students.csv")
OUT = os.path.join(HERE, "..", "backend", "models")
SEED = 476

CLASSES = ["First Class", "Second Class Upper", "Second Class Lower", "Third Class"]
CAT = ["faculty", "entry_mode"]
PRE = ["utme_score", "olevel_points"]

STAGES = {
    1: {"label": "End of 100 Level", "gpas": ["gpa_100_1", "gpa_100_2"], "utme_only": True},
    2: {"label": "End of 200 Level", "gpas": ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2"], "utme_only": False},
    3: {"label": "End of 300 Level", "gpas": ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2",
                                              "gpa_300_1", "gpa_300_2"], "utme_only": False},
}


def add_derived(df: pd.DataFrame, gpa_cols):
    """CGPA so far, latest GPA and trend (last GPA minus first available GPA)."""
    g = df[gpa_cols]
    df = df.copy()
    df["cgpa_so_far"] = g.mean(axis=1, skipna=True).round(3)
    df["latest_gpa"] = g.ffill(axis=1).iloc[:, -1]
    first = g.bfill(axis=1).iloc[:, 0]
    df["gpa_trend"] = (df["latest_gpa"] - first).round(3)
    return df


def build_models():
    return {
        "Logistic Regression": (
            LogisticRegression(max_iter=3000, class_weight="balanced"),
            {"clf__C": [0.1, 1.0, 10.0]},
        ),
        "Decision Tree": (
            DecisionTreeClassifier(class_weight="balanced", random_state=SEED),
            {"clf__max_depth": [4, 6, 8], "clf__min_samples_leaf": [5, 20]},
        ),
        "Random Forest": (
            RandomForestClassifier(n_estimators=300, class_weight="balanced_subsample",
                                   random_state=SEED, n_jobs=-1),
            {"clf__max_depth": [8, None], "clf__min_samples_leaf": [2, 5]},
        ),
        "Gradient Boosting": (
            GradientBoostingClassifier(random_state=SEED),
            {"clf__n_estimators": [150, 300], "clf__learning_rate": [0.05, 0.1], "clf__max_depth": [2, 3]},
        ),
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    raw = pd.read_csv(DATA)
    summary = {
        "dataset": {
            "file": "simulated_ui_students.csv",
            "records": int(len(raw)),
            "note": "Simulated records that follow UI 4.0 grading rules. No real student data was used.",
            "class_counts": raw["final_class"].value_counts().reindex(CLASSES).astype(int).to_dict(),
            "entry_mode_counts": raw["entry_mode"].value_counts().astype(int).to_dict(),
            "faculty_counts": raw["faculty"].value_counts().astype(int).to_dict(),
        },
        "stages": {},
    }

    for stage, cfg in STAGES.items():
        df = raw[raw["entry_mode"] == "UTME"] if cfg["utme_only"] else raw
        df = add_derived(df, cfg["gpas"])
        num = PRE + cfg["gpas"] + ["cgpa_so_far", "latest_gpa", "gpa_trend"]
        if stage >= 2:
            num = num + ["carryovers_by_300l"] if stage == 3 else num
        features = CAT + num
        X, y = df[features], df["final_class"]
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=SEED)

        pre = ColumnTransformer([
            ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CAT),
        ])
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=SEED)
        results = {}
        best_name, best_pipe, best_f1 = None, None, -1

        for name, (clf, grid) in build_models().items():
            pipe = Pipeline([("pre", pre), ("clf", clf)])
            fit_kw = {}
            if name == "Gradient Boosting":
                fit_kw["clf__sample_weight"] = compute_sample_weight("balanced", y_tr)
            t0 = time.time()
            gs = GridSearchCV(pipe, grid, scoring="f1_macro", cv=cv, n_jobs=-1)
            gs.fit(X_tr, y_tr, **fit_kw)
            train_secs = time.time() - t0
            model = gs.best_estimator_
            pred = model.predict(X_te)
            cv_acc = cross_val_score(model, X_tr, y_tr, cv=cv, scoring="accuracy", n_jobs=-1)
            rep = classification_report(y_te, pred, labels=CLASSES, output_dict=True, zero_division=0)
            # "within one class": predicted class is the true class or a neighbouring one
            idx = {c: i for i, c in enumerate(CLASSES)}
            within1 = float(np.mean([abs(idx[a] - idx[b]) <= 1 for a, b in zip(y_te, pred)]))
            results[name] = {
                "best_params": {k.replace("clf__", ""): v for k, v in gs.best_params_.items()},
                "accuracy": round(accuracy_score(y_te, pred), 4),
                "macro_f1": round(f1_score(y_te, pred, average="macro"), 4),
                "weighted_f1": round(f1_score(y_te, pred, average="weighted"), 4),
                "macro_precision": round(rep["macro avg"]["precision"], 4),
                "macro_recall": round(rep["macro avg"]["recall"], 4),
                "within_one_class": round(within1, 4),
                "cv_accuracy_mean": round(float(cv_acc.mean()), 4),
                "cv_accuracy_std": round(float(cv_acc.std()), 4),
                "per_class": {c: {"precision": round(rep[c]["precision"], 4),
                                  "recall": round(rep[c]["recall"], 4),
                                  "f1": round(rep[c]["f1-score"], 4),
                                  "support": int(rep[c]["support"])} for c in CLASSES},
                "confusion_matrix": confusion_matrix(y_te, pred, labels=CLASSES).tolist(),
                "train_seconds": round(train_secs, 1),
            }
            print(f"Stage {stage} | {name:20s} acc={results[name]['accuracy']:.3f} "
                  f"macroF1={results[name]['macro_f1']:.3f} cv={cv_acc.mean():.3f}")
            if results[name]["macro_f1"] > best_f1:
                best_name, best_pipe, best_f1 = name, model, results[name]["macro_f1"]

        # which inputs matter most for the chosen model (permutation importance on test set)
        pi = permutation_importance(best_pipe, X_te, y_te, n_repeats=10, random_state=SEED,
                                    scoring="f1_macro", n_jobs=-1)
        importance = sorted(
            [{"feature": f, "importance": round(float(m), 4)} for f, m in zip(features, pi.importances_mean)],
            key=lambda d: d["importance"], reverse=True)

        joblib.dump(best_pipe, os.path.join(OUT, f"stage{stage}_model.joblib"))
        summary["stages"][str(stage)] = {
            "label": cfg["label"],
            "train_size": int(len(X_tr)),
            "test_size": int(len(X_te)),
            "features": features,
            "gpa_inputs": cfg["gpas"],
            "best_model": best_name,
            "models": results,
            "feature_importance": importance,
        }
        print(f"Stage {stage}: best = {best_name} (macro F1 {best_f1:.3f})\n")

    summary["classes"] = CLASSES
    summary["grading_scale"] = {"First Class": [3.5, 4.0], "Second Class Upper": [3.0, 3.49],
                                "Second Class Lower": [2.0, 2.99], "Third Class": [1.0, 1.99]}
    with open(os.path.join(OUT, "metrics.json"), "w") as f:
        json.dump(summary, f, indent=2)
    print("Saved models and metrics to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
