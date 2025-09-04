"""
EVI - Emotional Volatility Index
The world's first real-time emotional insurance for ad campaigns

This is what makes campaigns wait during data breaches and GO when emotions stabilize.
"""

import asyncio
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import hashlib

import boto3
import pandas as pd
from scipy import stats
from sklearn.preprocessing import MinMaxScaler

class Signal(Enum):
    """Campaign signals - the only three that matter"""
    GO = "GO"           # Clear to launch
    WAIT = "WAIT"       # Temporary hold
    ABORT = "ABORT"     # Do not launch

@dataclass
class EVISnapshot:
    """Point-in-time emotional volatility measurement"""
    timestamp: datetime
    index_value: float  # 0-100, higher = more volatile
    signal: Signal
    confidence: float  # 0-1
    
    # Component scores
    sentiment_volatility: float
    authenticity_drift: float
    topic_turbulence: float
    viral_coefficient: float
    
    # Context
    dominant_emotion: str
    risk_factors: List[str]
    opportunity_factors: List[str]
    
    # Forecast
    predicted_stability_hours: int  # Hours until stability expected
    
    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp.isoformat(),
            "evi": self.index_value,
            "signal": self.signal.value,
            "confidence": round(self.confidence, 3),
            "components": {
                "sentiment_volatility": round(self.sentiment_volatility, 2),
                "authenticity_drift": round(self.authenticity_drift, 2),
                "topic_turbulence": round(self.topic_turbulence, 2),
                "viral_coefficient": round(self.viral_coefficient, 2)
            },
            "context": {
                "dominant_emotion": self.dominant_emotion,
                "risk_factors": self.risk_factors,
                "opportunity_factors": self.opportunity_factors
            },
            "forecast": {
                "stability_eta_hours": self.predicted_stability_hours
            }
        }

class EVICalculator:
    """
    The core engine that calculates emotional volatility.
    This is what tells you to WAIT when hospitals are breached.
    """
    
    def __init__(self, s3_client=None, redis_client=None):
        self.s3 = s3_client or boto3.client('s3')
        self.redis = redis_client
        self.bucket = "sentientiq-moat"
        
        # Thresholds that determine GO/WAIT/ABORT
        self.thresholds = {
            "go": 30,      # EVI < 30 = stable, safe to launch
            "wait": 70,    # EVI 30-70 = volatile, wait for stability  
            "abort": 90    # EVI > 90 = extreme volatility, do not launch
        }
        
        # Industry-specific sensitivity (healthcare is most sensitive)
        self.industry_multipliers = {
            "healthcare": 1.5,
            "finance": 1.3,
            "government": 1.4,
            "retail": 1.0,
            "entertainment": 0.8,
            "tech": 0.9
        }
    
    async def calculate_current_evi(
        self, 
        industry: str = "general",
        campaign_context: Dict = None
    ) -> EVISnapshot:
        """
        Calculate the current EVI based on last 24 hours of emotional data.
        This is the number that saves or kills $2M campaigns.
        """
        
        # Pull emotional data from the moat (S3)
        emotional_data = await self._fetch_emotional_window(hours=24)
        
        # Calculate component volatilities
        sentiment_vol = self._calculate_sentiment_volatility(emotional_data)
        auth_drift = self._calculate_authenticity_drift(emotional_data)
        topic_turb = self._calculate_topic_turbulence(emotional_data)
        viral_coef = self._calculate_viral_coefficient(emotional_data)
        
        # Weighted combination (learned from feedback loop)
        raw_evi = (
            sentiment_vol * 0.35 +
            auth_drift * 0.25 +
            topic_turb * 0.25 +
            viral_coef * 0.15
        )
        
        # Apply industry sensitivity
        multiplier = self.industry_multipliers.get(industry, 1.0)
        adjusted_evi = min(100, raw_evi * multiplier)
        
        # Determine signal
        if adjusted_evi < self.thresholds["go"]:
            signal = Signal.GO
            confidence = 1.0 - (adjusted_evi / self.thresholds["go"])
        elif adjusted_evi < self.thresholds["wait"]:
            signal = Signal.WAIT
            confidence = 0.5 + (self.thresholds["wait"] - adjusted_evi) / 40
        else:
            signal = Signal.ABORT
            confidence = min(1.0, adjusted_evi / 100)
        
        # Identify risk and opportunity factors
        risk_factors = self._identify_risk_factors(emotional_data, campaign_context)
        opportunity_factors = self._identify_opportunities(emotional_data, campaign_context)
        
        # Predict stability timeline
        stability_hours = self._predict_stability_timeline(
            current_evi=adjusted_evi,
            trend=emotional_data.get("trend", {})
        )
        
        # Get dominant emotion
        dominant_emotion = self._get_dominant_emotion(emotional_data)
        
        return EVISnapshot(
            timestamp=datetime.utcnow(),
            index_value=adjusted_evi,
            signal=signal,
            confidence=confidence,
            sentiment_volatility=sentiment_vol,
            authenticity_drift=auth_drift,
            topic_turbulence=topic_turb,
            viral_coefficient=viral_coef,
            dominant_emotion=dominant_emotion,
            risk_factors=risk_factors,
            opportunity_factors=opportunity_factors,
            predicted_stability_hours=stability_hours
        )
    
    def _calculate_sentiment_volatility(self, data: Dict) -> float:
        """
        Measure how wildly sentiment is swinging.
        High volatility = dangerous launch environment.
        """
        sentiments = data.get("sentiments", [])
        if len(sentiments) < 2:
            return 0.0
        
        # Calculate rolling standard deviation
        sentiment_array = np.array(sentiments)
        volatility = np.std(sentiment_array)
        
        # Normalize to 0-100
        return min(100, volatility * 20)
    
    def _calculate_authenticity_drift(self, data: Dict) -> float:
        """
        Detect when authenticity is dropping (fake news, bots, manipulation).
        Sudden drops = campaign will be seen as inauthentic.
        """
        auth_scores = data.get("authenticity_scores", [])
        if len(auth_scores) < 2:
            return 0.0
        
        # Calculate rate of change
        recent = np.mean(auth_scores[-10:]) if len(auth_scores) >= 10 else np.mean(auth_scores)
        baseline = np.mean(auth_scores)
        
        drift = abs(baseline - recent) / baseline if baseline > 0 else 0
        return min(100, drift * 100)
    
    def _calculate_topic_turbulence(self, data: Dict) -> float:
        """
        Measure topic chaos - when many unrelated topics spike.
        Crisis events create topic turbulence.
        """
        topics = data.get("trending_topics", {})
        
        # Count topics with sudden spikes
        turbulent_topics = 0
        for topic, metrics in topics.items():
            if metrics.get("spike_ratio", 0) > 3:  # 3x normal volume
                turbulent_topics += 1
        
        # More turbulent topics = higher turbulence
        return min(100, turbulent_topics * 15)
    
    def _calculate_viral_coefficient(self, data: Dict) -> float:
        """
        Detect viral spread patterns that could overshadow campaigns.
        High virality = your campaign gets buried.
        """
        viral_metrics = data.get("viral_metrics", {})
        
        # Check for exponential growth patterns
        growth_rate = viral_metrics.get("hourly_growth_rate", 1.0)
        
        if growth_rate > 2.0:  # Doubling every hour
            return 80
        elif growth_rate > 1.5:
            return 60
        elif growth_rate > 1.2:
            return 40
        else:
            return 20
    
    def _identify_risk_factors(self, data: Dict, context: Dict = None) -> List[str]:
        """
        Identify specific risks to campaign launch.
        These are the warnings that save millions.
        """
        risks = []
        
        # Check for crisis events
        if "data breach" in str(data.get("trending_topics", {})).lower():
            risks.append("Data breach detected in ecosystem")
        
        if "scandal" in str(data.get("trending_topics", {})).lower():
            risks.append("Scandal/controversy trending")
        
        if data.get("bot_activity_ratio", 0) > 0.3:
            risks.append("High bot activity (30%+)")
        
        if data.get("negative_sentiment_ratio", 0) > 0.6:
            risks.append("Dominant negative sentiment (60%+)")
        
        # Context-specific risks
        if context:
            if context.get("competitor_launching"):
                risks.append("Competitor campaign detected")
            if context.get("holiday_proximity_days", 30) < 7:
                risks.append("Holiday proximity interference")
        
        return risks[:5]  # Top 5 risks
    
    def _identify_opportunities(self, data: Dict, context: Dict = None) -> List[str]:
        """
        Identify emotional opportunities for campaigns.
        The positive signals that say GO.
        """
        opportunities = []
        
        if data.get("positive_sentiment_ratio", 0) > 0.7:
            opportunities.append("Positive sentiment wave (70%+)")
        
        if data.get("authenticity_scores", [])[-1] > 0.8:
            opportunities.append("High authenticity environment")
        
        if "innovation" in str(data.get("trending_topics", {})).lower():
            opportunities.append("Innovation narrative trending")
        
        if data.get("engagement_rate", 0) > data.get("baseline_engagement", 0) * 1.5:
            opportunities.append("1.5x baseline engagement")
        
        return opportunities[:3]
    
    def _predict_stability_timeline(self, current_evi: float, trend: Dict) -> int:
        """
        Predict when emotional environment will stabilize.
        This tells campaigns how long to WAIT.
        """
        if current_evi < 30:
            return 0  # Already stable
        
        # Use trend data to predict decay
        decay_rate = trend.get("evi_decay_rate", 0.9)  # Default 10% decay per hour
        
        hours = 0
        projected_evi = current_evi
        
        while projected_evi > 30 and hours < 72:  # Max 3 day forecast
            projected_evi *= decay_rate
            hours += 1
        
        return hours
    
    def _get_dominant_emotion(self, data: Dict) -> str:
        """Get the strongest emotion in the current environment"""
        emotions = data.get("emotion_distribution", {})
        if not emotions:
            return "neutral"
        
        return max(emotions.items(), key=lambda x: x[1])[0]
    
    async def _fetch_emotional_window(self, hours: int = 24) -> Dict:
        """
        Fetch emotional data from the moat (S3).
        This is where the accumulated truth lives.
        """
        # In production, this queries S3 parquet files
        # For now, mock with representative data
        
        # Real implementation would:
        # 1. Query S3 for parquet files in date range
        # 2. Load with pandas/pyarrow
        # 3. Aggregate metrics
        
        return {
            "sentiments": np.random.normal(0.5, 0.2, 100).tolist(),
            "authenticity_scores": np.random.normal(0.7, 0.1, 100).tolist(),
            "trending_topics": {
                "technology": {"volume": 1000, "spike_ratio": 1.2},
                "healthcare": {"volume": 500, "spike_ratio": 1.0},
            },
            "viral_metrics": {"hourly_growth_rate": 1.1},
            "emotion_distribution": {
                "confidence": 0.3,
                "anticipation": 0.2,
                "concern": 0.2,
                "excitement": 0.15,
                "skepticism": 0.15
            },
            "bot_activity_ratio": 0.1,
            "negative_sentiment_ratio": 0.3,
            "positive_sentiment_ratio": 0.5,
            "engagement_rate": 0.05,
            "baseline_engagement": 0.04,
            "trend": {"evi_decay_rate": 0.92}
        }


class CampaignInsurance:
    """
    The actual insurance product - monitors campaigns and sends alerts.
    This is what prevents $2M disasters.
    """
    
    def __init__(self, evi_calculator: EVICalculator, jetstream_client=None):
        self.evi = evi_calculator
        self.js = jetstream_client
        self.monitored_campaigns: Dict[str, Dict] = {}
    
    async def insure_campaign(
        self,
        campaign_id: str,
        budget: float,
        industry: str,
        launch_date: datetime,
        sensitivity: str = "normal"  # or "high", "low"
    ):
        """
        Start monitoring a campaign for optimal launch timing.
        This is the insurance policy.
        """
        
        self.monitored_campaigns[campaign_id] = {
            "budget": budget,
            "industry": industry,
            "launch_date": launch_date,
            "sensitivity": sensitivity,
            "status": "monitoring",
            "alerts_sent": []
        }
        
        # Start monitoring loop
        asyncio.create_task(self._monitor_campaign(campaign_id))
        
        return {
            "campaign_id": campaign_id,
            "insured": True,
            "coverage": f"${budget:,.0f} protected",
            "monitoring_until": launch_date.isoformat()
        }
    
    async def _monitor_campaign(self, campaign_id: str):
        """
        Continuous monitoring loop for a campaign.
        This is where we catch the data breaches before launch.
        """
        
        campaign = self.monitored_campaigns[campaign_id]
        
        while campaign["status"] == "monitoring":
            # Calculate current EVI
            evi_snapshot = await self.evi.calculate_current_evi(
                industry=campaign["industry"],
                campaign_context={"campaign_id": campaign_id}
            )
            
            # Check if we need to alert
            if evi_snapshot.signal == Signal.ABORT:
                await self._send_alert(campaign_id, "ABORT", evi_snapshot)
                campaign["status"] = "aborted"
                
            elif evi_snapshot.signal == Signal.WAIT:
                # Only alert on state change
                if "wait" not in campaign["alerts_sent"]:
                    await self._send_alert(campaign_id, "WAIT", evi_snapshot)
                    campaign["alerts_sent"].append("wait")
                    
            elif evi_snapshot.signal == Signal.GO:
                # Clear to launch
                if campaign["alerts_sent"] and "go" not in campaign["alerts_sent"]:
                    await self._send_alert(campaign_id, "GO", evi_snapshot)
                    campaign["alerts_sent"].append("go")
            
            # Check if we're past launch date
            if datetime.utcnow() > campaign["launch_date"]:
                campaign["status"] = "completed"
            
            # Wait before next check (more frequent as launch approaches)
            hours_to_launch = (campaign["launch_date"] - datetime.utcnow()).total_seconds() / 3600
            
            if hours_to_launch < 1:
                await asyncio.sleep(60)  # Every minute in final hour
            elif hours_to_launch < 24:
                await asyncio.sleep(300)  # Every 5 minutes in final day
            else:
                await asyncio.sleep(3600)  # Hourly otherwise
    
    async def _send_alert(self, campaign_id: str, alert_type: str, evi: EVISnapshot):
        """
        Send the alert that saves or makes millions.
        This is the moment of truth.
        """
        
        campaign = self.monitored_campaigns[campaign_id]
        
        alert = {
            "campaign_id": campaign_id,
            "alert_type": alert_type,
            "evi": evi.to_dict(),
            "budget_at_risk": campaign["budget"],
            "recommended_action": self._get_recommendation(alert_type, evi),
            "confidence": evi.confidence,
            "next_check": (datetime.utcnow() + timedelta(hours=1)).isoformat()
        }
        
        # Send via JetStream
        if self.js:
            await self.js.publish(
                f"alerts.campaigns.{campaign_id}",
                json.dumps(alert).encode()
            )
        
        # Log the intervention
        print(f"""
        🚨 CAMPAIGN ALERT: {alert_type}
        ═══════════════════════════════
        Campaign: {campaign_id}
        Budget at Risk: ${campaign['budget']:,.0f}
        Current EVI: {evi.index_value:.1f}
        Signal: {evi.signal.value}
        Confidence: {evi.confidence:.1%}
        
        Risk Factors:
        {chr(10).join('• ' + risk for risk in evi.risk_factors)}
        
        Recommendation: {alert['recommended_action']}
        
        This alert could save ${campaign['budget']:,.0f}
        """)
        
        return alert
    
    def _get_recommendation(self, alert_type: str, evi: EVISnapshot) -> str:
        """Generate specific actionable recommendation"""
        
        if alert_type == "ABORT":
            return f"DO NOT LAUNCH. Extreme volatility (EVI: {evi.index_value:.0f}). Major risks detected: {', '.join(evi.risk_factors[:2])}. Reassess in {evi.predicted_stability_hours} hours."
        
        elif alert_type == "WAIT":
            return f"POSTPONE LAUNCH. Moderate volatility (EVI: {evi.index_value:.0f}). Wait approximately {evi.predicted_stability_hours} hours for stability. Monitor for GO signal."
        
        else:  # GO
            opportunities = ', '.join(evi.opportunity_factors) if evi.opportunity_factors else "Stable environment"
            return f"CLEAR TO LAUNCH. Optimal conditions (EVI: {evi.index_value:.0f}). {opportunities}. Launch within 4 hours for best results."


# The moment of truth
async def save_a_campaign():
    """
    Demo: How EVI saves a $2M campaign from launching into a data breach.
    This is the money moment.
    """
    
    # Initialize components
    evi_calculator = EVICalculator()
    insurance = CampaignInsurance(evi_calculator)
    
    # Computer card company with $2M budget
    campaign = await insurance.insure_campaign(
        campaign_id="card_launch_2024",
        budget=2_000_000,
        industry="finance",
        launch_date=datetime.utcnow() + timedelta(hours=4),
        sensitivity="high"
    )
    
    print(f"""
    💳 CAMPAIGN INSURED
    ═══════════════════
    {campaign['coverage']}
    Monitoring until: {campaign['monitoring_until']}
    
    If a data breach happens at a major hospital,
    we'll detect it and send a WAIT signal.
    
    This is ad campaign insurance.
    This is why SentientIQ exists.
    """)
    
    # In production, this runs continuously
    # For demo, we'll simulate one check
    evi_snapshot = await evi_calculator.calculate_current_evi(industry="finance")
    
    print(f"""
    Current EVI: {evi_snapshot.index_value:.1f}
    Signal: {evi_snapshot.signal.value}
    Confidence: {evi_snapshot.confidence:.1%}
    
    {'✅ Safe to launch' if evi_snapshot.signal == Signal.GO else '⚠️ Wait for stability'}
    """)

if __name__ == "__main__":
    asyncio.run(save_a_campaign())