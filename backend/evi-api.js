/**
 * Emotional Value Index (EVI) API
 * The VIX for emotional commerce - measures global emotional volatility relative to purchase intent
 * 
 * Like the VIX measures fear in equity markets, EVI measures emotional climate for commerce
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Claude for analysis
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Cache for EVI data (refreshes every 15 minutes)
let eviCache = {
  global: null,
  verticals: {},
  lastUpdate: null
};

/**
 * Calculate Emotional Value Index
 * Aggregates emotional data from all analyzed sites
 */
async function calculateEVI(vertical = null) {
  try {
    // Get recent emotional analyses from database
    let query = supabase
      .from('onboarding_analyses')
      .select('emotional_analysis, domain, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    if (vertical) {
      // Filter by industry vertical for enterprise customers
      query = query.eq('industry', vertical);
    }

    const { data: analyses, error } = await query.limit(1000);

    if (error || !analyses || analyses.length === 0) {
      return generateDefaultEVI();
    }

    // Aggregate Plutchik emotions across all sites
    const emotionTotals = {
      joy: 0,
      trust: 0,
      fear: 0,
      surprise: 0,
      sadness: 0,
      disgust: 0,
      anger: 0,
      anticipation: 0
    };

    let validAnalyses = 0;

    analyses.forEach(analysis => {
      if (analysis.emotional_analysis?.plutchik_wheel) {
        const emotions = analysis.emotional_analysis.plutchik_wheel;
        Object.keys(emotionTotals).forEach(emotion => {
          emotionTotals[emotion] += emotions[emotion] || 0;
        });
        validAnalyses++;
      }
    });

    if (validAnalyses === 0) {
      return generateDefaultEVI();
    }

    // Calculate averages
    Object.keys(emotionTotals).forEach(emotion => {
      emotionTotals[emotion] = Math.round(emotionTotals[emotion] / validAnalyses);
    });

    // Calculate EVI score (0-100, where 100 = extreme emotional volatility)
    const negativeEmotions = emotionTotals.fear + emotionTotals.anger + 
                             emotionTotals.disgust + emotionTotals.sadness;
    const positiveEmotions = emotionTotals.joy + emotionTotals.trust + 
                             emotionTotals.anticipation;
    
    // EVI formula: weighted negative emotions vs positive, with surprise as volatility multiplier
    const baseEVI = (negativeEmotions * 0.7 - positiveEmotions * 0.3) / 4;
    const volatilityMultiplier = 1 + (emotionTotals.surprise / 100);
    const eviScore = Math.min(100, Math.max(0, baseEVI * volatilityMultiplier));

    // Determine market condition based on EVI
    let condition, signal, recommendation;
    
    if (eviScore < 20) {
      condition = 'EUPHORIC';
      signal = 'Extreme greed - users in buying mood';
      recommendation = 'Push premium offerings aggressively';
    } else if (eviScore < 40) {
      condition = 'OPTIMISTIC';
      signal = 'Positive sentiment - healthy conversion climate';
      recommendation = 'Focus on value propositions';
    } else if (eviScore < 60) {
      condition = 'NEUTRAL';
      signal = 'Mixed emotions - standard market conditions';
      recommendation = 'A/B test emotional triggers';
    } else if (eviScore < 80) {
      condition = 'ANXIOUS';
      signal = 'Fear rising - trust signals critical';
      recommendation = 'Emphasize security and guarantees';
    } else {
      condition = 'FEARFUL';
      signal = 'Extreme fear - conversions at risk';
      recommendation = 'Simplify and de-risk all offerings';
    }

    // Historical comparison (mock for now, would pull from time series)
    const change24h = Math.random() * 20 - 10; // -10 to +10
    const change7d = Math.random() * 30 - 15;  // -15 to +15
    
    return {
      score: Math.round(eviScore),
      condition,
      signal,
      recommendation,
      emotions: emotionTotals,
      dominantEmotion: Object.entries(emotionTotals)
        .sort((a, b) => b[1] - a[1])[0][0],
      volatility: {
        current: Math.round(emotionTotals.surprise),
        change24h: change24h > 0 ? `+${change24h.toFixed(1)}%` : `${change24h.toFixed(1)}%`,
        change7d: change7d > 0 ? `+${change7d.toFixed(1)}%` : `${change7d.toFixed(1)}%`
      },
      sampleSize: validAnalyses,
      vertical: vertical || 'GLOBAL',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('EVI calculation error:', error);
    return generateDefaultEVI();
  }
}

/**
 * Generate default EVI when no data available
 */
function generateDefaultEVI() {
  return {
    score: 50,
    condition: 'NEUTRAL',
    signal: 'Insufficient data - gathering emotional climate',
    recommendation: 'Monitor for 24 hours',
    emotions: {
      joy: 25,
      trust: 25,
      fear: 25,
      surprise: 10,
      sadness: 5,
      disgust: 5,
      anger: 5,
      anticipation: 25
    },
    dominantEmotion: 'neutral',
    volatility: {
      current: 10,
      change24h: '0.0%',
      change7d: '0.0%'
    },
    sampleSize: 0,
    vertical: 'GLOBAL',
    timestamp: new Date().toISOString()
  };
}

/**
 * Get EVI for a specific tier
 */
router.get('/api/evi/:tier?/:vertical?', async (req, res) => {
  try {
    const { tier = 'free', vertical = null } = req.params;
    
    // Check cache first (15 minute TTL)
    const cacheKey = vertical || 'global';
    const now = Date.now();
    const cacheAge = eviCache.lastUpdate ? now - eviCache.lastUpdate : Infinity;
    
    if (cacheAge < 15 * 60 * 1000) {
      const cachedData = vertical ? eviCache.verticals[vertical] : eviCache.global;
      if (cachedData) {
        return res.json(cachedData);
      }
    }
    
    // Access control based on tier
    let eviData;
    
    switch(tier) {
      case 'enterprise':
      case 'team':
        // Vertical-specific EVI for paid tiers
        if (vertical) {
          eviData = await calculateEVI(vertical);
          eviCache.verticals[vertical] = eviData;
        } else {
          // Default to global if no vertical specified
          eviData = await calculateEVI();
          eviCache.global = eviData;
        }
        break;
        
      case 'pro':
        // Global EVI with more detail
        eviData = await calculateEVI();
        eviCache.global = eviData;
        break;
        
      case 'free':
      default:
        // Basic global EVI
        eviData = await calculateEVI();
        // Simplify for free tier
        eviData = {
          score: eviData.score,
          condition: eviData.condition,
          signal: eviData.signal,
          dominantEmotion: eviData.dominantEmotion,
          timestamp: eviData.timestamp
        };
        eviCache.global = eviData;
        break;
    }
    
    eviCache.lastUpdate = now;
    
    res.json({
      success: true,
      evi: eviData,
      tier,
      refreshIn: Math.round((15 * 60 * 1000 - cacheAge) / 1000) // seconds until next refresh
    });
    
  } catch (error) {
    console.error('EVI API error:', error);
    res.status(500).json({ 
      error: 'Failed to calculate EVI',
      evi: generateDefaultEVI()
    });
  }
});

/**
 * Get historical EVI data for charting
 */
router.get('/api/evi/history/:period/:vertical?', async (req, res) => {
  try {
    const { period = '24h', vertical = null } = req.params;
    
    // This would pull from time-series database
    // For now, generate mock historical data
    const points = period === '24h' ? 24 : period === '7d' ? 168 : 720; // hourly points
    const history = [];
    
    for (let i = points; i >= 0; i--) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000);
      const baseScore = 50 + Math.sin(i / 10) * 20 + Math.random() * 10;
      
      history.push({
        timestamp: timestamp.toISOString(),
        score: Math.min(100, Math.max(0, Math.round(baseScore))),
        condition: baseScore < 40 ? 'OPTIMISTIC' : baseScore < 60 ? 'NEUTRAL' : 'ANXIOUS'
      });
    }
    
    res.json({
      success: true,
      period,
      vertical: vertical || 'GLOBAL',
      history
    });
    
  } catch (error) {
    console.error('EVI history error:', error);
    res.status(500).json({ error: 'Failed to fetch EVI history' });
  }
});

/**
 * Subscribe to real-time EVI updates (WebSocket endpoint)
 */
router.get('/api/evi/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send EVI updates every 30 seconds
  const interval = setInterval(async () => {
    const evi = await calculateEVI();
    res.write(`data: ${JSON.stringify(evi)}\n\n`);
  }, 30000);
  
  // Send initial data
  const initialEvi = await calculateEVI();
  res.write(`data: ${JSON.stringify(initialEvi)}\n\n`);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});

export default router;