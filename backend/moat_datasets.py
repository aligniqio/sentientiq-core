"""
SentientIQ Data Moat - Competitive Intelligence Layers
EVI time series, emotion histograms, fingerprints, consensus tracking
"""

import pandas as pd
import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import boto3
from dataclasses import dataclass, asdict

s3 = boto3.client('s3', region_name='us-east-2')

# EVI Calculation (v0.1)
@dataclass
class EVITimeSeries:
    """Emotional Volatility Index time series"""
    ts: datetime
    agent: str
    brand: str
    topic: str
    evi: float  # 0-100
    intensity: float  # Mean emotion magnitude
    velocity: float  # Δevi/Δt
    authenticity_mean: float
    engagement_rate: float
    consensus: float  # Cross-agent agreement
    window_seconds: int  # 60 or 3600

class EVICalculator:
    """Calculate Emotional Volatility Index from processed data"""
    
    @staticmethod
    def calculate_evi(emotion_scores: List[Dict[str, float]], 
                     window_minutes: int = 60) -> float:
        """
        EVI v0.1: Emotional Volatility Index
        Based on variance of emotion scores over time window
        """
        if not emotion_scores:
            return 0.0
            
        # Extract emotion magnitudes
        magnitudes = []
        for scores in emotion_scores:
            # Calculate emotion vector magnitude
            vector = np.array(list(scores.values()))
            magnitude = np.linalg.norm(vector)
            magnitudes.append(magnitude)
        
        # Calculate volatility (standard deviation of magnitudes)
        volatility = np.std(magnitudes) if len(magnitudes) > 1 else 0.0
        
        # Scale to 0-100
        evi = min(100.0, volatility * 50.0)
        return round(evi, 2)
    
    @staticmethod
    def calculate_velocity(evi_series: List[float], 
                          timestamps: List[datetime]) -> float:
        """Calculate rate of EVI change"""
        if len(evi_series) < 2:
            return 0.0
            
        # Calculate Δevi/Δt
        delta_evi = evi_series[-1] - evi_series[0]
        delta_t = (timestamps[-1] - timestamps[0]).total_seconds() / 3600  # Hours
        
        if delta_t == 0:
            return 0.0
            
        return round(delta_evi / delta_t, 3)
    
    @staticmethod
    def calculate_consensus(agent_evis: Dict[str, float]) -> float:
        """Calculate cross-agent agreement score"""
        if len(agent_evis) < 2:
            return 1.0
            
        values = list(agent_evis.values())
        mean = np.mean(values)
        std = np.std(values)
        
        # Consensus = 1 - normalized std deviation
        if mean == 0:
            return 0.0
            
        consensus = max(0.0, 1.0 - (std / mean))
        return round(consensus, 3)

@dataclass
class EmotionHistogram:
    """Emotion distribution over time"""
    ts: datetime
    brand: str
    emotion: str
    count: int
    score_mean: float

@dataclass
class ContentFingerprint:
    """Content fingerprint for deduplication"""
    fingerprint: str
    post_id: str
    platform: str
    brand: str
    created_at: datetime

@dataclass
class ConsensusLog:
    """Agent consensus/disagreement tracking"""
    ts: datetime
    brand: str
    topic: str
    agent: str
    evi: float
    agreement: float  # 0-1 across agents
    notes: str

class MoatBuilder:
    """Build and maintain data moat datasets"""
    
    def __init__(self):
        self.evi_calc = EVICalculator()
        
    async def build_evi_timeseries(self, 
                                  processed_data: pd.DataFrame,
                                  agent: str,
                                  window: str = "1H") -> List[EVITimeSeries]:
        """Build EVI time series from processed data"""
        
        # Group by time window, brand, topic
        grouped = processed_data.groupby([
            pd.Grouper(key='created_at', freq=window),
            'brand',
            'topic'
        ])
        
        evi_series = []
        
        for (ts, brand, topic), group in grouped:
            # Extract emotion scores
            emotion_scores = group['emotion_scores'].tolist()
            
            # Calculate EVI
            evi = self.evi_calc.calculate_evi(emotion_scores)
            
            # Calculate intensity (mean emotion magnitude)
            intensity = np.mean([
                np.linalg.norm(list(scores.values())) 
                for scores in emotion_scores
            ])
            
            # Calculate velocity (need historical data)
            # For now, simplified
            velocity = 0.0
            
            # Calculate means
            authenticity_mean = group['authenticity'].mean()
            engagement_rate = group['engagement_count'].sum() / len(group)
            
            # Consensus (would need other agents)
            consensus = 1.0
            
            window_seconds = 3600 if window == "1H" else 60
            
            evi_point = EVITimeSeries(
                ts=ts,
                agent=agent,
                brand=brand,
                topic=topic,
                evi=evi,
                intensity=round(intensity, 3),
                velocity=velocity,
                authenticity_mean=round(authenticity_mean, 3),
                engagement_rate=round(engagement_rate, 2),
                consensus=consensus,
                window_seconds=window_seconds
            )
            
            evi_series.append(evi_point)
        
        return evi_series
    
    async def build_emotion_histograms(self,
                                      processed_data: pd.DataFrame) -> List[EmotionHistogram]:
        """Build emotion histograms by brand"""
        
        histograms = []
        
        # Group by hour, brand, primary emotion
        grouped = processed_data.groupby([
            pd.Grouper(key='created_at', freq='1H'),
            'brand',
            'emotion_primary'
        ])
        
        for (ts, brand, emotion), group in grouped:
            hist = EmotionHistogram(
                ts=ts,
                brand=brand,
                emotion=emotion,
                count=len(group),
                score_mean=round(group['emotion_scores'].apply(
                    lambda x: x.get(emotion, 0) if isinstance(x, dict) else 0
                ).mean(), 3)
            )
            histograms.append(hist)
        
        return histograms
    
    async def extract_fingerprints(self,
                                  processed_data: pd.DataFrame) -> List[ContentFingerprint]:
        """Extract content fingerprints"""
        
        fingerprints = []
        
        for _, row in processed_data.iterrows():
            fp = ContentFingerprint(
                fingerprint=row['fingerprint'],
                post_id=row['post_id'],
                platform=row['platform'],
                brand=row['brand'],
                created_at=row['created_at']
            )
            fingerprints.append(fp)
        
        return fingerprints
    
    async def track_consensus(self,
                             agent_results: Dict[str, pd.DataFrame]) -> List[ConsensusLog]:
        """Track agent consensus/disagreement"""
        
        consensus_logs = []
        
        # Compare EVI scores across agents for same brand/topic/time
        # Group all agent results by brand, topic, timestamp
        unified = {}
        
        for agent, df in agent_results.items():
            for _, row in df.iterrows():
                key = (row['ts'], row['brand'], row['topic'])
                if key not in unified:
                    unified[key] = {}
                unified[key][agent] = row['evi']
        
        # Calculate agreement scores
        for (ts, brand, topic), agent_evis in unified.items():
            consensus = self.evi_calc.calculate_consensus(agent_evis)
            
            for agent, evi in agent_evis.items():
                notes = ""
                if consensus < 0.3:
                    notes = "Strong disagreement among agents"
                elif consensus > 0.8:
                    notes = "Strong consensus among agents"
                
                log = ConsensusLog(
                    ts=ts,
                    brand=brand,
                    topic=topic,
                    agent=agent,
                    evi=evi,
                    agreement=consensus,
                    notes=notes
                )
                consensus_logs.append(log)
        
        return consensus_logs
    
    def write_evi_timeseries(self, evi_data: List[EVITimeSeries], agent: str):
        """Write EVI time series to Parquet"""
        
        df = pd.DataFrame([asdict(e) for e in evi_data])
        
        schema = pa.schema([
            ('ts', pa.timestamp('us')),
            ('agent', pa.string()),
            ('brand', pa.string()),
            ('topic', pa.string()),
            ('evi', pa.float64()),
            ('intensity', pa.float64()),
            ('velocity', pa.float64()),
            ('authenticity_mean', pa.float64()),
            ('engagement_rate', pa.float64()),
            ('consensus', pa.float64()),
            ('window_seconds', pa.int32())
        ])
        
        table = pa.Table.from_pandas(df, schema=schema)
        
        dt = datetime.now().strftime('%Y-%m-%d')
        path = f's3://sentientiq-data-moat/evi_ts/agent={agent}/dt={dt}/part-{datetime.now().strftime("%H%M%S")}.parquet'
        
        pq.write_table(table, path, compression='snappy')
    
    def write_emotion_histograms(self, hist_data: List[EmotionHistogram], brand: str):
        """Write emotion histograms to Parquet"""
        
        df = pd.DataFrame([asdict(h) for h in hist_data])
        
        schema = pa.schema([
            ('ts', pa.timestamp('us')),
            ('brand', pa.string()),
            ('emotion', pa.string()),
            ('count', pa.int64()),
            ('score_mean', pa.float64())
        ])
        
        table = pa.Table.from_pandas(df, schema=schema)
        
        dt = datetime.now().strftime('%Y-%m-%d')
        path = f's3://sentientiq-data-moat/emotion_hist/brand={brand}/dt={dt}/part-{datetime.now().strftime("%H%M%S")}.parquet'
        
        pq.write_table(table, path, compression='snappy')
    
    def write_fingerprints(self, fp_data: List[ContentFingerprint]):
        """Write fingerprints to Parquet"""
        
        df = pd.DataFrame([asdict(f) for f in fp_data])
        
        schema = pa.schema([
            ('fingerprint', pa.string()),
            ('post_id', pa.string()),
            ('platform', pa.string()),
            ('brand', pa.string()),
            ('created_at', pa.timestamp('us'))
        ])
        
        table = pa.Table.from_pandas(df, schema=schema)
        
        dt = datetime.now().strftime('%Y-%m-%d')
        path = f's3://sentientiq-data-moat/fingerprints/ingest_date={dt}/part-{datetime.now().strftime("%H%M%S")}.parquet'
        
        pq.write_table(table, path, compression='snappy')
    
    def write_consensus(self, consensus_data: List[ConsensusLog], agent: str):
        """Write consensus logs to Parquet"""
        
        df = pd.DataFrame([asdict(c) for c in consensus_data])
        
        schema = pa.schema([
            ('ts', pa.timestamp('us')),
            ('brand', pa.string()),
            ('topic', pa.string()),
            ('agent', pa.string()),
            ('evi', pa.float64()),
            ('agreement', pa.float64()),
            ('notes', pa.string())
        ])
        
        table = pa.Table.from_pandas(df, schema=schema)
        
        dt = datetime.now().strftime('%Y-%m-%d')
        path = f's3://sentientiq-data-moat/consensus/agent={agent}/dt={dt}/part-{datetime.now().strftime("%H%M%S")}.parquet'
        
        pq.write_table(table, path, compression='snappy')

async def build_moat_layer(processed_data: pd.DataFrame, agent: str = "collective"):
    """Main function to build all moat datasets"""
    
    builder = MoatBuilder()
    
    # Build EVI time series
    evi_data = await builder.build_evi_timeseries(processed_data, agent)
    builder.write_evi_timeseries(evi_data, agent)
    
    # Build emotion histograms
    for brand in processed_data['brand'].unique():
        brand_data = processed_data[processed_data['brand'] == brand]
        hist_data = await builder.build_emotion_histograms(brand_data)
        builder.write_emotion_histograms(hist_data, brand)
    
    # Extract fingerprints
    fp_data = await builder.extract_fingerprints(processed_data)
    builder.write_fingerprints(fp_data)
    
    print(f"Moat datasets built: {len(evi_data)} EVI points, {len(fp_data)} fingerprints")

if __name__ == "__main__":
    import asyncio
    # Test with sample data
    # asyncio.run(build_moat_layer(sample_df, "collective"))