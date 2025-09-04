"""
The Moat Builder - S3 Data Lake Structure
This accumulates emotional intelligence that can't be replicated.
Every day makes us more defensible.
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import hashlib
from io import BytesIO

import boto3
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from botocore.exceptions import ClientError


class EmotionalMoat:
    """
    The S3 data lake that accumulates unreplicatable emotional intelligence.
    This is the fortress. The longer it runs, the deeper it gets.
    """
    
    def __init__(self, bucket_name: str = "sentientiq-moat"):
        self.bucket = bucket_name
        self.s3 = boto3.client('s3')
        
        # Moat structure - the accumulation layers
        self.structure = {
            # Raw emotional fingerprints
            "fingerprints": "moat/emotional_fingerprints/dt={date}/hour={hour}/",
            
            # Per-agent enrichments (the PhD work)
            "agent_insights": "moat/agent_insights/agent={agent}/dt={date}/",
            
            # Consensus patterns
            "consensus": "moat/consensus/dt={date}/hour={hour}/",
            
            # EVI time series
            "evi_history": "moat/evi_ts/year={year}/month={month}/day={day}/",
            
            # Authenticity trends
            "authenticity": "moat/authenticity_trends/platform={platform}/dt={date}/",
            
            # Viral cascades
            "viral": "moat/viral_cascades/dt={date}/cascade_id={id}/",
            
            # Campaign interventions and outcomes
            "interventions": "moat/campaign_interventions/year={year}/month={month}/",
            
            # Feedback learning
            "feedback": "moat/feedback_learning/agent={agent}/version={version}/"
        }
    
    async def initialize_moat(self):
        """
        Create the S3 bucket and structure for the moat.
        This is Day 0 of accumulation.
        """
        
        # Create bucket if doesn't exist
        try:
            self.s3.create_bucket(
                Bucket=self.bucket,
                CreateBucketConfiguration={'LocationConstraint': 'us-east-2'}
            )
            print(f"✅ Created moat bucket: {self.bucket}")
        except ClientError as e:
            if e.response['Error']['Code'] == 'BucketAlreadyOwnedByYou':
                print(f"✅ Moat bucket exists: {self.bucket}")
            else:
                raise
        
        # Set lifecycle policies for intelligent tiering
        lifecycle_policy = {
            'Rules': [
                {
                    'ID': 'IntelligentTiering',
                    'Status': 'Enabled',
                    'Transitions': [
                        {
                            'Days': 30,
                            'StorageClass': 'INTELLIGENT_TIERING'
                        },
                        {
                            'Days': 90,
                            'StorageClass': 'GLACIER_IR'
                        }
                    ]
                },
                {
                    'ID': 'DeleteOldFingerprints',
                    'Status': 'Enabled',
                    'Expiration': {
                        'Days': 365  # Keep 1 year of fingerprints
                    },
                    'Filter': {
                        'Prefix': 'moat/emotional_fingerprints/'
                    }
                }
            ]
        }
        
        self.s3.put_bucket_lifecycle_configuration(
            Bucket=self.bucket,
            LifecycleConfiguration=lifecycle_policy
        )
        
        print("""
        🏰 EMOTIONAL MOAT INITIALIZED
        ═════════════════════════════
        
        Structure created:
        • Emotional fingerprints → 365 day retention
        • Agent insights → Perpetual accumulation
        • Consensus patterns → Historical record
        • EVI history → Time series fortress
        • Campaign interventions → Proof of value
        
        The moat begins accumulating NOW.
        Every post, every emotion, every pattern.
        Unreplicatable from this moment forward.
        """)
    
    async def write_emotional_fingerprint(
        self,
        post_id: str,
        platform: str,
        emotions: Dict[str, float],
        authenticity: float,
        metadata: Dict
    ):
        """
        Write an emotional fingerprint to the moat.
        These accumulate into patterns that predict the future.
        """
        
        fingerprint = {
            "post_id": post_id,
            "platform": platform,
            "timestamp": datetime.utcnow().isoformat(),
            "emotions": emotions,
            "authenticity": authenticity,
            "metadata": metadata,
            "fingerprint_hash": self._generate_fingerprint_hash(post_id, emotions)
        }
        
        # Convert to parquet
        df = pd.DataFrame([fingerprint])
        
        # Generate S3 path
        now = datetime.utcnow()
        path = self.structure["fingerprints"].format(
            date=now.strftime("%Y%m%d"),
            hour=now.hour
        )
        
        # Write to S3
        buffer = BytesIO()
        df.to_parquet(buffer, engine='pyarrow', compression='snappy')
        buffer.seek(0)
        
        key = f"{path}{post_id}.parquet"
        
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=buffer.getvalue(),
            ContentType='application/x-parquet'
        )
        
        return key
    
    async def write_agent_insight(
        self,
        agent_name: str,
        insight_type: str,
        data: Dict
    ):
        """
        Store PhD agent insights.
        Each agent contributes to the moat's depth.
        """
        
        insight = {
            "agent": agent_name,
            "type": insight_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "confidence": data.get("confidence", 0.0),
            "version": data.get("model_version", "1.0.0")
        }
        
        df = pd.DataFrame([insight])
        
        # S3 path
        now = datetime.utcnow()
        path = self.structure["agent_insights"].format(
            agent=agent_name,
            date=now.strftime("%Y%m%d")
        )
        
        # Unique key for this insight
        insight_id = hashlib.md5(
            f"{agent_name}{insight_type}{now.isoformat()}".encode()
        ).hexdigest()[:8]
        
        key = f"{path}{insight_id}.parquet"
        
        # Write
        buffer = BytesIO()
        df.to_parquet(buffer, engine='pyarrow', compression='snappy')
        buffer.seek(0)
        
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=buffer.getvalue()
        )
        
        return key
    
    async def write_consensus_pattern(
        self,
        pattern_id: str,
        agents_involved: List[str],
        consensus_data: Dict
    ):
        """
        Store consensus patterns from PhD collective.
        This is where individual insights become collective intelligence.
        """
        
        pattern = {
            "pattern_id": pattern_id,
            "timestamp": datetime.utcnow().isoformat(),
            "agents": agents_involved,
            "consensus_type": consensus_data.get("type"),
            "decision": consensus_data.get("decision"),
            "confidence": consensus_data.get("confidence"),
            "dissent": consensus_data.get("dissenting_opinions", []),
            "factors": consensus_data.get("factors", {})
        }
        
        df = pd.DataFrame([pattern])
        
        now = datetime.utcnow()
        path = self.structure["consensus"].format(
            date=now.strftime("%Y%m%d"),
            hour=now.hour
        )
        
        key = f"{path}{pattern_id}.parquet"
        
        buffer = BytesIO()
        df.to_parquet(buffer, engine='pyarrow', compression='snappy')
        buffer.seek(0)
        
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=buffer.getvalue()
        )
        
        return key
    
    async def write_evi_snapshot(self, evi_data: Dict):
        """
        Store EVI snapshots for historical analysis.
        This builds the time series that predicts volatility.
        """
        
        df = pd.DataFrame([evi_data])
        
        now = datetime.utcnow()
        path = self.structure["evi_history"].format(
            year=now.year,
            month=now.month,
            day=now.day
        )
        
        # Minute-level granularity for EVI
        key = f"{path}evi_{now.strftime('%H%M%S')}.parquet"
        
        buffer = BytesIO()
        df.to_parquet(buffer, engine='pyarrow', compression='snappy')
        buffer.seek(0)
        
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=buffer.getvalue()
        )
        
        return key
    
    async def write_campaign_intervention(
        self,
        campaign_id: str,
        intervention_type: str,
        outcome: Dict
    ):
        """
        Record campaign interventions and outcomes.
        This proves the value - the saved millions.
        """
        
        intervention = {
            "campaign_id": campaign_id,
            "timestamp": datetime.utcnow().isoformat(),
            "intervention_type": intervention_type,  # WAIT, GO, ABORT
            "evi_at_intervention": outcome.get("evi"),
            "budget_protected": outcome.get("budget"),
            "outcome": outcome.get("result"),  # saved, launched, aborted
            "post_analysis": outcome.get("post_analysis", {})
        }
        
        df = pd.DataFrame([intervention])
        
        now = datetime.utcnow()
        path = self.structure["interventions"].format(
            year=now.year,
            month=now.month
        )
        
        key = f"{path}{campaign_id}_{now.strftime('%Y%m%d_%H%M%S')}.parquet"
        
        buffer = BytesIO()
        df.to_parquet(buffer, engine='pyarrow', compression='snappy')
        buffer.seek(0)
        
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=buffer.getvalue()
        )
        
        # This is the proof of value
        if outcome.get("result") == "saved":
            print(f"""
            💰 CAMPAIGN SAVED: ${outcome.get('budget'):,.0f}
            Intervention: {intervention_type}
            EVI at decision: {outcome.get('evi')}
            
            This intervention is now part of the moat.
            Proof of value: ACCUMULATED.
            """)
        
        return key
    
    async def query_emotional_window(
        self,
        hours: int = 24,
        emotions: List[str] = None
    ) -> pd.DataFrame:
        """
        Query the moat for emotional patterns in time window.
        This is how we detect volatility.
        """
        
        # Calculate time range
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=hours)
        
        # Generate S3 prefixes to scan
        prefixes = []
        current = start_time
        
        while current <= end_time:
            prefix = f"moat/emotional_fingerprints/dt={current.strftime('%Y%m%d')}/hour={current.hour}/"
            prefixes.append(prefix)
            current += timedelta(hours=1)
        
        # Read parquet files
        dfs = []
        
        for prefix in prefixes:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix
            )
            
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Read parquet from S3
                    response = self.s3.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    
                    df = pd.read_parquet(BytesIO(response['Body'].read()))
                    dfs.append(df)
        
        if dfs:
            combined = pd.concat(dfs, ignore_index=True)
            
            # Filter by emotions if specified
            if emotions:
                # Complex filtering for nested emotion data
                pass
            
            return combined
        else:
            return pd.DataFrame()
    
    async def calculate_moat_depth(self) -> Dict:
        """
        Calculate how deep our moat is.
        This is our defensibility metric.
        """
        
        metrics = {
            "total_fingerprints": 0,
            "unique_patterns": 0,
            "agent_insights": 0,
            "consensus_patterns": 0,
            "campaigns_saved": 0,
            "total_value_protected": 0,
            "days_accumulated": 0,
            "estimated_replication_time_years": 0
        }
        
        # Count objects in each path
        for category, path_template in self.structure.items():
            prefix = path_template.split("{")[0]  # Base prefix
            
            paginator = self.s3.get_paginator('list_objects_v2')
            pages = paginator.paginate(
                Bucket=self.bucket,
                Prefix=prefix
            )
            
            count = 0
            for page in pages:
                if 'Contents' in page:
                    count += len(page['Contents'])
            
            if category == "fingerprints":
                metrics["total_fingerprints"] = count
            elif category == "agent_insights":
                metrics["agent_insights"] = count
            elif category == "consensus":
                metrics["consensus_patterns"] = count
        
        # Calculate defensibility
        # Every fingerprint takes ~1 second to replicate (real social data)
        # But you need the SAME fingerprints at the SAME time
        # Which is impossible after the fact
        
        metrics["estimated_replication_time_years"] = (
            metrics["total_fingerprints"] / (86400 * 365)  # Seconds to years
        ) * 10  # Multiply by complexity factor
        
        return metrics
    
    def _generate_fingerprint_hash(self, post_id: str, emotions: Dict) -> str:
        """Generate unique hash for emotional fingerprint"""
        
        emotion_str = json.dumps(emotions, sort_keys=True)
        combined = f"{post_id}{emotion_str}"
        
        return hashlib.sha256(combined.encode()).hexdigest()[:16]


class MoatDefender:
    """
    Protects and leverages the moat.
    This is what makes us uncopyable.
    """
    
    def __init__(self, moat: EmotionalMoat):
        self.moat = moat
    
    async def demonstrate_moat_value(self):
        """
        Show why our moat can't be replicated.
        This is the investor pitch.
        """
        
        depth = await self.moat.calculate_moat_depth()
        
        print(f"""
        🏰 MOAT DEPTH ANALYSIS
        ═════════════════════
        
        Accumulated Assets:
        • Emotional Fingerprints: {depth['total_fingerprints']:,}
        • Agent Insights: {depth['agent_insights']:,}
        • Consensus Patterns: {depth['consensus_patterns']:,}
        • Campaigns Saved: {depth['campaigns_saved']}
        • Value Protected: ${depth['total_value_protected']:,.0f}
        
        Defensibility Metric:
        Time to Replicate: {depth['estimated_replication_time_years']:.1f} years
        
        Why This Matters:
        1. Every fingerprint is timestamped emotional truth
        2. You can't recreate past emotions
        3. Patterns only emerge over time
        4. Each day makes us stronger
        
        Competitor Options:
        ❌ Buy the data → Doesn't exist elsewhere
        ❌ Recreate history → Physically impossible  
        ❌ Start now → Years behind
        ✅ Give up → Most likely
        
        This moat compounds daily.
        Math.random() can't compete with accumulated reality.
        """)


# Initialize the moat
async def build_the_fortress():
    """
    Initialize the emotional moat.
    Day 0 of permanent defensibility.
    """
    
    moat = EmotionalMoat()
    await moat.initialize_moat()
    
    defender = MoatDefender(moat)
    await defender.demonstrate_moat_value()
    
    print("""
    The moat is initialized.
    The accumulation begins.
    Every second makes us stronger.
    
    Let the intent data platforms try to catch up.
    They can't. The past is gone. We own it.
    """)

if __name__ == "__main__":
    asyncio.run(build_the_fortress())