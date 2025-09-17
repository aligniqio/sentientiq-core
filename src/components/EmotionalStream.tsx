/**
 * Emotional Stream Component
 * Dedicated WebSocket connection for emotional states
 * Broadcast Point #1: Real-time emotions from behavior processor
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, AlertCircle, Zap, Brain } from 'lucide-react';

interface EmotionalEvent {
  sessionId: string;
  tenantId?: string;
  emotion: string;
  confidence: number;
  intensity?: number;
  frustration?: number;
  anxiety?: number;
  urgency?: number;
  excitement?: number;
  trust?: number;
  pageUrl?: string;
  sessionAge?: number;
  timestamp: string;
}

interface EmotionalStats {
  totalSessions: number;
  totalEvents: number;
  dominantEmotion?: string;
  activeUsers: number;
  volatilityIndex?: number;
}

const EMOTION_COLORS: Record<string, string> = {
  // Critical (RED)
  rage: 'from-red-600 to-red-700',
  abandonment_intent: 'from-red-600 to-red-700',
  exit_risk: 'from-red-500 to-red-600',
  frustration: 'from-red-400 to-red-500',
  cart_shock: 'from-red-500 to-red-600',

  // Caution (YELLOW)
  hesitation: 'from-yellow-500 to-amber-500',
  confusion: 'from-yellow-400 to-yellow-500',
  skepticism: 'from-yellow-500 to-amber-600',
  sticker_shock: 'from-amber-500 to-orange-600',
  price_shock: 'from-yellow-500 to-amber-600',
  cart_hesitation: 'from-yellow-400 to-amber-500',
  cart_review: 'from-amber-400 to-yellow-500',

  // Positive (GREEN)
  confidence: 'from-green-500 to-emerald-600',
  delight: 'from-green-400 to-emerald-500',
  purchase_intent: 'from-green-600 to-green-700',

  // Information (BLUE)
  evaluation: 'from-blue-400 to-blue-500',
  comparison_shopping: 'from-blue-500 to-indigo-600',

  // Default
  default: 'from-gray-400 to-gray-500'
};

const EMOTION_LABELS: Record<string, string> = {
  rage: 'Rage',
  abandonment_intent: 'Exit Intent',
  exit_risk: 'Exit Risk',
  frustration: 'Frustrated',
  cart_shock: 'Cart Shock',
  cart_hesitation: 'Cart Hesitation',
  cart_review: 'Cart Review',
  hesitation: 'Hesitating',
  confusion: 'Confused',
  skepticism: 'Skeptical',
  sticker_shock: 'Price Shock',
  price_shock: 'Price Shock',
  confidence: 'Confident',
  delight: 'Delighted',
  purchase_intent: 'Purchase Intent',
  evaluation: 'Evaluating',
  comparison_shopping: 'Comparing',
  decision_paralysis: 'Paralyzed',
  default: 'Unknown'
};

const EmotionalStream = () => {
  const [events, setEvents] = useState<EmotionalEvent[]>([]);
  const [stats, setStats] = useState<EmotionalStats>({
    totalSessions: 0,
    totalEvents: 0,
    activeUsers: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isCleaningUp = false;

    const connectWebSocket = () => {
      if (isCleaningUp) return;

      // Connect to emotional broadcaster via secure proxy
      const wsUrl = `wss://api.sentientiq.app/ws/emotions`;

      console.log('Connecting to Emotional Broadcaster:', wsUrl);

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ Connected to Emotional Broadcaster');
          setIsConnected(true);
          setIsLoading(false);

          // Subscribe to all emotions (no filter)
          ws.current?.send(JSON.stringify({
            type: 'subscribe',
            tenant: null,
            filter: null
          }));
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch(message.type) {
              case 'connection':
                console.log('Connection established:', message.connectionId);
                break;

              case 'subscribed':
                console.log('Subscription confirmed');
                break;

              case 'emotional_state':
                const state = message.data;
                const emotionalEvent: EmotionalEvent = {
                  sessionId: state.sessionId,
                  tenantId: state.tenantId,
                  emotion: state.emotion,
                  confidence: state.confidence,
                  intensity: state.intensity,
                  frustration: state.vectors?.frustration,
                  anxiety: state.vectors?.anxiety,
                  urgency: state.vectors?.urgency,
                  excitement: state.vectors?.excitement,
                  trust: state.vectors?.trust,
                  pageUrl: state.pageUrl,
                  sessionAge: state.sessionAge,
                  timestamp: state.timestamp
                };

                // Rate limit: only add event if enough time has passed
                setEvents(prev => {
                  const now = Date.now();
                  const lastEvent = prev[0];
                  const timeSinceLastEvent = lastEvent ? now - new Date(lastEvent.timestamp).getTime() : 1000;

                  // Only add if at least 100ms since last event (10 events/sec max)
                  if (timeSinceLastEvent >= 100) {
                    return [emotionalEvent, ...prev].slice(0, 100); // Increased limit to 100
                  }
                  return prev;
                });

                // Always update stats
                setStats(prev => ({
                  ...prev,
                  totalEvents: prev.totalEvents + 1,
                  volatilityIndex: calculateVolatility(state)
                }));
                break;

              case 'stats':
                if (message.data) {
                  setStats(message.data);
                }
                break;
            }
          } catch (error) {
            console.error('Failed to parse emotional message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('Emotional WebSocket error:', error);
        };

        ws.current.onclose = () => {
          console.log('Emotional WebSocket closed');
          setIsConnected(false);
          ws.current = null;

          // Reconnect after 3 seconds
          if (!isCleaningUp) {
            reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
          }
        };

      } catch (error) {
        console.error('Failed to connect to Emotional Broadcaster:', error);
        setIsLoading(false);

        // Retry after 3 seconds
        if (!isCleaningUp) {
          reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Start connection
    connectWebSocket();

    return () => {
      isCleaningUp = true;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  const calculateVolatility = (state: any): number => {
    // Simple volatility calculation based on emotional vectors
    const vectors = state.vectors || {};
    const frustration = vectors.frustration || 0;
    const anxiety = vectors.anxiety || 0;
    const urgency = vectors.urgency || 0;

    return Math.min(100, (frustration + anxiety + urgency) / 3 * 1.2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-purple-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Live Emotional Stream</h2>
          <p className="text-sm text-white/60 mt-1">Real-time emotions from behavior processor</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm text-white/60">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-white">{events.length}</div>
          <div className="text-xs text-white/60">Events</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">
            {stats.volatilityIndex ? stats.volatilityIndex.toFixed(0) : '0'}
          </div>
          <div className="text-xs text-white/60">Volatility</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-green-400">{stats.activeUsers || 0}</div>
          <div className="text-xs text-white/60">Active</div>
        </div>
      </div>

      {/* Event Feed */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/40"
            >
              <Brain className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-lg mb-2">Waiting for emotional events...</p>
              <p className="text-sm">Events will appear as users interact with your site</p>
            </motion.div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={`${event.sessionId}-${event.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  delay: Math.min(index * 0.05, 0.2)
                }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all border border-white/10 overflow-hidden"
              >
                {/* Emotion Badge */}
                <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${EMOTION_COLORS[event.emotion] || EMOTION_COLORS.default} shadow-lg`}>
                  <span className="text-xs font-semibold text-white">
                    {EMOTION_LABELS[event.emotion] || event.emotion}
                  </span>
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-white/60">
                      {event.sessionId.substring(0, 8)}...
                    </span>
                    <span className="text-white">
                      {event.confidence}% confidence
                    </span>
                    {event.pageUrl && (
                      <span className="text-white/40 text-xs truncate max-w-[200px] inline-block">
                        {new URL(event.pageUrl).pathname}
                      </span>
                    )}
                  </div>

                  {/* Emotional Vectors */}
                  {(event.frustration || event.anxiety || event.urgency) && (
                    <div className="flex gap-3 mt-1 text-xs text-white/40">
                      {event.frustration && event.frustration > 0 && <span>F: {event.frustration}%</span>}
                      {event.anxiety && event.anxiety > 0 && <span>A: {event.anxiety}%</span>}
                      {event.urgency && event.urgency > 0 && <span>U: {event.urgency}%</span>}
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
            Broadcast Point #1 • Emotional States • {events.length} events
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default EmotionalStream;