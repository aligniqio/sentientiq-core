import { Handler } from '@netlify/functions';

const REDDIT_CLIENT_ID = 'wPNES0chd0kEZZg1tuSsNw';
const REDDIT_CLIENT_SECRET = 'jtfj4vD7483IOSE4-oLYBnpzQNQi0g';
const USER_AGENT = 'web:sentientiq-evi:v1.0.0';

// Cache to avoid rate limits
let cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getRedditToken(): Promise<string> {
  const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  return data.access_token;
}

async function getTopPosts(token: string, limit = 100): Promise<any[]> {
  const response = await fetch(`https://oauth.reddit.com/r/all/top?limit=${limit}&t=day`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': USER_AGENT
    }
  });
  
  const data = await response.json();
  return data.data.children;
}

function analyzeSentiment(text: string): number {
  const positive = /\b(love|amazing|awesome|fantastic|great|happy|excited|wonderful|best|perfect|beautiful|blessed|grateful)\b/gi;
  const negative = /\b(hate|terrible|awful|worst|angry|sad|frustrated|disappointed|disgusting|horrible|stupid|failed|broke)\b/gi;
  const intense = /\b(absolutely|totally|completely|extremely|incredibly|literally|insane|crazy|unbelievable)\b/gi;
  
  const positiveCount = (text.match(positive) || []).length;
  const negativeCount = (text.match(negative) || []).length;
  const intensityMultiplier = 1 + ((text.match(intense) || []).length * 0.2);
  
  if (positiveCount === 0 && negativeCount === 0) return 0;
  
  const sentiment = (positiveCount - negativeCount) / (positiveCount + negativeCount);
  return Math.max(-1, Math.min(1, sentiment * intensityMultiplier));
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    // Check cache
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(cache.data)
      };
    }
    
    // Get fresh data
    const token = await getRedditToken();
    const posts = await getTopPosts(token);
    
    // Analyze sentiment
    const sentiments = posts.map(post => {
      const text = `${post.data.title} ${post.data.selftext || ''}`;
      return analyzeSentiment(text);
    });
    
    // Calculate volatility
    const mean = sentiments.reduce((a, b) => a + b, 0) / sentiments.length;
    const squaredDiffs = sentiments.map(s => Math.pow(s - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / sentiments.length;
    const stdDev = Math.sqrt(variance);
    const evi = Math.min(100, stdDev * 100);
    
    // Determine label and color
    let label: string;
    let color: string;
    
    if (evi < 20) {
      label = 'Consensus';
      color = '#10b981';
    } else if (evi < 40) {
      label = 'Stable';
      color = '#3b82f6';
    } else if (evi < 60) {
      label = 'Mixed';
      color = '#f59e0b';
    } else if (evi < 80) {
      label = 'Volatile';
      color = '#ef4444';
    } else {
      label = 'Extreme';
      color = '#dc2626';
    }
    
    // Determine dominant emotion
    const emotionCounts = {
      joy: sentiments.filter(s => s > 0.5).length,
      anger: sentiments.filter(s => s < -0.5).length,
      neutral: sentiments.filter(s => Math.abs(s) < 0.2).length
    };
    
    const dominantEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    const result = {
      score: Math.round(evi),
      label,
      color,
      timestamp: now,
      sampleSize: posts.length,
      dominantEmotion
    };
    
    // Update cache
    cache = { data: result, timestamp: now };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('EVI calculation failed:', error);
    
    // Return stable default
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        score: 35,
        label: 'Stable',
        color: '#3b82f6',
        timestamp: Date.now(),
        sampleSize: 0,
        error: true
      })
    };
  }
};