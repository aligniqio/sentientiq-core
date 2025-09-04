# billing/stripe_clerk_webhook.py
from __future__ import annotations
import os, json, stripe, requests
from typing import Optional, Dict, Any, Tuple, List

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/stripe", tags=["billing"])

stripe.api_key = os.getenv("STRIPE_API_KEY", "")

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
CLERK_SECRET_KEY      = os.getenv("CLERK_SECRET_KEY", "")
CLERK_API_BASE        = os.getenv("CLERK_API_BASE", "https://api.clerk.com/v1")

# Map Stripe price IDs to your internal plan slugs ("pro" | "team" | "enterprise" | "free")
def _parse_plan_map() -> Dict[str, str]:
    raw = os.getenv("PLAN_MAP", "")
    out: Dict[str, str] = {}
    for pair in filter(None, [p.strip() for p in raw.split(",")]):
        if "=" in pair:
            k, v = pair.split("=", 1)
            out[k.strip()] = v.strip()
    return out

PLAN_MAP = _parse_plan_map()

def plan_from_subscription(sub: Dict[str, Any]) -> Optional[str]:
    try:
        items: List[Dict[str, Any]] = sub["items"]["data"]
        price_id = items[0]["price"]["id"] if items else None
        if not price_id:
            return None
        return PLAN_MAP.get(price_id)
    except Exception:
        return None

def upsert_clerk_user_plan(user_id: str, plan: str):
    # PATCH /v1/users/{id}  with {"public_metadata": {"plan": plan}}
    url = f"{CLERK_API_BASE}/users/{user_id}"
    resp = requests.patch(
        url,
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}", "Content-Type": "application/json"},
        json={"public_metadata": {"plan": plan}},
        timeout=10,
    )
    if resp.status_code >= 300:
        raise HTTPException(status_code=500, detail=f"Clerk user update failed: {resp.text}")

def upsert_clerk_org_plan(org_id: str, plan: str):
    # PATCH /v1/organizations/{id} {"public_metadata": {"plan": plan}}
    url = f"{CLERK_API_BASE}/organizations/{org_id}"
    resp = requests.patch(
        url,
        headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}", "Content-Type": "application/json"},
        json={"public_metadata": {"plan": plan}},
        timeout=10,
    )
    if resp.status_code >= 300:
        raise HTTPException(status_code=500, detail=f"Clerk org update failed: {resp.text}")

def extract_targets(obj: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Return (clerk_user_id, clerk_org_id) in that order, preferring explicit metadata.
    """
    md = (obj.get("metadata") or {}) if isinstance(obj, dict) else {}
    user_id = md.get("clerk_user_id")
    org_id  = md.get("clerk_org_id")

    # Fallback: checkout.session.client_reference_id used for user
    if not user_id and obj.get("client_reference_id"):
        user_id = obj["client_reference_id"]

    return (str(user_id) if user_id else None, str(org_id) if org_id else None)

@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(
            payload=payload, sig_header=sig, secret=STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Webhook signature verification failed: {e}")

    etype = event["type"]
    data = event["data"]["object"]

    # Handle both initial checkout and later subscription updates
    # 1) checkout.session.completed -> read the subscription id and customer metadata
    # 2) customer.subscription.updated/deleted -> adjust plan
    # 3) invoice.payment_succeeded -> (optional) enforce plan again

    try:
        if etype == "checkout.session.completed":
            session = data
            # Fetch subscription to read price and items
            sub_id = session.get("subscription")
            user_id, org_id = extract_targets(session)
            if not sub_id:
                return JSONResponse({"ok": True, "note": "no subscription on session"}, status_code=200)
            sub = stripe.Subscription.retrieve(sub_id, expand=["items.data.price"])
            plan = plan_from_subscription(sub) or "pro"

            if org_id:
                upsert_clerk_org_plan(org_id, plan)
            elif user_id:
                upsert_clerk_user_plan(user_id, plan)
            else:
                # No Clerk IDs passed — nothing we can stamp
                pass

        elif etype in ("customer.subscription.updated", "customer.subscription.created"):
            sub = data
            plan = plan_from_subscription(sub)
            # Try to recover Clerk IDs from subscription metadata
            user_id, org_id = extract_targets(sub)
            # If not there, try pulling from the related customer
            if not (user_id or org_id):
                cust_id = sub.get("customer")
                if cust_id:
                    cust = stripe.Customer.retrieve(cust_id)
                    user_id = (cust.get("metadata") or {}).get("clerk_user_id") or user_id
                    org_id  = (cust.get("metadata")  or {}).get("clerk_org_id")  or org_id

            if plan:
                if org_id:
                    upsert_clerk_org_plan(org_id, plan)
                elif user_id:
                    upsert_clerk_user_plan(user_id, plan)

        elif etype == "customer.subscription.deleted":
            # Downgrade to free on cancel
            sub = data
            user_id, org_id = extract_targets(sub)
            if not (user_id or org_id):
                cust_id = sub.get("customer")
                if cust_id:
                    cust = stripe.Customer.retrieve(cust_id)
                    user_id = (cust.get("metadata") or {}).get("clerk_user_id") or user_id
                    org_id  = (cust.get("metadata")  or {}).get("clerk_org_id")  or org_id

            if org_id:
                upsert_clerk_org_plan(org_id, "free")
            elif user_id:
                upsert_clerk_user_plan(user_id, "free")

        # (Optional) invoice.payment_failed -> flag? leave to Stripe emails
    except HTTPException:
        raise
    except Exception as e:
        # Avoid retries storms: respond 200 but log
        # (swap to 500 if you want Stripe to retry)
        return JSONResponse({"ok": False, "error": str(e)}, status_code=200)

    return {"ok": True}