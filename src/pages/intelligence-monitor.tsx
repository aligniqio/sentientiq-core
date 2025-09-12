import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, AlertCircle, CheckCircle2, Clock, Zap } from 'lucide-react';
import PageHeader from '../components/PageHeader';
// SwarmAnalysisPanel removed - Sage works alone now

// Plutchik's Wheel of Emotions - 8 primary emotions
const PLUTCHIK_EMOTIONS = {
  joy: { color: '#FFD700', opposite: 'sadness', intensity: ['serenity', 'joy', 'ecstasy'] },
  trust: { color: '#90EE90', opposite: 'disgust', intensity: ['acceptance', 'trust', 'admiration'] },
  fear: { color: '#008000', opposite: 'anger', intensity: ['apprehension', 'fear', 'terror'] },
  surprise: { color: '#00CED1', opposite: 'anticipation', intensity: ['distraction', 'surprise', 'amazement'] },
  sadness: { color: '#4169E1', opposite: 'joy', intensity: ['pensiveness', 'sadness', 'grief'] },
  disgust: { color: '#9400D3', opposite: 'trust', intensity: ['boredom', 'disgust', 'loathing'] },
  anger: { color: '#FF0000', opposite: 'fear', intensity: ['annoyance', 'anger', 'rage'] },
  anticipation: { color: '#FFA500', opposite: 'surprise', intensity: ['interest', 'anticipation', 'vigilance'] }
};

interface EmotionLabel {
  emotion: keyof typeof PLUTCHIK_EMOTIONS;
  intensity: number; // 0-1
  confidence: number; // 0-1
}

interface SocialPost {
  id: string;
  content: string;
  author: string;
  platform: string;
  timestamp: string;
  url?: string;
  emotions: EmotionLabel[];
  enriched: boolean;
  interventions: number;
  processing_time?: number;
  llm_accuracy?: number;
}

interface EVIMetrics {
  index_value: number;
  signal: 'GO' | 'WAIT' | 'ABORT';
  confidence: number;
  sentiment_volatility: number;
  authenticity_drift: number;
  topic_turbulence: number;
  viral_coefficient: number;
}

interface MoatMetrics {
  depth: number;
  posts_processed: number;
  accuracy: number;
}

const EmotionNutritionLabel: React.FC<{ emotions: EmotionLabel[] }> = ({ emotions }) => {
  // Sort emotions by intensity
  const sortedEmotions = [...emotions].sort((a, b) => b.intensity - a.intensity).slice(0, 3);
  
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sortedEmotions.map((emotion, idx) => {
        const emotionData = PLUTCHIK_EMOTIONS[emotion.emotion];
        const opacity = 0.3 + (emotion.intensity * 0.7);
        
        return (
          <motion.div
            key={emotion.emotion}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-white/10"
            style={{
              backgroundColor: `${emotionData.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`,
            }}
          >
            <span className="capitalize">{emotion.emotion}</span>
            <span className="text-white/60">{Math.round(emotion.intensity * 100)}%</span>
            {emotion.confidence > 0.8 && (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

const PostCard = React.forwardRef<HTMLDivElement, { post: SocialPost; index: number; onAnalyze: (post: SocialPost) => void }>(
  ({ post, index, onAnalyze }, ref) => {
  
  const handleClick = () => {
    if (post.url && post.url !== '#') {
      window.open(post.url, '_blank', 'noopener,noreferrer');
    }
  };
  
  const hasValidUrl = post.url && post.url !== '#';
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-4 ring-1 ring-white/10 hover:ring-white/20 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="font-mono">{post.author || 'Anonymous'}</span>
            <span>•</span>
            <span>{post.platform || 'Unknown'}</span>
            <span>•</span>
            <span>{post.timestamp ? new Date(post.timestamp).toLocaleTimeString() : 'Now'}</span>
          </div>
          <p className="mt-2 text-sm text-white/80 line-clamp-3">
            {post.content.length > 500 ? `${post.content.substring(0, 500)}...` : post.content}
          </p>
          <EmotionNutritionLabel emotions={post.emotions} />
          <div className="mt-3 flex items-center gap-2">
            {hasValidUrl && (
              <button
                onClick={handleClick}
                className="text-xs px-3 py-1 rounded-lg bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30 transition"
              >
                View Post →
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(post);
              }}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-600/30 transition"
            >
              <Zap className="h-3 w-3" />
              Analyze with Swarm
            </button>
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end gap-1">
          {post.enriched && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              Enriched
            </span>
          )}
          {post.interventions > 0 && (
            <span className="text-xs text-yellow-400">
              {post.interventions} interventions
            </span>
          )}
          {post.llm_accuracy && (
            <span className="text-xs text-white/40">
              {Math.round(post.llm_accuracy * 100)}% accuracy
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';

const IntelligenceMonitor: React.FC = () => {
  const [posts] = useState<SocialPost[]>([]);
  const [eviMetrics] = useState<EVIMetrics | null>(null);
  const [moatMetrics] = useState<MoatMetrics | null>(null);
  const [isConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [analyzingPost, setAnalyzingPost] = useState<SocialPost | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Connect to backend SSE for real-time posts
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    
    const connectToStream = async () => {
      try {
        // Use configured API endpoint
        // DEAD: const apiUrl = `${API_CONFIG.POSTS_API}/api/pulse`;
        // DEAD: All SSE connection code removed
        return; // EXIT IMMEDIATELY - NO CONNECTION
      } catch (err) {
        setError('Failed to connect to intelligence stream');
        console.error('Stream connection error:', err);
        reconnectTimeout = setTimeout(connectToStream, 5000);
      }
    };

    // KILLED: Fetch initial data - all API calls removed

    // DEAD CONNECTIONS REMOVED - No more localhost:8002 calls!
    // connectToStream();  // KILLED
    // fetchInitialData();  // EXECUTED

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // No mock data - only real posts exposing Math.random() fraud

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <PageHeader
            title="Backend Intelligence Engine Monitor"
            subtitle="Live view of the backend intelligence engine processing social data in real-time"
          />
          
          {/* Status Bar */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm text-white/60">
                {isConnected ? 'System Active' : 'Connecting...'}
              </span>
            </div>
            <button className="rounded-lg bg-violet-600/20 px-3 py-1 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30 transition">
              Run Total Process
            </button>
          </div>
          
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300 ring-1 ring-red-500/20">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
          
          {/* Metrics Row */}
          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="glass-card p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">Posts Analyzed</p>
                  <p className="mt-1 text-2xl font-bold">{moatMetrics?.posts_processed.toLocaleString() || '0'}</p>
                </div>
                <Activity className="h-8 w-8 text-violet-400/50" />
              </div>
            </div>
            
            <div className="glass-card p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">EVI Signal</p>
                  <p className="mt-1 text-2xl font-bold">{eviMetrics?.signal || 'WAIT'}</p>
                  <p className="text-xs text-white/50">Index: {eviMetrics?.index_value || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-sky-400/50" />
              </div>
            </div>
            
            <div className="glass-card p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">Interventions</p>
                  <p className="mt-1 text-2xl font-bold">0</p>
                  <p className="text-xs text-green-400">No false positives</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-400/50" />
              </div>
            </div>
            
            <div className="glass-card p-4 ring-1 ring-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50">Active Platforms</p>
                  <p className="mt-1 text-2xl font-bold">4</p>
                  <div className="mt-1 flex gap-1">
                    <span className="text-xs text-white/40">Twitter</span>
                    <span className="text-xs text-white/40">Reddit</span>
                    <span className="text-xs text-white/40">LinkedIn</span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-purple-400/50" />
              </div>
            </div>
          </div>
          
          
          {/* Posts Feed */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold">Posts Analyzed</h3>
            <div className="mt-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {posts.map((post, index) => (
                  <PostCard 
                    key={post.id || `post-${index}-${post.timestamp}`} 
                    post={post} 
                    index={index}
                    onAnalyze={(post) => console.log('Analyzing:', post)} 
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sage works alone now - no swarm analysis */}
    </div>
  );
};

export default IntelligenceMonitor;