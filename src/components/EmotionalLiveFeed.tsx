/**
 * Emotional Live Feed
 * Real-time emotional intelligence from actual websites
 * NO MOCK DATA - Only real emotions from real users
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { Users, AlertCircle, Zap, Brain, Lightbulb } from 'lucide-react';
import PageHeader from './PageHeader';
import EVIDisplay from './EVIDisplay';

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
  volatilityIndex?: number;
}

const EMOTION_COLORS: Record<string, string> = {
  // RED gradients - Critical states
  rage: 'from-red-600 to-red-700',
  abandonment: 'from-red-800 to-red-900',
  abandonment_intent: 'from-red-700 to-red-800',
  abandonment_risk: 'from-red-800 to-red-900',
  frustration: 'from-red-400 to-red-500',
  
  // YELLOW gradients - Caution states
  hesitation: 'from-yellow-500 to-amber-500',
  confusion: 'from-yellow-400 to-yellow-500',
  anxiety: 'from-amber-400 to-yellow-500',
  skepticism: 'from-yellow-500 to-amber-600',
  sticker_shock: 'from-yellow-400 to-amber-500',
  
  // GREEN gradients - Positive states
  confidence: 'from-green-500 to-emerald-600',
  curiosity: 'from-emerald-500 to-green-600',
  delight: 'from-green-400 to-emerald-500',
  interest: 'from-green-600 to-emerald-700',
  engagement: 'from-emerald-500 to-teal-600',
  purchase_intent: 'from-green-600 to-green-700',
  
  // Neutral
  normal: 'from-gray-500 to-gray-600'
};

const EMOTION_LABELS: Record<string, string> = {
  // Critical states
  rage: 'Rage Click',
  abandonment: 'Abandoning',
  abandonment_intent: 'Exit Intent',
  abandonment_risk: 'Exit Risk',
  frustration: 'Frustration',
  
  // Caution states
  hesitation: 'Hesitating',
  confusion: 'Confused',
  anxiety: 'Anxiety',
  skepticism: 'Skeptical',
  sticker_shock: 'Price Shock',
  
  // Positive states
  confidence: 'Confident',
  curiosity: 'Curious',
  delight: 'Delighted',
  interest: 'Interested',
  engagement: 'Engaged',
  purchase_intent: 'Purchase Intent',
  
  // Neutral
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
  const [tenantInsights, setTenantInsights] = useState<any>(null);
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
        // Use 'demo' tenant for cross-domain testing
        const tenantId = window.location.hostname === 'localhost' ? user.id : 'demo';
        const wsUrl = `${wsInfo.ws_url}?channel=emotions&tenant_id=${tenantId}`;
        
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
            
            if (data.type === 'event' && data.payload) {
              // Validate and add new emotional event (skip if duplicate or invalid)
              const newEvent = data.payload;
              if (newEvent.emotion && newEvent.id) {
                setEvents(prev => {
                  // Filter out duplicates and invalid events
                  const exists = prev.some(e => e.id === newEvent.id);
                  if (exists) return prev;
                  return [newEvent, ...prev].slice(0, 50);
                });
                
                // Show EVI contribution if significant
                if (data.evi && Math.abs(data.evi) > 0.5) {
                  console.log(`EVI™ Impact: ${data.evi > 0 ? '+' : ''}${data.evi.toFixed(2)}`);
                }
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
        console.log('WebSocket connection error:', error);
        // Retry WebSocket after 3 seconds instead of polling
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
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

    // WebSocket only - no polling fallback
    connectWebSocket();

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

  // Fetch tenant insights periodically
  useEffect(() => {
    if (!user) return;

    const fetchInsights = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://api.sentientiq.app'}/api/emotional/tenant-insights/${user.id}`
        );

        if (response.ok) {
          const data = await response.json();
          setTenantInsights(data);
        }
      } catch (error) {
        console.error('Error fetching tenant insights:', error);
      }
    };

    // Initial fetch
    fetchInsights();

    // Refresh every 30 seconds
    const interval = setInterval(fetchInsights, 30000);

    return () => clearInterval(interval);
  }, [user]);

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

      {/* EVI and Active Users - Top Level Metrics */}
      <div className="flex gap-4 mb-8">
        {/* Emotional Volatility Index - 80% width */}
        <div className="flex-1" style={{ maxWidth: '80%' }}>
          <EVIDisplay
            value={stats.volatilityIndex || 50}
            trend={stats.volatilityIndex && stats.volatilityIndex > 60 ? 'up' : stats.volatilityIndex && stats.volatilityIndex < 40 ? 'down' : 'stable'}
            className="w-full"
          />
        </div>

        {/* Active Users Card - 20% width */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 flex flex-col items-center justify-center min-w-[160px]"
        >
          <Users className="w-8 h-8 text-purple-400 mb-3" />
          <div className="text-3xl font-bold text-white">{stats.activeUsers}</div>
          <div className="text-sm text-white/60 mt-1">Active Now</div>
          <div className="mt-2 text-xs text-green-400 animate-pulse">● LIVE</div>
        </motion.div>
      </div>

      {/* Intelligent Shopping Pattern Assessment */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Shopping Pattern Intelligence</h2>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="text-sm text-white/60">AI Analysis</span>
          </div>
        </div>

        {/* Pattern Insights */}
        <div className="space-y-4">
          {tenantInsights && tenantInsights.insights.length > 0 ? (
            tenantInsights.insights.map((insight: any, index: number) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-white/5 rounded-xl border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{insight.headline}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    insight.impact_score > 80 ? 'bg-red-500/20 text-red-400' :
                    insight.impact_score > 60 ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    Impact: {insight.impact_score}
                  </span>
                </div>
                <p className="text-sm text-white/70 mb-3">{insight.description}</p>
                {insight.recommendation && (
                  <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-semibold text-purple-400">RECOMMENDATION</span>
                    </div>
                    <p className="text-sm text-white/80">{insight.recommendation}</p>
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-white/40">
              <Brain className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-lg mb-2">Pattern learning in progress...</p>
              <p className="text-sm">
                As visitors browse your site, we'll identify emotional patterns that lead to conversions or abandonment.
              </p>
            </div>
          )}
        </div>

        {/* Pattern Statistics */}
        {tenantInsights && tenantInsights.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{tenantInsights.stats.total_patterns_learned || 0}</div>
              <div className="text-xs text-white/60">Patterns Learned</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{tenantInsights.stats.conversion_patterns || 0}</div>
              <div className="text-xs text-white/60">Success Paths</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{tenantInsights.stats.abandonment_patterns || 0}</div>
              <div className="text-xs text-white/60">Abandonment Paths</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {tenantInsights.stats.overall_conversion_rate ?
                  `${tenantInsights.stats.overall_conversion_rate.toFixed(1)}%` : '—'}
              </div>
              <div className="text-xs text-white/60">Conversion Rate</div>
            </div>
          </div>
        )}
      </motion.div>

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
                  &lt;script src="https://cdn.sentientiq.ai/v2/detect.js" data-api-key="YOUR_KEY"&gt;&lt;/script&gt;
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
                        Session {event.session_id ? event.session_id.slice(-6) : 'Unknown'}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="text-white/60 text-sm">
                        {event.confidence || 0}% confidence
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