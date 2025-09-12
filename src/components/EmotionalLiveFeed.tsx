/**
 * Emotional Live Feed
 * Real-time emotional intelligence from actual websites
 * NO MOCK DATA - Only real emotions from real users
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { Activity, Users, TrendingUp, AlertCircle, Zap } from 'lucide-react';
import PageHeader from './PageHeader';

interface EmotionalEvent {
  id: string;
  session_id: string;
  emotion: string;
  confidence: number;
  timestamp: number;
  url?: string;
  device?: string;
  user_id?: string;
  intervention_triggered?: boolean;
}

interface EmotionalStats {
  totalSessions: number;
  totalEvents: number;
  dominantEmotion?: string;
  interventionRate: number;
  activeUsers: number;
}

const EMOTION_COLORS: Record<string, string> = {
  rage: 'from-red-500 to-red-600',
  frustration: 'from-orange-500 to-amber-500',
  anxiety: 'from-purple-500 to-indigo-500',
  confidence: 'from-blue-500 to-cyan-500',
  hesitation: 'from-yellow-500 to-orange-500',
  confusion: 'from-gray-500 to-gray-600',
  delight: 'from-pink-500 to-rose-500',
  abandonment: 'from-red-700 to-red-900',
  sticker_shock: 'from-yellow-400 to-amber-500',
  normal: 'from-green-500 to-emerald-500'
};

const EMOTION_LABELS: Record<string, string> = {
  rage: 'Rage Click',
  frustration: 'Frustration',
  anxiety: 'Anxiety',
  confidence: 'Confident',
  hesitation: 'Hesitating',
  confusion: 'Confused',
  delight: 'Delighted',
  abandonment: 'Abandoning',
  sticker_shock: 'Price Shock',
  normal: 'Normal'
};

const EmotionalLiveFeed = () => {
  const { user } = useUser();
  const [events, setEvents] = useState<EmotionalEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<EmotionalStats>({
    totalSessions: 0,
    totalEvents: 0,
    interventionRate: 0,
    activeUsers: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [lastEtag, setLastEtag] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<'websocket' | 'polling'>('polling');
  const pollingInterval = useRef<NodeJS.Timeout>();
  const ws = useRef<WebSocket | null>(null);

  // Hybrid connection: WebSocket with NATS JetStream backing, polling fallback
  useEffect(() => {
    if (!user) return;

    let reconnectTimeout: NodeJS.Timeout;
    let isCleaningUp = false;

    const connectWebSocket = async () => {
      try {
        // First, get WebSocket info
        const wsInfoResponse = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://api.sentientiq.app'}/api/emotional/ws-info`
        );
        
        if (!wsInfoResponse.ok) {
          throw new Error('WebSocket not available');
        }
        
        const wsInfo = await wsInfoResponse.json();
        const wsUrl = `${wsInfo.ws_url}?tenant_id=${user.id}`;
        
        // Connect to WebSocket
        ws.current = new WebSocket(wsUrl);
        
        ws.current.onopen = () => {
          console.log('Connected to NATS JetStream WebSocket');
          setIsConnected(true);
          setConnectionType('websocket');
          setIsLoading(false);
          
          // Clear polling if active
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current);
            pollingInterval.current = undefined;
          }
        };
        
        ws.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'event') {
              // Add new emotional event with EVI contribution
              setEvents(prev => [data.payload, ...prev].slice(0, 50));
              
              // Show EVI contribution if significant
              if (data.evi && Math.abs(data.evi) > 0.5) {
                console.log(`EVI™ Impact: ${data.evi > 0 ? '+' : ''}${data.evi.toFixed(2)}`);
              }
            } else if (data.type === 'stats') {
              // Update stats including volatility index
              setStats(data.payload);
            }
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };
        
        ws.current.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
        
        ws.current.onclose = () => {
          setIsConnected(false);
          ws.current = null;
          
          // Reconnect after 3 seconds if not cleaning up
          if (!isCleaningUp) {
            console.log('WebSocket closed, will reconnect or fall back to polling');
            reconnectTimeout = setTimeout(() => {
              connectWebSocket().catch(startPolling);
            }, 3000);
          }
        };
      } catch (error) {
        console.log('WebSocket not available, falling back to polling');
        startPolling();
      }
    };

    const startPolling = () => {
      setConnectionType('polling');
      
      const fetchEmotionalData = async () => {
        try {
          const headers: HeadersInit = {};
          if (lastEtag) {
            headers['If-None-Match'] = lastEtag;
          }

          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'https://api.sentientiq.app'}/api/emotional/poll?tenant_id=${user.id}`,
            { headers }
          );

          // 304 Not Modified - no new data
          if (response.status === 304) {
            return;
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          // Store ETag for next request
          const etag = response.headers.get('ETag');
          if (etag) {
            setLastEtag(etag);
          }

          const data = await response.json();
          
          if (data.events && data.events.length > 0) {
            // Add new emotional events
            setEvents(prev => {
              const newEvents = [...data.events, ...prev];
              return newEvents.slice(0, 50); // Keep last 50
            });
          }
          
          if (data.stats) {
            // Update stats
            setStats(data.stats);
          }

          setIsConnected(true);
          setIsLoading(false);
        } catch (error) {
          console.error('Failed to fetch emotional data:', error);
          setIsConnected(false);
        }
      };

      // Initial fetch
      fetchEmotionalData();

      // Poll every 2 seconds
      pollingInterval.current = setInterval(fetchEmotionalData, 2000);
    };

    // Try WebSocket first, fall back to polling
    connectWebSocket().catch(startPolling);

    return () => {
      isCleaningUp = true;
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [user, lastEtag]);

  // Listen for detect.js events on the current page (if instrumented)
  useEffect(() => {
    const handleLocalEmotion = (e: CustomEvent) => {
      const event: EmotionalEvent = {
        id: `local-${Date.now()}`,
        session_id: 'current-session',
        emotion: e.detail.emotion,
        confidence: e.detail.confidence,
        timestamp: Date.now(),
        url: window.location.href,
        device: 'current'
      };
      
      setEvents(prev => [event, ...prev].slice(0, 50));
    };

    window.addEventListener('sentientiq:emotion' as any, handleLocalEmotion);
    return () => window.removeEventListener('sentientiq:emotion' as any, handleLocalEmotion);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  return (
    <>
      <PageHeader 
        title="Emotional Intelligence Dashboard"
        subtitle="Real-time emotions from your instrumented websites"
      />

      {/* Connection Status */}
      <div className="mb-6 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-sm text-white/60">
          {isConnected ? 
            `Connected to Emotional Volatility Index™ (${connectionType === 'websocket' ? 'NATS JetStream' : 'Polling'})` : 
            'Connecting to EVI™...'}
        </span>
        {stats.volatilityIndex !== undefined && stats.volatilityIndex > 0 && (
          <span className="ml-auto text-sm font-semibold text-purple-400">
            EVI: {stats.volatilityIndex.toFixed(2)}
          </span>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-white/40">LIVE</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeUsers}</div>
          <div className="text-sm text-white/60">Active Users</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-white/40">TODAY</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalEvents}</div>
          <div className="text-sm text-white/60">Emotions Detected</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <span className="text-xs text-white/40">RATE</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.interventionRate}%</div>
          <div className="text-sm text-white/60">Intervention Success</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-white/40">DOMINANT</span>
          </div>
          <div className="text-2xl font-bold text-white">
            {stats.dominantEmotion ? EMOTION_LABELS[stats.dominantEmotion] : '—'}
          </div>
          <div className="text-sm text-white/60">Most Common</div>
        </motion.div>
      </div>

      {/* Live Event Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Live Emotional Feed</h2>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-white/60">Real-time</span>
          </div>
        </div>

        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-white/40"
              >
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p className="text-lg mb-2">No emotional events detected yet</p>
                <p className="text-sm mb-4">
                  Add detect.js to start contributing to the Emotional Volatility Index™
                </p>
                <code className="block p-4 bg-black/30 rounded-lg text-xs font-mono text-purple-400">
                  {/* NEVER expose user IDs as API keys - always use YOUR_KEY placeholder */}
                  &lt;script src="https://cdn.sentientiq.ai/v1/detect.js" data-api-key="YOUR_KEY"&gt;&lt;/script&gt;
                </code>
              </motion.div>
            ) : (
              events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all border border-white/10"
                >
                  {/* Emotion Badge */}
                  <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${EMOTION_COLORS[event.emotion] || EMOTION_COLORS.normal}`}>
                    <span className="text-xs font-semibold text-white">
                      {EMOTION_LABELS[event.emotion] || event.emotion}
                    </span>
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-medium">
                        Session {event.session_id.slice(-6)}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 text-sm">
                        {event.confidence}% confidence
                      </span>
                      {event.intervention_triggered && (
                        <>
                          <span className="text-white/40">•</span>
                          <span className="text-green-400 text-sm">Intervention deployed</span>
                        </>
                      )}
                    </div>
                    {event.url && (
                      <div className="text-xs text-white/40 mt-1">
                        {new URL(event.url).pathname}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-white/40">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {events.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              Showing last {events.length} events • Powered by Emotional Volatility Index™
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default EmotionalLiveFeed;