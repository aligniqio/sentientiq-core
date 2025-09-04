"""
NATS JetStream Configuration - The Emotional Intelligence Pipeline
This is the nervous system that makes SentientIQ omnipresent
"""

import os
import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

import nats
from nats.js import JetStreamContext
from nats.errors import TimeoutError

# Stream subjects - the neural pathways
class Subjects:
    # Raw ingestion
    RAW_POSTS = "raw.posts.*"  # raw.posts.{twitter|linkedin|reddit|news}
    
    # After emotional nutrition labeling (Sage/Sonnet)
    LABELED_POSTS = "labeled.posts.*"
    
    # After PhD enrichment
    ENRICHED_POSTS = "enriched.posts.*"  # enriched.posts.{agent_name}
    
    # Consensus & signals
    CONSENSUS_SIGNALS = "consensus.signals"
    EVI_SNAPSHOTS = "pulse.evi.snapshots"
    
    # Feedback loop
    FEEDBACK_EVENTS = "feedback.events"
    
    # Alerts & interventions
    CAMPAIGN_ALERTS = "alerts.campaigns.*"

@dataclass
class StreamConfig:
    """Configuration for each JetStream"""
    name: str
    subjects: List[str]
    retention: str  # "limits" or "interest" or "work_queue"
    max_age: Optional[timedelta] = None
    max_msgs: Optional[int] = None
    max_bytes: Optional[int] = None
    max_msg_size: Optional[int] = None
    replicas: int = 1
    discard: str = "old"  # or "new"

# Stream definitions - the moat architecture
STREAMS = [
    StreamConfig(
        name="RAW_POSTS",
        subjects=["raw.posts.>"],
        retention="limits",
        max_age=timedelta(days=30),  # 30 day replay buffer
        max_msgs=10_000_000,
        max_bytes=100 * 1024 * 1024 * 1024,  # 100GB
        max_msg_size=10 * 1024 * 1024,  # 10MB per post
        replicas=3  # Triple redundancy for the raw truth
    ),
    
    StreamConfig(
        name="LABELED_POSTS",
        subjects=["labeled.posts.>"],
        retention="limits",
        max_age=timedelta(days=90),  # Longer retention for labeled data
        max_msgs=50_000_000,
        max_bytes=500 * 1024 * 1024 * 1024,  # 500GB
        replicas=2
    ),
    
    StreamConfig(
        name="ENRICHED_POSTS",
        subjects=["enriched.posts.>"],
        retention="limits",
        max_age=timedelta(days=365),  # 1 year - this is the moat
        max_msgs=100_000_000,
        max_bytes=1024 * 1024 * 1024 * 1024,  # 1TB
        replicas=3
    ),
    
    StreamConfig(
        name="EVI_PULSE",
        subjects=["pulse.evi.>"],
        retention="limits",
        max_age=timedelta(hours=24),  # Recent pulse only
        max_msgs=100_000,
        max_bytes=1024 * 1024 * 1024,  # 1GB
    ),
    
    StreamConfig(
        name="FEEDBACK",
        subjects=["feedback.>"],
        retention="limits",
        max_age=None,  # Never delete - immutable audit trail
        max_msgs=None,  # Unlimited
        replicas=3
    ),
    
    StreamConfig(
        name="ALERTS",
        subjects=["alerts.>"],
        retention="work_queue",  # Consumed once
        max_msgs=10_000,
        replicas=2
    )
]

class JetStreamPipeline:
    """The core pipeline that builds the emotional moat"""
    
    def __init__(self, nats_url: str = None):
        self.nats_url = nats_url or os.getenv("NATS_URL", "nats://localhost:4222")
        self.nc: Optional[nats.NATS] = None
        self.js: Optional[JetStreamContext] = None
        
    async def connect(self):
        """Connect to NATS and initialize JetStream"""
        self.nc = await nats.connect(self.nats_url)
        self.js = self.nc.jetstream()
        print(f"✅ Connected to NATS JetStream at {self.nats_url}")
        
    async def initialize_streams(self):
        """Create all streams if they don't exist"""
        for stream_config in STREAMS:
            try:
                # Check if stream exists
                info = await self.js.stream_info(stream_config.name)
                print(f"Stream {stream_config.name} exists with {info.state.messages} messages")
            except:
                # Create stream
                config = {
                    "name": stream_config.name,
                    "subjects": stream_config.subjects,
                    "retention": stream_config.retention,
                    "discard": stream_config.discard,
                    "num_replicas": stream_config.replicas,
                }
                
                if stream_config.max_age:
                    config["max_age"] = int(stream_config.max_age.total_seconds() * 1_000_000_000)
                if stream_config.max_msgs:
                    config["max_msgs"] = stream_config.max_msgs
                if stream_config.max_bytes:
                    config["max_bytes"] = stream_config.max_bytes
                if stream_config.max_msg_size:
                    config["max_msg_size"] = stream_config.max_msg_size
                    
                await self.js.add_stream(**config)
                print(f"✅ Created stream: {stream_config.name}")
    
    async def publish_raw_post(self, platform: str, post_data: Dict[str, Any]):
        """Publish raw social media post for processing"""
        subject = f"raw.posts.{platform}"
        
        # Add metadata
        post_data["ingested_at"] = datetime.utcnow().isoformat()
        post_data["pipeline_version"] = "1.0.0"
        
        # Publish with deduplication ID
        msg_id = f"{platform}:{post_data.get('id', '')}:{post_data['ingested_at']}"
        
        ack = await self.js.publish(
            subject,
            json.dumps(post_data).encode(),
            headers={"Nats-Msg-Id": msg_id}
        )
        
        return ack
    
    async def publish_evi_snapshot(self, evi_data: Dict[str, Any]):
        """Publish EVI snapshot for real-time pulse"""
        subject = "pulse.evi.snapshot"
        
        evi_data["timestamp"] = datetime.utcnow().isoformat()
        evi_data["ttl"] = 300  # 5 minute relevance
        
        await self.js.publish(
            subject,
            json.dumps(evi_data).encode()
        )
    
    async def publish_campaign_alert(self, alert: Dict[str, Any]):
        """Send campaign alert (WAIT/GO signal)"""
        subject = f"alerts.campaigns.{alert['campaign_id']}"
        
        alert["alerted_at"] = datetime.utcnow().isoformat()
        
        await self.js.publish(
            subject,
            json.dumps(alert).encode()
        )
    
    async def subscribe_to_raw_posts(self, handler, platform: str = "*"):
        """Subscribe to raw posts for labeling"""
        subject = f"raw.posts.{platform}"
        
        # Create durable consumer
        consumer_name = f"labeler_{platform}"
        
        sub = await self.js.pull_subscribe(
            subject,
            durable=consumer_name,
            stream="RAW_POSTS"
        )
        
        # Process messages
        while True:
            try:
                msgs = await sub.fetch(batch=10, timeout=1)
                for msg in msgs:
                    await handler(msg)
                    await msg.ack()
            except TimeoutError:
                continue
    
    async def get_evi_history(self, hours: int = 24) -> List[Dict]:
        """Get EVI history for trend analysis"""
        # This would query the stream for historical EVI snapshots
        # Used to detect volatility trends
        pass
    
    async def close(self):
        """Clean shutdown"""
        if self.nc:
            await self.nc.close()


# Initialize the pipeline
async def setup_pipeline():
    """Initialize the complete JetStream pipeline"""
    pipeline = JetStreamPipeline()
    await pipeline.connect()
    await pipeline.initialize_streams()
    
    print("""
    🚀 SENTIENTIQ PIPELINE INITIALIZED
    ═══════════════════════════════════
    
    The emotional moat is now accumulating:
    • Raw posts → 30 day buffer
    • Labeled posts → 90 day retention  
    • Enriched data → 365 day moat (THIS IS THE FORTRESS)
    • EVI pulse → Real-time campaign insurance
    • Feedback → Immutable learning trail
    
    The longer this runs, the deeper the moat.
    Every second makes us more defensible.
    
    Math.random() can't compete with accumulated truth.
    """)
    
    return pipeline

if __name__ == "__main__":
    # Test initialization
    asyncio.run(setup_pipeline())