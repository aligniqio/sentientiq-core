# app.py
# Single-file FastAPI for SentientIQ Phase-1
# Endpoints: /ask, /pulse (SSE), /feedback, health checks
import os
import json
import time
import threading
from typing import Dict, Any, Optional, List

from fastapi import FastAPI, APIRouter, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from pydantic import BaseModel, Field

# S3 access
import boto3
from botocore.config import Config as BotoConfig
import s3fs
import joblib

# Usage gate for billing enforcement
try:
    from billing.usage_gate import UsageGate
    USAGE_SCOPE = os.getenv("USAGE_SCOPE", "user")  # or "org" for Team counting
    gate = UsageGate(scope=USAGE_SCOPE)
    USAGE_GATE_AVAILABLE = True
except ImportError:
    USAGE_GATE_AVAILABLE = False
    print("Warning: usage_gate not found, running without rate limits")

APP_VERSION = os.getenv("APP_VERSION", "sentientiq-fastapi-1.0.0")

# -------------------------
# Environment configuration
# -------------------------
AWS_REGION = os.getenv("AWS_REGION", "us-east-2")  # Changed to us-east-2 for our setup

# Buckets/keys
MOAT_BUCKET = os.getenv("MOAT_BUCKET", "sentientiq-data-moat")
PULSE_SNAPSHOT_KEY = os.getenv("PULSE_SNAPSHOT_KEY", "evi_ts/latest_snapshot.json")

ML_BUCKET = os.getenv("ML_BUCKET", "sentientiq-ml-375218375")  # Our actual ML bucket
REGISTRY_KEY = os.getenv("MODEL_REGISTRY_KEY", "registry/manifest.json")
MODEL_VERSION_OVERRIDE = os.getenv("MODEL_VERSION", "")  # e.g. "Emotion:16936,Strategy:16937"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")  # comma-separated, or * for all
ALLOW_CREDENTIALS = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"
CORS_METHODS = os.getenv("CORS_METHODS", "GET,POST,OPTIONS")
CORS_HEADERS = os.getenv("CORS_HEADERS", "Authorization,Content-Type")

# SSE
PULSE_TTL_SEC = int(os.getenv("PULSE_TTL", "15"))
PULSE_POLL_INTERVAL = float(os.getenv("PULSE_POLL_INTERVAL", "1.0"))

# Health
READY_REQUIRE_S3 = os.getenv("READY_REQUIRE_S3", "false").lower() == "true"

AGENTS: List[str] = [
    "Strategy","Emotion","Pattern","Identity","Chaos","ROI","Warfare",
    "Omni","First","Truth","Brutal","Context"
]

# -------------------------
# Clients
# -------------------------
boto_cfg = BotoConfig(region_name=AWS_REGION)
s3_client = boto3.client("s3", config=boto_cfg)
fs = s3fs.S3FileSystem()

# -------------------------
# App + CORS
# -------------------------
app = FastAPI(title="SentientIQ API", version=APP_VERSION)

origins = [o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=ALLOW_CREDENTIALS,
    allow_methods=[m.strip() for m in CORS_METHODS.split(",")],
    allow_headers=[h.strip() for h in CORS_HEADERS.split(",")],
)

# =========================
# Health & meta endpoints
# =========================
@app.get("/version")
def version():
    return {"version": APP_VERSION, "aws_region": AWS_REGION}

@app.get("/livez")
def live():
    return {"ok": True, "ts": int(time.time())}

@app.get("/healthz")
def health():
    # Lightweight check; not calling external deps
    return {"ok": True}

@app.get("/readyz")
def ready():
    # Optionally ensure we can read from S3
    if not READY_REQUIRE_S3:
        return {"ok": True, "s3": "skipped"}
    try:
        s3_client.head_bucket(Bucket=MOAT_BUCKET)
        s3_client.head_bucket(Bucket=ML_BUCKET)
        return {"ok": True, "s3": "ok"}
    except Exception as e:
        return JSONResponse(status_code=503, content={"ok": False, "error": str(e)})

# =========================
# /pulse (snapshot + SSE)
# =========================
pulse_router = APIRouter(prefix="/pulse", tags=["pulse"])

class _Cache:
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if not entry:
            return None
        if entry["exp"] < time.time():
            return None
        return entry["val"]

    def set(self, key: str, val: str, ttl: int):
        self._store[key] = {"val": val, "exp": time.time() + ttl}

_cache = _Cache()

def _load_pulse_snapshot() -> Dict[str, Any]:
    cached = _cache.get("pulse_snapshot")
    if cached:
        return json.loads(cached)
    
    # For now, return mock data until S3 is populated
    # In production, uncomment the S3 fetch:
    # obj = s3_client.get_object(Bucket=MOAT_BUCKET, Key=PULSE_SNAPSHOT_KEY)
    # payload = obj["Body"].read()
    # data = json.loads(payload)
    
    # Mock EVI data for testing
    data = {
        "timestamp": time.time(),
        "evi": 73.4,
        "trend": "rising",
        "signals": {
            "twitter": {"sentiment": 0.62, "volume": 1847},
            "reddit": {"sentiment": -0.18, "volume": 423},
            "linkedin": {"sentiment": 0.41, "volume": 89}
        },
        "consensus": 0.78,
        "alert_level": "normal"
    }
    
    _cache.set("pulse_snapshot", json.dumps(data), PULSE_TTL_SEC)
    return data

@pulse_router.get("/snapshot")
def pulse_snapshot():
    data = _load_pulse_snapshot()
    return JSONResponse(data)

@pulse_router.get("")  # SSE stream at /pulse
def pulse_stream():
    async def eventgen():
        last_payload = None
        while True:
            try:
                data = _load_pulse_snapshot()
                payload = json.dumps(data, separators=(",", ":"))
                if payload != last_payload:
                    yield f"data: {payload}\n\n"
                    last_payload = payload
            except Exception as e:
                err = json.dumps({"error": str(e)})
                yield f"data: {err}\n\n"
            # maintain ~1Hz cadence
            await asyncio.sleep(PULSE_POLL_INTERVAL)

    import asyncio
    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
    }
    return StreamingResponse(eventgen(), headers=headers)

app.include_router(pulse_router)

# =========================
# /ask (PhD collective)
# =========================
ask_router = APIRouter(prefix="/ask", tags=["ask"])
_models: Dict[tuple, Dict[str, Any]] = {}
_lock = threading.Lock()

def _parse_version_override() -> Dict[str, str]:
    m: Dict[str, str] = {}
    if not MODEL_VERSION_OVERRIDE:
        return m
    for tok in MODEL_VERSION_OVERRIDE.split(","):
        if ":" in tok:
            a, v = tok.split(":", 1)
            m[a.strip()] = v.strip()
    return m

def _load_registry() -> Dict[str, Any]:
    # For now, return mock registry until S3 is populated
    # In production:
    # key = f"s3://{ML_BUCKET}/{REGISTRY_KEY}"
    # with fs.open(key) as f:
    #     return json.load(f)
    
    return {
        "agents": {
            agent: {
                "prod_version": "1.0.0",
                "versions": {
                    "1.0.0": {
                        "s3_key": f"models/{agent}/v1.0.0/model.pkl"
                    }
                }
            } for agent in AGENTS
        }
    }

def _get_model(agent: str):
    reg = _load_registry()
    if agent not in reg.get("agents", {}):
        raise HTTPException(status_code=404, detail=f"No registry for agent '{agent}'")
    
    override = _parse_version_override().get(agent)
    rec = reg["agents"][agent]
    version = override or rec.get("prod_version") or rec.get("canary_version")
    
    if not version:
        raise HTTPException(503, f"No version available for agent '{agent}'")
    
    # For now, return mock model until S3 models are ready
    # In production, load from S3:
    # key = rec["versions"][version]["s3_key"]
    # cache_key = (agent, version)
    # with _lock:
    #     if cache_key in _models:
    #         return _models[cache_key], version
    #     with fs.open(f"s3://{ML_BUCKET}/{key}", "rb") as f:
    #         bundle = joblib.load(f)
    #     _models[cache_key] = bundle
    #     return bundle, version
    
    # Mock model for testing
    class MockModel:
        def predict_proba(self, x):
            import numpy as np
            # Simulate intelligence based on features
            score = x.values.mean() + np.random.normal(0, 0.1)
            score = np.clip(score, 0, 1)
            return np.array([[1-score, score]])
    
    bundle = {
        "model": MockModel(),
        "features": ["intensity", "engagement_rate", "authenticity_mean", "consensus"]
    }
    return bundle, version

class AskReq(BaseModel):
    question: str = Field(..., description="User question/prompt")
    agent: Optional[str] = Field("Strategy", description="One of the 12 agents")
    context: Optional[Dict[str, Any]] = Field(default=None)

@ask_router.post("")
async def ask(req: AskReq, request: Request):
    # ENFORCE USAGE here
    if USAGE_GATE_AVAILABLE:
        await gate.enforce(request)
    
    # Default to Strategy if not specified
    agent = req.agent or "Strategy"
    
    if agent not in AGENTS:
        raise HTTPException(status_code=400, detail=f"Unknown agent: {agent}")
    
    bundle, version = _get_model(agent)
    model = bundle["model"]
    feats = bundle.get("features", ["intensity","engagement_rate","authenticity_mean","consensus"])

    # Phase-1: derive features primarily from context (fallback defaults)
    import pandas as pd
    ctx = req.context or {}
    x = pd.DataFrame([{
        "intensity": ctx.get("intensity", 0.3),
        "engagement_rate": ctx.get("engagement_rate", 0.1),
        "authenticity_mean": ctx.get("authenticity_mean", 0.9),
        "consensus": ctx.get("consensus", 0.2),
    }])
    # align to training feature order
    x = x[[c for c in feats]]

    proba = float(model.predict_proba(x)[:, 1][0])
    decision = "GO" if proba >= 0.65 else "WAIT"
    
    # Agent-specific responses based on personality
    agent_personas = {
        "Strategy": "Revenue is a lagging indicator of emotion.",
        "Emotion": "People buy feelings, not features.",
        "Pattern": "The data never lies, but it often misleads.",
        "Identity": "Brand is what they say when you're not in the room.",
        "Chaos": "Volatility is opportunity disguised as risk.",
        "ROI": "Every emotion has a price. Most are undervalued.",
        "Warfare": "Markets are battlefields. Position accordingly.",
        "Omni": "All channels converge on human need.",
        "First": "First principles: fear and greed drive everything.",
        "Truth": "The market can stay irrational longer than you can stay solvent.",
        "Brutal": "Hope is not a strategy. Data is.",
        "Context": "Context determines meaning. Always."
    }
    
    resp = {
        "agent": agent,
        "decision": decision,
        "confidence": proba,
        "insight": agent_personas.get(agent, "Processing..."),
        "why": {
            "features": x.iloc[0].to_dict(),
            "model_version": version,
        },
        "query": req.question
    }
    
    # Add usage headers if available
    r = JSONResponse(resp)
    if USAGE_GATE_AVAILABLE:
        u = getattr(request.state, "usage", {})
        if u:
            if u.get("limit_month") is not None:
                remaining = max(0, u["limit_month"] - u["count_month"])
                r.headers["X-Plan"] = u["plan"]
                r.headers["X-Usage-Remaining"] = str(remaining)
                r.headers["X-Usage-This-Minute"] = str(u["count_minute"])
    return r

app.include_router(ask_router)

# =========================
# /feedback (learning loop)
# =========================
feedback_router = APIRouter(prefix="/feedback", tags=["feedback"])

class Feedback(BaseModel):
    ask_payload: Dict[str, Any]
    answer_payload: Dict[str, Any]
    outcome: Dict[str, Any]  # e.g. {"converted": true, "value": 2500}

@feedback_router.post("")
def feedback(fb: Feedback, request: Request):
    # Store one JSON file per feedback item (simple, append-only)
    ts = int(time.time())
    # Optional: include a coarse user hash to group by source (no PII)
    source_ip = request.client.host if request and request.client else "unknown"
    record = fb.dict()
    record["_meta"] = {"ts": ts, "source_ip": source_ip, "app_version": APP_VERSION}

    # For testing, just log it
    print(f"Feedback received: {json.dumps(record)}")
    
    # In production, write to S3:
    # key = f"feedback/ts={ts}.json"
    # with fs.open(f"s3://{MOAT_BUCKET}/{key}", "wb") as f:
    #     f.write(json.dumps(record).encode("utf-8"))
    
    return {"ok": True, "feedback_id": f"fb_{ts}"}

app.include_router(feedback_router)

# =========================
# Stripe billing endpoints
# =========================
try:
    from billing.stripe_clerk_webhook import router as stripe_router
    from billing.checkout import router as checkout_router
    app.include_router(stripe_router)
    app.include_router(checkout_router)
    print("Stripe billing handlers loaded")
except ImportError as e:
    print(f"Warning: Stripe billing handlers not available: {e}")

# -------------------------
# Root for convenience
# -------------------------
@app.get("/")
def root():
    return {
        "ok": True,
        "service": "SentientIQ FastAPI",
        "version": APP_VERSION,
        "endpoints": ["/ask", "/pulse (SSE)", "/pulse/snapshot", "/feedback",
                      "/healthz", "/readyz", "/livez", "/version"],
        "agents": AGENTS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)