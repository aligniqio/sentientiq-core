# billing/checkout.py
"""
Stripe Checkout Session creation endpoint
"""
import os
import stripe
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/checkout", tags=["billing"])

stripe.api_key = os.getenv("STRIPE_API_KEY") or os.getenv("STRIPE_SECRET_KEY")

class CheckoutRequest(BaseModel):
    priceId: str
    successUrl: Optional[str] = None
    cancelUrl: Optional[str] = None
    metadata: Optional[dict] = None
    clientReferenceId: Optional[str] = None

@router.post("/create-session")
async def create_checkout_session(req: CheckoutRequest, request: Request):
    """Create a Stripe Checkout session for subscription"""
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Get the host for redirect URLs
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:3000"
    protocol = request.headers.get("x-forwarded-proto") or "http"
    base_url = f"{protocol}://{host}"
    
    # Build redirect URLs
    success_url = req.successUrl or f"{base_url}/billing?success=true"
    cancel_url = req.cancelUrl or f"{base_url}/pricing"
    
    try:
        # Create the checkout session
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[
                {
                    "price": req.priceId,
                    "quantity": 1,
                }
            ],
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=req.metadata or {},
            client_reference_id=req.clientReferenceId,
            # Enable customer creation and portal
            customer_creation="if_required",
            billing_address_collection="auto",
            # Allow promotion codes
            allow_promotion_codes=True,
        )
        
        return {"id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create checkout session: {str(e)}")

@router.post("/create-portal-session")
async def create_portal_session(request: Request):
    """Create a Stripe Customer Portal session for managing subscriptions"""
    
    body = await request.json()
    customer_id = body.get("customer_id")
    
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")
    
    # Get return URL
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or "localhost:3000"
    protocol = request.headers.get("x-forwarded-proto") or "http"
    return_url = body.get("return_url", f"{protocol}://{host}/billing")
    
    try:
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portal session: {str(e)}")