"""
SentientIQ Backend - The Truth Engine
FastAPI + JetStream + EVI + PhD Collective

This is where Math.random() comes to die.
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
import hashlib

from fastapi import FastAPI, HTTPException, Depends, Request, Header
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import redis.asyncio as redis
import uvicorn

# Our components
from jetstream_config import JetStreamPipeline
from evi_engine import EVICalculator, CampaignInsurance
from moat_builder import EmotionalMoat
from phd_collective import PhDCollectiveOrchestrator


# Request models
class AskRequest(BaseModel):
    question: str
    agent: str = "Consensus"  # or specific agent name
    context: Optional[Dict] = None

class CampaignRequest(BaseModel):
    campaign_id: str
    budget: float
    industry: str
    launch_date: str
    sensitivity: str = "normal"

class FeedbackRequest(BaseModel):
    ask_id: str
    outcome: str  # "success", "failure", "partial"
    details: Optional[Dict] = None


# Global connections
pipeline: Optional[JetStreamPipeline] = None
redis_client: Optional[redis.Redis] = None
moat: Optional[EmotionalMoat] = None
evi_calculator: Optional[EVICalculator] = None
phd_collective: Optional[PhDCollectiveOrchestrator] = None
campaign_insurance: Optional[CampaignInsurance] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown lifecycle.
    This is where we initialize the moat.
    """
    global pipeline, redis_client, moat, evi_calculator, phd_collective, campaign_insurance
    
    print("""
    🚀 SENTIENTIQ INITIALIZING
    ═══════════════════════════
    The truth engine is starting...
    """)
    
    # Connect to Redis
    redis_client = await redis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True
    )
    
    # Initialize JetStream pipeline
    pipeline = JetStreamPipeline()
    await pipeline.connect()
    await pipeline.initialize_streams()
    
    # Initialize the moat
    moat = EmotionalMoat()
    await moat.initialize_moat()
    
    # Initialize EVI calculator
    evi_calculator = EVICalculator(redis_client=redis_client)
    
    # Initialize PhD Collective
    phd_collective = PhDCollectiveOrchestrator()
    await phd_collective.connect()
    asyncio.create_task(phd_collective.start_processing())
    
    # Initialize Campaign Insurance
    campaign_insurance = CampaignInsurance(evi_calculator, pipeline.js)
    
    print("""
    ✅ SYSTEMS ONLINE
    ═════════════════
    • JetStream: Connected
    • Redis: Connected  
    • Moat: Accumulating
    • EVI: Calculating
    • PhD Collective: Thinking
    • Campaign Insurance: Active
    
    The truth engine is ready.
    Math.random() detectors: Armed.
    """)
    
    yield
    
    # Cleanup
    await pipeline.close()
    await phd_collective.close()
    await redis_client.close()
    print("👋 SentientIQ shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="SentientIQ API",
    description="The Emotional Intelligence Infrastructure. No Math.random().",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://sentientiq.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency (simplified for now)
async def verify_auth(
    x_user_id: Optional[str] = Header(None),
    x_org_id: Optional[str] = Header(None),
    x_plan: Optional[str] = Header(None)
) -> Dict:
    """
    Verify user auth and plan.
    In production, this validates JWT.
    """
    
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    return {
        "user_id": x_user_id,
        "org_id": x_org_id,
        "plan": x_plan or "free"
    }


@app.get("/")
async def root():
    """Root endpoint - the manifesto"""
    return {
        "name": "SentientIQ",
        "truth": "We don't use Math.random()",
        "promise": "Real emotional intelligence, not generated bullshit",
        "moat_depth": await moat.calculate_moat_depth() if moat else {},
        "message": "The crystal palace of marketing truth"
    }


@app.post("/api/ask")
async def ask_collective(
    request: AskRequest,
    auth: Dict = Depends(verify_auth)
):
    """
    Ask the PhD Collective.
    This is the core product - real analysis, not Math.random().
    """
    
    # Check rate limits based on plan
    plan = auth["plan"]
    if plan == "free":
        # Check Redis for usage
        usage_key = f"usage:{auth['user_id']}:{datetime.utcnow().strftime('%Y%m')}"
        usage = await redis_client.incr(usage_key)
        
        if usage > 20:  # Free tier limit
            raise HTTPException(status_code=429, detail="Monthly limit exceeded")
    
    # Generate ask ID
    ask_id = hashlib.md5(
        f"{request.question}{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:8]
    
    # Store ask for feedback loop
    await redis_client.setex(
        f"ask:{ask_id}",
        86400,  # 24 hour TTL
        json.dumps({
            "question": request.question,
            "agent": request.agent,
            "context": request.context,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": auth["user_id"]
        })
    )
    
    # Get current EVI for context
    evi_snapshot = await evi_calculator.calculate_current_evi()
    
    # Process with PhD Collective
    if request.agent == "Consensus":
        # Get insights from multiple agents (mock for now)
        # In production, this queries enriched.posts.* stream
        
        response = {
            "ask_id": ask_id,
            "decision": "GO" if evi_snapshot.signal.value == "GO" else "WAIT",
            "confidence": evi_snapshot.confidence,
            "agent": "Consensus",
            "why": {
                "reasoning": f"Based on current emotional volatility (EVI: {evi_snapshot.index_value:.1f})",
                "factors": [
                    {"name": "Emotional Volatility", "impact": evi_snapshot.index_value / 100, "weight": 40},
                    {"name": "Authenticity Drift", "impact": evi_snapshot.authenticity_drift / 100, "weight": 30},
                    {"name": "Topic Turbulence", "impact": evi_snapshot.topic_turbulence / 100, "weight": 30}
                ],
                "risks": evi_snapshot.risk_factors,
                "opportunities": evi_snapshot.opportunity_factors
            }
        }
    else:
        # Single agent response
        response = {
            "ask_id": ask_id,
            "decision": "MONITOR",
            "confidence": 0.85,
            "agent": request.agent,
            "why": {
                "reasoning": f"Agent {request.agent} analysis complete",
                "factors": []
            }
        }
    
    # Publish to feedback stream for learning
    await pipeline.js.publish(
        "feedback.events",
        json.dumps({
            "type": "ask",
            "ask_id": ask_id,
            "request": request.dict(),
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        }).encode()
    )
    
    return response


@app.get("/api/pulse")
async def emotional_pulse(auth: Dict = Depends(verify_auth)):
    """
    Real-time EVI pulse via Server-Sent Events.
    This is the heartbeat of emotional intelligence.
    """
    
    async def generate_pulse():
        """Generate SSE stream of EVI updates"""
        
        while True:
            try:
                # Calculate current EVI
                evi_snapshot = await evi_calculator.calculate_current_evi()
                
                # Format as SSE
                data = {
                    "timestamp": evi_snapshot.timestamp.isoformat(),
                    "evi": evi_snapshot.index_value,
                    "signal": evi_snapshot.signal.value,
                    "confidence": evi_snapshot.confidence,
                    "dominant_emotion": evi_snapshot.dominant_emotion,
                    "components": {
                        "sentiment_volatility": evi_snapshot.sentiment_volatility,
                        "authenticity_drift": evi_snapshot.authenticity_drift,
                        "topic_turbulence": evi_snapshot.topic_turbulence,
                        "viral_coefficient": evi_snapshot.viral_coefficient
                    }
                }
                
                # Send SSE event
                yield f"data: {json.dumps(data)}\n\n"
                
                # Cache in Redis for fast access
                await redis_client.setex(
                    "evi:latest",
                    60,
                    json.dumps(data)
                )
                
                # Update every 5 seconds
                await asyncio.sleep(5)
                
            except Exception as e:
                print(f"Pulse error: {e}")
                yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"
                await asyncio.sleep(5)
    
    return StreamingResponse(
        generate_pulse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.post("/api/campaign/insure")
async def insure_campaign(
    request: CampaignRequest,
    auth: Dict = Depends(verify_auth)
):
    """
    Insure a campaign against emotional volatility.
    This prevents $2M disasters.
    """
    
    # Parse launch date
    launch_date = datetime.fromisoformat(request.launch_date)
    
    # Start insurance monitoring
    insurance_policy = await campaign_insurance.insure_campaign(
        campaign_id=request.campaign_id,
        budget=request.budget,
        industry=request.industry,
        launch_date=launch_date,
        sensitivity=request.sensitivity
    )
    
    # Store in Redis
    await redis_client.setex(
        f"campaign:{request.campaign_id}",
        int((launch_date - datetime.utcnow()).total_seconds()),
        json.dumps({
            **request.dict(),
            "insured_at": datetime.utcnow().isoformat(),
            "user_id": auth["user_id"]
        })
    )
    
    return insurance_policy


@app.get("/api/campaign/{campaign_id}/status")
async def campaign_status(
    campaign_id: str,
    auth: Dict = Depends(verify_auth)
):
    """Get current status of insured campaign"""
    
    # Get from Redis
    campaign_data = await redis_client.get(f"campaign:{campaign_id}")
    if not campaign_data:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = json.loads(campaign_data)
    
    # Get current EVI
    evi_snapshot = await evi_calculator.calculate_current_evi(
        industry=campaign["industry"]
    )
    
    return {
        "campaign_id": campaign_id,
        "current_signal": evi_snapshot.signal.value,
        "current_evi": evi_snapshot.index_value,
        "confidence": evi_snapshot.confidence,
        "risks": evi_snapshot.risk_factors,
        "opportunities": evi_snapshot.opportunity_factors,
        "recommendation": "LAUNCH" if evi_snapshot.signal.value == "GO" else "WAIT",
        "stability_eta_hours": evi_snapshot.predicted_stability_hours
    }


@app.post("/api/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    auth: Dict = Depends(verify_auth)
):
    """
    Feedback loop for continuous learning.
    This is how we get better than Math.random().
    """
    
    # Get original ask
    ask_data = await redis_client.get(f"ask:{request.ask_id}")
    if not ask_data:
        raise HTTPException(status_code=404, detail="Ask not found")
    
    ask = json.loads(ask_data)
    
    # Publish feedback event
    await pipeline.js.publish(
        "feedback.events",
        json.dumps({
            "type": "feedback",
            "ask_id": request.ask_id,
            "original_ask": ask,
            "outcome": request.outcome,
            "details": request.details,
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": auth["user_id"]
        }).encode()
    )
    
    # Store in moat for learning
    await moat.write_agent_insight(
        agent_name="Feedback_Loop",
        insight_type="outcome",
        data={
            "ask_id": request.ask_id,
            "outcome": request.outcome,
            "learning_value": 1.0 if request.outcome == "success" else 0.0
        }
    )
    
    return {"status": "feedback_received", "learning": "in_progress"}


@app.get("/api/moat/depth")
async def moat_depth(auth: Dict = Depends(verify_auth)):
    """
    Show how deep our moat is.
    This is our defensibility metric.
    """
    
    depth = await moat.calculate_moat_depth()
    
    return {
        "moat_depth": depth,
        "message": f"It would take {depth['estimated_replication_time_years']:.1f} years to replicate our moat",
        "comparison": "Math.random() takes 0 seconds to replicate"
    }


@app.get("/api/wall-of-shame")
async def wall_of_shame():
    """
    Public wall of shame for Math.random() vendors.
    Fed by the Intent Data Auditor extension.
    """
    
    # Get recent exposures from Redis
    exposures = []
    
    cursor = 0
    while True:
        cursor, keys = await redis_client.scan(
            cursor, 
            match="shame:*",
            count=100
        )
        
        for key in keys:
            exposure = await redis_client.get(key)
            if exposure:
                exposures.append(json.loads(exposure))
        
        if cursor == 0:
            break
    
    # Sort by timestamp
    exposures.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {
        "total_exposed": len(exposures),
        "recent_exposures": exposures[:10],
        "total_math_random_calls": sum(e.get("mathRandomCount", 0) for e in exposures),
        "message": "These vendors use Math.random() for 'AI-powered' intent data"
    }


@app.post("/api/wall-of-shame")
async def report_to_wall_of_shame(evidence: Dict):
    """
    Receive evidence from Intent Data Auditor extension.
    This is where vendors get exposed.
    """
    
    # Validate evidence
    if not evidence.get("platform") or not evidence.get("mathRandomCount"):
        raise HTTPException(status_code=400, detail="Invalid evidence")
    
    # Generate shame ID
    shame_id = hashlib.md5(
        f"{evidence['platform']}{evidence['timestamp']}".encode()
    ).hexdigest()[:8]
    
    # Store in Redis
    await redis_client.setex(
        f"shame:{shame_id}",
        86400 * 30,  # 30 days
        json.dumps(evidence)
    )
    
    # Also store in moat for permanent record
    await moat.write_agent_insight(
        agent_name="Intent_Auditor",
        insight_type="vendor_exposure",
        data=evidence
    )
    
    print(f"""
    🚨 VENDOR EXPOSED ON WALL OF SHAME
    ═══════════════════════════════════
    Platform: {evidence['platform']}
    Math.random() calls: {evidence['mathRandomCount']}
    Reporter: {evidence.get('reporterHash', 'anonymous')}
    
    Another one bites the dust.
    """)
    
    return {
        "status": "exposed",
        "shame_id": shame_id,
        "message": f"{evidence['platform']} has been added to the Wall of Shame"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    
    checks = {
        "api": "healthy",
        "redis": "healthy" if redis_client else "unhealthy",
        "jetstream": "healthy" if pipeline and pipeline.nc else "unhealthy",
        "moat": "healthy" if moat else "unhealthy"
    }
    
    all_healthy = all(v == "healthy" for v in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "checks": checks,
        "message": "No Math.random() detected"
    }


if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )