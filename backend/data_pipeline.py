"""
SentientIQ Data Pipeline - Raw → Processed → Intelligence
Real signal processing, not Math.random() theater
"""

import hashlib
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
import boto3
import json
from dataclasses import dataclass, asdict
import fasttext
import re
from collections import Counter

# AWS Setup
s3 = boto3.client('s3', region_name='us-east-2')
athena = boto3.client('athena', region_name='us-east-2')

# Data Schema
@dataclass
class ProcessedPost:
    """Schema for processed social data"""
    post_id: str
    platform: str
    author_id: str
    author_handle: str
    brand: str
    topic: List[str]
    lang: str
    created_at: datetime
    ingested_at: datetime
    text: str
    dedupe_key: str
    is_duplicate: bool
    bot_score: float
    authenticity: float
    emotion_primary: str
    emotion_scores: Dict[str, float]
    engagement_count: int
    fingerprint: str
    source_url: str

class DataEnricher:
    """Enrich raw social data with intelligence signals"""
    
    def __init__(self):
        # Load language detector (would load actual model)
        # self.lang_detector = fasttext.load_model('lid.176.bin')
        
        # Brand lexicon
        self.brand_lexicon = {
            '6sense': ['6sense', 'six sense', 'sixsense'],
            'demandbase': ['demandbase', 'demand base'],
            'zoominfo': ['zoominfo', 'zoom info'],
            'clearbit': ['clearbit', 'clear bit'],
            'leadgenius': ['leadgenius', 'lead genius'],
            'sentientiq': ['sentientiq', 'sentient iq', 'crystal palace']
        }
        
        # Emotion model placeholders
        self.emotion_labels = ['joy', 'fear', 'anger', 'surprise', 'disgust', 'sadness', 'anticipation', 'trust']
        
    def generate_dedupe_key(self, text: str, author_id: str) -> str:
        """Generate deduplication key"""
        normalized = f"{text.lower().strip()}:{author_id}"
        return hashlib.sha1(normalized.encode()).hexdigest()
    
    async def check_duplicate(self, dedupe_key: str, platform: str) -> bool:
        """Check if post exists in 30-day window via Athena"""
        query = f"""
        SELECT COUNT(*) as count
        FROM sentientiq_processed.social
        WHERE dedupe_key = '{dedupe_key}'
        AND platform = '{platform}'
        AND ingested_at >= current_date - interval '30' day
        """
        
        # Execute Athena query
        response = athena.start_query_execution(
            QueryString=query,
            ResultConfiguration={
                'OutputLocation': 's3://sentientiq-processed-data/athena-results/'
            }
        )
        
        # In production, would wait for query and parse results
        # For now, return False (not duplicate)
        return False
    
    def detect_language(self, text: str) -> str:
        """Detect language using fasttext/cld3"""
        # Simplified - would use actual model
        if re.search(r'[\u4e00-\u9fff]', text):
            return 'zh'
        elif re.search(r'[\u0400-\u04ff]', text):
            return 'ru'
        elif re.search(r'[\u3040-\u309f\u30a0-\u30ff]', text):
            return 'ja'
        else:
            return 'en'  # Default to English
    
    def calculate_bot_score(self, author_data: Dict) -> float:
        """Calculate bot likelihood score"""
        score = 0.0
        
        # Account age factor
        if author_data.get('account_age_days', 365) < 30:
            score += 0.3
            
        # Follower/following ratio
        followers = author_data.get('followers', 1)
        following = author_data.get('following', 1)
        ratio = followers / max(following, 1)
        
        if ratio < 0.1:
            score += 0.3
        elif ratio > 100:
            score += 0.2  # Might be fake inflated
            
        # Posting cadence (posts per day)
        posts_per_day = author_data.get('posts_per_day', 1)
        if posts_per_day > 50:
            score += 0.3
            
        # Text patterns (repetitive, low perplexity)
        if author_data.get('text_perplexity', 100) < 10:
            score += 0.2
            
        return min(score, 1.0)
    
    def calculate_authenticity(self, bot_score: float) -> float:
        """Calculate authenticity score"""
        return max(0.0, 1.0 - bot_score)
    
    def score_emotions(self, text: str) -> Tuple[Dict[str, float], str]:
        """Score emotions and determine primary"""
        # Placeholder - would use actual emotion model
        # For now, use keyword matching
        
        emotion_keywords = {
            'joy': ['happy', 'excited', 'love', 'amazing', 'wonderful'],
            'fear': ['afraid', 'scared', 'worried', 'anxious', 'concerned'],
            'anger': ['angry', 'furious', 'pissed', 'outraged', 'hate'],
            'surprise': ['wow', 'shocked', 'unexpected', 'suddenly', 'omg'],
            'disgust': ['disgusting', 'gross', 'awful', 'terrible', 'sick'],
            'sadness': ['sad', 'depressed', 'crying', 'hurt', 'loss'],
            'anticipation': ['waiting', 'hoping', 'expecting', 'soon', 'upcoming'],
            'trust': ['reliable', 'honest', 'authentic', 'genuine', 'real']
        }
        
        text_lower = text.lower()
        scores = {}
        
        for emotion, keywords in emotion_keywords.items():
            score = sum(1 for kw in keywords if kw in text_lower) / len(keywords)
            scores[emotion] = min(score * 2, 1.0)  # Scale and cap at 1.0
        
        # Add neutral if confidence low
        total_score = sum(scores.values())
        if total_score < 0.3:
            scores['neutral'] = 0.8
            primary = 'neutral'
        else:
            primary = max(scores.items(), key=lambda x: x[1])[0]
            
        return scores, primary
    
    def map_brand_topic(self, text: str) -> Tuple[str, List[str]]:
        """Map text to brand and topics"""
        text_lower = text.lower()
        
        # Detect brand
        brand = 'unknown'
        for brand_name, keywords in self.brand_lexicon.items():
            if any(kw in text_lower for kw in keywords):
                brand = brand_name
                break
        
        # Extract topics (simplified)
        topics = []
        topic_patterns = {
            'intent_data': r'\b(intent|buyer.?intent|purchase.?intent)\b',
            'abm': r'\b(abm|account.?based)\b',
            'leadgen': r'\b(lead.?gen|lead.?generation|pipeline)\b',
            'martech': r'\b(martech|marketing.?tech)\b',
            'ai': r'\b(ai|artificial.?intelligence|machine.?learning)\b',
            'fraud': r'\b(fraud|fake|random|math\.random)\b'
        }
        
        for topic, pattern in topic_patterns.items():
            if re.search(pattern, text_lower, re.IGNORECASE):
                topics.append(topic)
                
        return brand, topics
    
    def generate_fingerprint(self, text: str) -> str:
        """Generate content fingerprint using simhash"""
        # Simplified simhash
        tokens = text.lower().split()
        hash_bits = 64
        v = [0] * hash_bits
        
        for token in tokens:
            token_hash = int(hashlib.md5(token.encode()).hexdigest(), 16)
            for i in range(hash_bits):
                bit = (token_hash >> i) & 1
                v[i] += 1 if bit else -1
                
        fingerprint = 0
        for i in range(hash_bits):
            if v[i] > 0:
                fingerprint |= (1 << i)
                
        return hex(fingerprint)[2:].zfill(16)
    
    async def process_raw_post(self, raw_data: Dict, platform: str) -> ProcessedPost:
        """Process single raw post into enriched format"""
        
        # Generate dedupe key
        dedupe_key = self.generate_dedupe_key(
            raw_data['text'], 
            raw_data['author_id']
        )
        
        # Check duplicate
        is_duplicate = await self.check_duplicate(dedupe_key, platform)
        
        # Detect language
        lang = self.detect_language(raw_data['text'])
        
        # Calculate bot score
        bot_score = self.calculate_bot_score(raw_data.get('author_meta', {}))
        authenticity = self.calculate_authenticity(bot_score)
        
        # Score emotions
        emotion_scores, emotion_primary = self.score_emotions(raw_data['text'])
        
        # Map brand and topics
        brand, topics = self.map_brand_topic(raw_data['text'])
        
        # Generate fingerprint
        fingerprint = self.generate_fingerprint(raw_data['text'])
        
        # Calculate normalized engagement
        engagement = (
            raw_data.get('likes', 0) + 
            raw_data.get('comments', 0) * 2 + 
            raw_data.get('shares', 0) * 3
        )
        
        return ProcessedPost(
            post_id=raw_data['id'],
            platform=platform,
            author_id=raw_data['author_id'],
            author_handle=raw_data.get('author_handle', ''),
            brand=brand,
            topic=topics,
            lang=lang,
            created_at=datetime.fromisoformat(raw_data['created_at']),
            ingested_at=datetime.now(),
            text=raw_data['text'],
            dedupe_key=dedupe_key,
            is_duplicate=is_duplicate,
            bot_score=bot_score,
            authenticity=authenticity,
            emotion_primary=emotion_primary,
            emotion_scores=emotion_scores,
            engagement_count=engagement,
            fingerprint=fingerprint,
            source_url=raw_data.get('url', '')
        )

class ParquetWriter:
    """Write processed data to Parquet with partitioning"""
    
    @staticmethod
    def write_batch(posts: List[ProcessedPost], platform: str, brand: str):
        """Write batch of posts to partitioned Parquet"""
        
        # Convert to DataFrame
        df = pd.DataFrame([asdict(p) for p in posts])
        
        # Define Parquet schema
        schema = pa.schema([
            ('post_id', pa.string()),
            ('platform', pa.string()),
            ('author_id', pa.string()),
            ('author_handle', pa.string()),
            ('brand', pa.string()),
            ('topic', pa.list_(pa.string())),
            ('lang', pa.string()),
            ('created_at', pa.timestamp('us')),
            ('ingested_at', pa.timestamp('us')),
            ('text', pa.string()),
            ('dedupe_key', pa.string()),
            ('is_duplicate', pa.bool_()),
            ('bot_score', pa.float64()),
            ('authenticity', pa.float64()),
            ('emotion_primary', pa.string()),
            ('emotion_scores', pa.map_(pa.string(), pa.float64())),
            ('engagement_count', pa.int64()),
            ('fingerprint', pa.string()),
            ('source_url', pa.string())
        ])
        
        # Convert to PyArrow Table
        table = pa.Table.from_pandas(df, schema=schema)
        
        # Write to S3 with partitioning
        ingest_date = datetime.now().strftime('%Y-%m-%d')
        s3_path = (
            f's3://sentientiq-processed-data/social/'
            f'platform={platform}/'
            f'brand={brand}/'
            f'ingest_date={ingest_date}/'
            f'part-{datetime.now().strftime("%H%M%S")}.parquet'
        )
        
        pq.write_table(
            table,
            s3_path,
            compression='snappy',
            use_dictionary=True,
            use_deprecated_int96_timestamps=False
        )
        
        print(f"Wrote {len(posts)} posts to {s3_path}")

async def process_batch(batch_type: str = "incremental"):
    """Main batch processing function"""
    
    enricher = DataEnricher()
    
    # Determine time window
    if batch_type == "incremental":
        since = datetime.now() - timedelta(hours=1)
    else:  # nightly
        since = datetime.now() - timedelta(days=1)
    
    # List raw files
    platforms = ['twitter', 'linkedin', 'youtube', 'reddit']
    
    for platform in platforms:
        prefix = f'social/{platform}/ingest_date={since.strftime("%Y-%m-%d")}/'
        
        response = s3.list_objects_v2(
            Bucket='sentientiq-raw-data',
            Prefix=prefix
        )
        
        for obj in response.get('Contents', []):
            # Read raw data
            raw_response = s3.get_object(
                Bucket='sentientiq-raw-data',
                Key=obj['Key']
            )
            
            if obj['Key'].endswith('.json'):
                raw_posts = json.loads(raw_response['Body'].read())
            else:  # CSV
                raw_posts = pd.read_csv(raw_response['Body']).to_dict('records')
            
            # Process each post
            processed_posts = []
            for raw_post in raw_posts:
                processed = await enricher.process_raw_post(raw_post, platform)
                processed_posts.append(processed)
            
            # Group by brand and write
            brand_groups = {}
            for post in processed_posts:
                if post.brand not in brand_groups:
                    brand_groups[post.brand] = []
                brand_groups[post.brand].append(post)
            
            # Write each brand group
            for brand, posts in brand_groups.items():
                ParquetWriter.write_batch(posts, platform, brand)

if __name__ == "__main__":
    import asyncio
    # Run hourly incremental
    asyncio.run(process_batch("incremental"))