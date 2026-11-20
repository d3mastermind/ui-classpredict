"""ClassPredict API. Run from the backend folder:  uvicorn app.main:app --reload"""
import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .database import FACULTIES, init_db
from .predictor import get_predictor
from .routers import auth, batch, predict
from .seed import seed_demo

@asynccontextmanager
async def lifespan(_app):
    init_db()
    get_predictor()
    if os.getenv("CLASSPREDICT_SEED", "1") == "1":
        seed_demo()
    yield


app = FastAPI(title="ClassPredict API", version="1.0.0", lifespan=lifespan,
              description="Predicts University of Ibadan students' final class of degree (4.0 scale).")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(predict.router)
app.include_router(batch.router)


@app.exception_handler(ValueError)
async def value_error(_: Request, exc: ValueError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.get("/api/meta")
def meta():
    p = get_predictor()
    return {"faculties": FACULTIES, "classes": p.classes, "grading_scale": p.metrics["grading_scale"],
            "stages": {s: {"label": v["label"], "best_model": v["best_model"],
                           "accuracy": v["models"][v["best_model"]]["accuracy"]} for s, v in p.metrics["stages"].items()}}


@app.get("/api/model/metrics")
def model_metrics():
    return get_predictor().metrics


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Serve the built React app (frontend/dist) if it exists, so one command runs everything.
DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        f = os.path.join(DIST, path)
        if path and os.path.isfile(f):
            return FileResponse(f)
        return FileResponse(os.path.join(DIST, "index.html"))
