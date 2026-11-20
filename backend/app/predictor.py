"""Prediction engine: chooses the stage, builds the features exactly as in training,
calls the saved model and computes the GPA needed for each class."""
import json
import math
import os

import joblib
import numpy as np
import pandas as pd

MODEL_DIR = os.getenv("CLASSPREDICT_MODELS", os.path.join(os.path.dirname(__file__), "..", "models"))
GPA_KEYS = ["gpa_100_1", "gpa_100_2", "gpa_200_1", "gpa_200_2", "gpa_300_1", "gpa_300_2"]
CLASS_FLOORS = [("First Class", 3.50), ("Second Class Upper", 3.00),
                ("Second Class Lower", 2.00), ("Third Class", 1.00)]
UNITS_PER_SEMESTER = 21   # used only when the student does not give exact units


class Predictor:
    def __init__(self, model_dir: str = MODEL_DIR):
        with open(os.path.join(model_dir, "metrics.json")) as f:
            self.metrics = json.load(f)
        self.models = {int(s): joblib.load(os.path.join(model_dir, f"stage{s}_model.joblib"))
                       for s in self.metrics["stages"]}
        self.classes = self.metrics["classes"]

    @staticmethod
    def choose_stage(entry_mode: str, gpas: dict) -> int:
        has = lambda *k: all(gpas.get(x) is not None for x in k)
        if has("gpa_300_1", "gpa_300_2"):
            return 3
        if has("gpa_200_1", "gpa_200_2"):
            return 2
        if entry_mode == "UTME" and has("gpa_100_1", "gpa_100_2"):
            return 1
        return 0

    def _features(self, stage: int, rec: dict) -> pd.DataFrame:
        cfg = self.metrics["stages"][str(stage)]
        gcols = cfg["gpa_inputs"]
        row = {k: rec.get(k) for k in ["faculty", "entry_mode", "utme_score", "olevel_points"]}
        vals = [rec.get(k) for k in gcols]
        for k, v in zip(gcols, vals):
            row[k] = np.nan if v is None else float(v)
        avail = [float(v) for v in vals if v is not None]
        row["cgpa_so_far"] = round(float(np.mean(avail)), 3)
        row["latest_gpa"] = avail[-1]
        row["gpa_trend"] = round(avail[-1] - avail[0], 3)
        row["carryovers_by_300l"] = rec.get("carryovers", 0)
        row["utme_score"] = np.nan if row["utme_score"] is None else float(row["utme_score"])
        return pd.DataFrame([row])[cfg["features"]]

    def predict(self, rec: dict) -> dict:
        gpas = {k: rec.get(k) for k in GPA_KEYS}
        stage = self.choose_stage(rec["entry_mode"], gpas)
        avail = [v for v in gpas.values() if v is not None]
        cgpa = round(float(np.mean(avail)), 2) if avail else None
        if stage == 0:
            return {"stage": 0, "cgpa_so_far": cgpa, "message":
                    "There are not enough results to make a prediction yet. Enter at least your 100 Level "
                    "results (UTME entrants) or your 200 Level results (Direct Entry)."}
        model = self.models[stage]
        X = self._features(stage, rec)
        proba = model.predict_proba(X)[0]
        labels = list(model.classes_)
        probs = {c: round(float(proba[labels.index(c)]), 4) for c in self.classes}
        pred = max(probs, key=probs.get)
        info = self.metrics["stages"][str(stage)]
        best = info["best_model"]
        semesters_done = len(avail)
        total_semesters = 6 if rec["entry_mode"] == "DE" else 8     # DE students start at 200 Level
        units_done = semesters_done * UNITS_PER_SEMESTER
        units_left = max(total_semesters - semesters_done, 0) * UNITS_PER_SEMESTER
        targets = target_gpas(cgpa, units_done, units_left)
        return {
            "stage": stage,
            "stage_label": info["label"],
            "model_name": best,
            "stage_accuracy": info["models"][best]["accuracy"],
            "predicted_class": pred,
            "confidence": probs[pred],
            "probabilities": probs,
            "cgpa_so_far": cgpa,
            "targets": targets,
            "advice": advice(pred, probs, targets),
        }


def target_gpas(cgpa: float, units_done: float, units_left: float) -> list:
    """Average GPA needed in the remaining units to reach the lower bound of each class."""
    out = []
    for name, floor in CLASS_FLOORS:
        if units_left <= 0:
            need = None
            status = "secured" if cgpa >= floor else "out_of_reach"
        else:
            need = (floor * (units_done + units_left) - cgpa * units_done) / units_left
            need = math.ceil(round(need * 100, 6)) / 100   # round up so the target is never short
            status = "secured" if need <= 0 else ("out_of_reach" if need > 4.0 else "reachable")
        out.append({"class": name, "floor": floor, "required_gpa": None if need is None else round(need, 2),
                    "status": status})
    return out


def advice(pred: str, probs: dict, targets: list) -> str:
    """Plain-language advice that agrees with the class probabilities and the GPA targets."""
    order = [c for c, _ in CLASS_FLOORS]
    t = {x["class"]: x for x in targets}
    i = order.index(pred)
    up = order[i - 1] if i > 0 else None
    msg = f"Based on the results you entered, you are most likely heading for a {pred}."
    cur = t[pred]
    if cur["status"] == "secured":
        msg += f" Your {pred} is safe as long as you pass your remaining courses."
    elif cur["status"] == "reachable":
        msg += f" To finish with at least a {pred}, aim for an average of {cur['required_gpa']:.2f} or more from now on."
    if up:
        if t[up]["status"] == "out_of_reach":
            msg += f" A {up} is no longer within reach with the units you have left."
        elif probs.get(up, 0) >= 0.25:
            msg += f" You are close to the {up} line ({probs[up]:.0%} chance); an average of {t[up]['required_gpa']:.2f} or more would get you there."
        else:
            msg += f" A {up} is still possible if you average {t[up]['required_gpa']:.2f} or more."
    if pred == "Third Class" or probs.get("Third Class", 0) >= 0.25:
        msg += " Please speak with your academic adviser early; there is still time to change this."
    return msg


_predictor = None


def get_predictor() -> Predictor:
    global _predictor
    if _predictor is None:
        _predictor = Predictor()
    return _predictor
