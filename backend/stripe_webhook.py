"""
Stripe Webhook Handler for SentientIQ
Handles subscription lifecycle events and updates user metadata
"""
import os
import json
import stripe
from fastapi import APIRouter, Request, HTTPException, Header
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# Price ID to plan mapping
PRICE_TO_PLAN = {
    os.getenv("STRIPE_PRO_PRICE_ID", "price_pro"): "pro",
    os.getenv("STRIPE_TEAM_PRICE_ID", "price_team"): "team",
    os.getenv("STRIPE_ENTERPRISE_PRICE_ID", "price_enterprise"): "enterprise",
}

webhook_router = APIRouter(prefix="/webhook", tags=["billing"])

def update_user_plan(customer_id: str, plan: str):
    """Update user's plan in your system (Clerk, DB, etc.)"""
    # TODO: Implement based on your auth system
    # For Clerk:
    # clerk_client.users.update_metadata(user_id, {"publicMetadata": {"plan": plan}})
    
    # For now, just log
    logger.info(f"Would update customer {customer_id} to plan {plan}")
    
    # If using a database, update here
    # db.execute("UPDATE users SET plan = ? WHERE stripe_customer_id = ?", (plan, customer_id))
    pass

@webhook_router.post("/stripe")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    """Handle Stripe webhook events"""
    
    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not configured")
        return {"ok": False, "error": "Webhook secret not configured"}
    
    # Get raw body
    try:
        payload = await request.body()
    except Exception as e:
        logger.error(f"Failed to read request body: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    
    # Verify signature
    try:
        event = stripe.Webhook.construct_event(
            payload, stripe_signature, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle the event
    event_type = event["type"]
    data = event["data"]["object"]
    
    logger.info(f"Processing Stripe event: {event_type}")
    
    if event_type == "checkout.session.completed":
        # New subscription created via Checkout
        session = data
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        
        if subscription_id:
            # Get subscription details
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                price_id = subscription["items"]["data"][0]["price"]["id"]
                plan = PRICE_TO_PLAN.get(price_id, "free")
                
                # Update user plan
                update_user_plan(customer_id, plan)
                
                logger.info(f"New subscription: {customer_id} -> {plan}")
            except Exception as e:
                logger.error(f"Failed to process new subscription: {e}")
    
    elif event_type == "customer.subscription.created":
        # Subscription created (backup handler)
        subscription = data
        customer_id = subscription.get("customer")
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan = PRICE_TO_PLAN.get(price_id, "free")
        
        update_user_plan(customer_id, plan)
        logger.info(f"Subscription created: {customer_id} -> {plan}")
    
    elif event_type == "customer.subscription.updated":
        # Plan changed
        subscription = data
        customer_id = subscription.get("customer")
        price_id = subscription["items"]["data"][0]["price"]["id"]
        plan = PRICE_TO_PLAN.get(price_id, "free")
        
        update_user_plan(customer_id, plan)
        logger.info(f"Subscription updated: {customer_id} -> {plan}")
    
    elif event_type in ["customer.subscription.deleted", "customer.subscription.canceled"]:
        # Subscription canceled/expired
        subscription = data
        customer_id = subscription.get("customer")
        
        update_user_plan(customer_id, "free")
        logger.info(f"Subscription canceled: {customer_id} -> free")
    
    elif event_type == "invoice.payment_failed":
        # Payment failed - optionally downgrade or notify
        invoice = data
        customer_id = invoice.get("customer")
        
        logger.warning(f"Payment failed for customer: {customer_id}")
        # Could send email notification or temporarily restrict access
    
    else:
        logger.info(f"Unhandled event type: {event_type}")
    
    return {"ok": True, "received": event_type}

# Optional: Customer portal management
@webhook_router.post("/create-portal-session")
async def create_portal_session(request: Request):
    """Create a Stripe Customer Portal session for subscription management"""
    
    body = await request.json()
    customer_id = body.get("customer_id")
    return_url = body.get("return_url", os.getenv("VITE_APP_URL", "http://localhost:5173") + "/billing")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Failed to create portal session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")

# Health check for webhook
@webhook_router.get("/health")
def webhook_health():
    """Check if webhook handler is configured"""
    return {
        "ok": True,
        "configured": bool(STRIPE_WEBHOOK_SECRET),
        "plans_mapped": len(PRICE_TO_PLAN)
    }