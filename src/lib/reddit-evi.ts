// Reddit-based Emotional Volatility Index
// Real-time measurement of U.S. emotional climate


interface EVIData {
  score: number;
  label: string;
  color: string;
  timestamp: number;
  sampleSize: number;
  dominantEmotion?: string;
}

// Fetch EVI from serverless function
async function fetchEVI(): Promise<EVIData> {
  try {
    const response = await fetch('/.netlify/functions/evi');
    if (!response.ok) throw new Error('Failed to fetch EVI');
    return await response.json();
  } catch (error) {
    console.error('EVI fetch failed:', error);
    // Fallback to neutral state
    return {
      score: 35,
      label: 'Stable',
      color: '#3b82f6',
      timestamp: Date.now(),
      sampleSize: 0
    };
  }
}

// Cache mechanism to avoid rate limits
let eviCache: EVIData | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getEVI(): Promise<EVIData> {
  const now = Date.now();
  
  if (eviCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return eviCache;
  }
  
  const evi = await fetchEVI();
  eviCache = evi;
  cacheTimestamp = now;
  
  return evi;
}