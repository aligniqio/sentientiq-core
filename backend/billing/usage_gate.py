# billing/usage_gate.py
from __future__ import annotations
import os, time, calendar, json, base64, hashlib, hmac
from dataclasses import dataclass
from typing import Optional, Tuple, Literal, Dict

from fastapi import Request, HTTPException

# Optional: boto3 only if you use DynamoDB
USE_DDB = os.getenv("USAGE_STORE", "memory").lower() == "dynamo"
if USE_DDB:
    import boto3
    from botocore.config import Config as BotoConfig
    _ddb = boto3.resource("dynamodb", config=BotoConfig(region_name=os.getenv("AWS_REGION","us-east-1")))
    _table = _ddb.Table(os.getenv("USAGE_TABLE","sentientiq-usage"))

# ---------- Plans & limits ----------
Plan = Literal["free", "pro", "team", "enterprise"]
DEFAULT_MONTHLY_LIMITS: Dict[Plan, Optional[int]] = {
    "free": 20,        # ❗ change to taste
    "pro": None,       # None = unlimited (you can add soft caps)
    "team": None,
    "enterprise": None,
}

# Optional soft per-minute guard to avoid abuse; None disables
PER_MINUTE_CAP: Dict[Plan, Optional[int]] = {
    "free": 30,
    "pro": 120,
    "team": 300,
    "enterprise": 600,
}

# ---------- Identity & Plan resolution ----------
@dataclass
class Actor:
    user_id: str
    org_id: Optional[str]
    plan: Plan

def _month_bucket(ts: Optional[int]=None) -> str:
    t = ts or int(time.time())
    tm = time.gmtime(t)
    return f"{tm.tm_year:04d}-{tm.tm_mon:02d}"  # e.g., 2025-09

def resolve_actor(request: Request) -> Actor:
    """
    Strategy:
      1) If AUTH_MODE=clerk and 'Authorization: Bearer <JWT>' present -> parse Clerk JWT 'sub'/'org_id' + plan from custom claim 'plan'
      2) Else: use proxy headers (X-User-Id, X-Org-Id, X-Plan) — good for early wiring behind Netlify/Edge
      3) Fallback: anonymous free user keyed by IP hash (not ideal, but unblocks)
    """
    mode = os.getenv("AUTH_MODE","header").lower()
    # 1) Clerk JWT (recommended)
    if mode == "clerk":
        auth = request.headers.get("authorization","")
        if auth.lower().startswith("bearer "):
            token = auth.split(" ",1)[1]
            # ⚠️ Minimal parse: we trust Netlify/Clerk edge to verify; here we just decode
            try:
                payload_b64 = token.split(".")[1] + "=="
                payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()))
                sub = str(payload.get("sub") or payload.get("sid") or "")
                org = payload.get("org_id") or payload.get("org") or None
                plan = str(
                    payload.get("public_metadata",{}).get("plan")
                    or payload.get("meta",{}).get("plan")
                    or "free"
                ).lower()
                if plan not in DEFAULT_MONTHLY_LIMITS: plan = "free"
                if not sub:
                    raise ValueError("No sub in JWT")
                return Actor(user_id=sub, org_id=org, plan=plan)  # type: ignore
            except Exception:
                # fall through to headers
                pass

    # 2) Header resolver (simple + explicit during integration)
    uid = request.headers.get("x-user-id")
    plan = (request.headers.get("x-plan","free") or "free").lower()
    org = request.headers.get("x-org-id")
    if uid:
        if plan not in DEFAULT_MONTHLY_LIMITS: plan = "free"
        return Actor(user_id=uid, org_id=org, plan=plan)  # type: ignore

    # 3) Fallback to IP-hash free tier
    ip = (request.client.host if request.client else "0.0.0.0")
    salt = os.getenv("ANON_SALT","sentientiq")
    anon = hmac.new(salt.encode(), ip.encode(), hashlib.sha256).hexdigest()[:24]
    return Actor(user_id=f"anon:{anon}", org_id=None, plan="free")  # type: ignore

# ---------- Storage backends ----------
def _key(actor: Actor, month: str) -> Tuple[str,str]:
    owner = actor.org_id or actor.user_id  # Team can be org-scoped
    return owner, month

def _get_counts_memory() -> dict:
    # { (owner, month): {"count": int, "minute": {"bucket": "YYYYMMDDHHMM", "count": int}} }
    if not hasattr(_get_counts_memory, "_mem"):
        _get_counts_memory._mem = {}
    return _get_counts_memory._mem  # type: ignore

def read_counts(actor: Actor, now: Optional[int]=None) -> Tuple[int, int]:
    """Returns (month_count, minute_count)"""
    now = now or int(time.time())
    month = _month_bucket(now)
    minute_key = time.strftime("%Y%m%d%H%M", time.gmtime(now))
    owner, mkey = _key(actor, month)

    if USE_DDB:
        resp = _table.get_item(Key={"owner": owner, "month": mkey})
        item = resp.get("Item") or {}
        month_count = int(item.get("count", 0))
        min_state = item.get("minute") or {}
        if min_state.get("bucket") == minute_key:
            minute_count = int(min_state.get("count", 0))
        else:
            minute_count = 0
        return month_count, minute_count
    else:
        mem = _get_counts_memory()
        item = mem.get((owner, mkey), {"count": 0, "minute": {"bucket": minute_key, "count": 0}})
        if item["minute"]["bucket"] != minute_key:
            item["minute"] = {"bucket": minute_key, "count": 0}
            mem[(owner, mkey)] = item
        return int(item["count"]), int(item["minute"]["count"])

def increment(actor: Actor, now: Optional[int]=None) -> Tuple[int,int]:
    """Atomically increments counts and returns (month_count, minute_count) post-increment."""
    now = now or int(time.time())
    month = _month_bucket(now)
    minute_key = time.strftime("%Y%m%d%H%M", time.gmtime(now))
    owner, mkey = _key(actor, month)

    if USE_DDB:
        # Conditional update to roll/reset minute bucket when it changes
        expr = (
            "SET #c = if_not_exists(#c, :z) + :one, "
            "#m = if_not_exists(#m, :empty), "
            "#m.#b = :b, "
            "#m.#n = if_not_exists(#m.#n, :z) + :one"
        )
        resp = _table.update_item(
            Key={"owner": owner, "month": mkey},
            UpdateExpression=expr,
            ExpressionAttributeNames={"#c":"count","#m":"minute","#b":"bucket","#n":"count"},
            ExpressionAttributeValues={":one":1,":z":0,":b":minute_key,":empty":{"bucket":minute_key,"count":0}},
            ReturnValues="ALL_NEW",
        )
        item = resp["Attributes"]
        return int(item["count"]), int(item["minute"]["count"])
    else:
        mem = _get_counts_memory()
        item = mem.get((owner, mkey))
        if not item:
            item = {"count": 0, "minute": {"bucket": minute_key, "count": 0}}
        # roll minute bucket if needed
        if item["minute"]["bucket"] != minute_key:
            item["minute"] = {"bucket": minute_key, "count": 0}
        item["count"] += 1
        item["minute"]["count"] += 1
        mem[(owner, mkey)] = item
        return int(item["count"]), int(item["minute"]["count"])

# ---------- Gate function ----------
class UsageGate:
    def __init__(self,
                 monthly_limits: Dict[Plan, Optional[int]] = DEFAULT_MONTHLY_LIMITS,
                 per_minute_caps: Dict[Plan, Optional[int]] = PER_MINUTE_CAP,
                 scope: Literal["user","org"]="user"):
        self.monthly_limits = monthly_limits
        self.per_minute_caps = per_minute_caps
        self.scope = scope

    async def enforce(self, request: Request) -> Actor:
        actor = resolve_actor(request)

        # If Team and scope=org, count by org_id
        if self.scope == "org" and actor.org_id:
            actor = Actor(user_id=actor.user_id, org_id=actor.org_id, plan=actor.plan)

        # Read current counts
        month_count, minute_count = read_counts(actor)

        # Check per-minute cap
        minute_cap = self.per_minute_caps.get(actor.plan)
        if minute_cap is not None and minute_count >= minute_cap:
            raise HTTPException(status_code=429, detail=f"Rate limit reached for plan '{actor.plan}'. Try again in a minute.")

        # Check monthly limit
        monthly_limit = self.monthly_limits.get(actor.plan)
        if monthly_limit is not None and month_count >= monthly_limit:
            # 402 Payment Required signals "upgrade needed"
            raise HTTPException(status_code=402, detail=f"Monthly quota reached for plan '{actor.plan}'. Please upgrade.")

        # Record the call
        month_count, minute_count = increment(actor)

        # Inject helpful headers
        # (Your reverse proxy can expose these to the frontend if you want)
        request.state.usage = {
            "plan": actor.plan,
            "count_month": month_count,
            "limit_month": monthly_limit,
            "count_minute": minute_count,
            "cap_minute": minute_cap,
            "scope": self.scope,
        }
        return actor