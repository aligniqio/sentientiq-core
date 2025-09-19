/**
 * Emotional Stream Component
 * Dedicated WebSocket connection for emotional states
 * Broadcast Point #1: Real-time emotions from behavior processor
 */

import { useEffect, useState, useRef, useCallback } from 'react';
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
  // Critical - EXIT/ABANDON (DARK RED)
  abandonment_intent: 'from-red-600 to-red-700',
  exit_risk: 'from-red-600 to-red-700',
  cart_abandonment: 'from-red-600 to-red-700',
  rage: 'from-red-600 to-red-700',

  // High Risk (RED)
  frustration: 'from-red-500 to-red-600',
  cart_shock: 'from-red-500 to-red-600',
  anger: 'from-red-500 to-red-600',

  // Price Sensitivity (ORANGE-RED)
  price_shock: 'from-orange-500 to-red-500',
  sticker_shock: 'from-orange-500 to-red-500',
  price_hesitation: 'from-orange-400 to-orange-500',

  // Caution/Uncertainty (YELLOW)
  confusion: 'from-yellow-500 to-amber-500',
  hesitation: 'from-yellow-400 to-yellow-500',
  skeptical: 'from-yellow-500 to-amber-600',
  trust_hesitation: 'from-yellow-500 to-amber-500',
  cart_hesitation: 'from-amber-400 to-yellow-500',

  // Neutral/Exploring (BLUE)
  evaluation: 'from-blue-400 to-blue-500',
  comparison_shopping: 'from-blue-500 to-indigo-600',
  searching: 'from-blue-400 to-indigo-500',
  exploration: 'from-blue-300 to-blue-400',
  lost: 'from-indigo-400 to-indigo-500',

  // Positive Engagement (LIGHT GREEN)
  interest: 'from-green-300 to-green-400',
  curiosity: 'from-green-300 to-green-400',
  scanning: 'from-green-200 to-green-300',
  reading: 'from-green-200 to-green-300',

  // Purchase Signals (DARK GREEN)
  confidence: 'from-green-500 to-emerald-600',
  purchase_intent: 'from-green-600 to-green-700',
  excitement: 'from-green-500 to-emerald-600',
  delight: 'from-green-400 to-emerald-500',
  trust_building: 'from-green-400 to-green-500',

  // Anxiety States (PURPLE)
  anxiety: 'from-purple-400 to-purple-500',
  cart_review: 'from-purple-300 to-purple-400',

  // Default
  default: 'from-gray-400 to-gray-500'
};

const EMOTION_LABELS: Record<string, string> = {
  // Critical
  abandonment_intent: 'ABANDONMENT INTENT',
  exit_risk: 'EXIT RISK',
  cart_abandonment: 'CART ABANDONMENT',
  rage: 'RAGE',

  // High Risk
  frustration: 'FRUSTRATION',
  cart_shock: 'CART SHOCK',
  anger: 'ANGER',

  // Price Sensitivity
  price_shock: 'PRICE SHOCK',
  sticker_shock: 'STICKER SHOCK',
  price_hesitation: 'PRICE HESITATION',

  // Caution
  confusion: 'CONFUSION',
  hesitation: 'HESITATION',
  skeptical: 'SKEPTICAL',
  trust_hesitation: 'TRUST HESITATION',
  cart_hesitation: 'CART HESITATION',

  // Exploring
  evaluation: 'EVALUATION',
  comparison_shopping: 'COMPARISON SHOPPING',
  searching: 'SEARCHING',
  exploration: 'EXPLORATION',
  lost: 'LOST',

  // Positive Engagement
  interest: 'INTEREST',
  curiosity: 'CURIOSITY',
  scanning: 'SCANNING',
  reading: 'READING',

  // Purchase Signals
  confidence: 'CONFIDENCE',
  purchase_intent: 'PURCHASE INTENT',
  excitement: 'EXCITEMENT',
  delight: 'DELIGHT',
  trust_building: 'TRUST BUILDING',

  // Anxiety
  anxiety: 'ANXIETY',
  cart_review: 'CART REVIEW',

  default: 'UNKNOWN'
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
  const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<{messages: number, errors: number}>({messages: 0, errors: 0});
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const eventQueue = useRef<EmotionalEvent[]>([]);
  const batchTimeout = useRef<NodeJS.Timeout>();
  const lastFlushTime = useRef<number>(Date.now());
  const reconnectAttempts = useRef<number>(0);
  const heartbeatInterval = useRef<NodeJS.Timeout>();

  // Clear all events and reset
  const flushEvents = useCallback(() => {
    console.log('Flushing events - queue size:', eventQueue.current.length, 'displayed:', events.length);
    eventQueue.current = [];
    setEvents([]);
    if (batchTimeout.current) {
      clearTimeout(batchTimeout.current);
      batchTimeout.current = undefined;
    }
    lastFlushTime.current = Date.now();
  }, [events.length]);

  // Batch process queued events with dynamic throttling
  const processBatch = useCallback(() => {
    // Auto-flush if queue is too large
    if (eventQueue.current.length > 50) {
      console.log('Queue overflow - auto-flushing');
      flushEvents();
      return;
    }

    if (eventQueue.current.length > 0) {
      // Dynamic batch size based on queue pressure
      const batchSize = eventQueue.current.length > 20 ? 1 :
                       eventQueue.current.length > 10 ? 2 : 3;

      const batch = eventQueue.current.splice(0, batchSize);
      setEvents(prev => {
        // Auto-flush if display is overwhelmed
        if (prev.length > 30) {
          console.log('Display overflow - auto-flushing');
          flushEvents();
          return [];
        }
        const newEvents = [...batch, ...prev].slice(0, 30);
        return newEvents;
      });
    }
  }, [flushEvents]);

  useEffect(() => {
    let isCleaningUp = false;

    const connectWebSocket = () => {
      if (isCleaningUp) return;

      // Prevent multiple simultaneous connections
      if (ws.current?.readyState === WebSocket.CONNECTING ||
          ws.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connecting or connected, skipping...');
        return;
      }

      // Connect to emotional broadcaster via secure proxy
      const wsUrl = `wss://api.sentientiq.app/ws/emotions`;

      console.log('Connecting to Emotional Broadcaster:', wsUrl);
      setConnectionStatus(`Connecting to ${wsUrl}...`);

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ Connected to Emotional Broadcaster');
          setIsConnected(true);
          setIsLoading(false);
          setConnectionStatus('Connected - Subscribing to events...');
          reconnectAttempts.current = 0;

          // Delay subscription slightly to ensure connection is stable
          setTimeout(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              // Subscribe to all emotions (no filter)
              const subscribeMsg = {
                type: 'subscribe',
                tenant: null,
                filter: null
              };
              console.log('Sending subscription:', subscribeMsg);
              ws.current.send(JSON.stringify(subscribeMsg));
            }
          }, 100); // Small delay to let connection stabilize

          // Start heartbeat to keep connection alive
          if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
          }
          heartbeatInterval.current = setInterval(() => {
            if (ws.current?.readyState === WebSocket.OPEN) {
              ws.current.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000); // Send ping every 30 seconds
        };

        ws.current.onmessage = (event) => {
          console.log('Raw WebSocket message:', event.data); // Log immediately

          // Defer ALL processing to next tick to keep handler fast
          setTimeout(() => {
            try {
              setDebugInfo(prev => ({...prev, messages: prev.messages + 1}));
              const message = JSON.parse(event.data);
              console.log('Received message type:', message.type, message);

              switch(message.type) {
                case 'connection':
                  console.log('Connection established:', message.connectionId);
                  setConnectionStatus(`Connected: ${message.connectionId}`);
                  break;

                case 'subscribed':
                  console.log('Subscription confirmed');
                  setConnectionStatus('Subscribed - Waiting for events...');
                  // Keep the connection alive - don't close or reconnect
                  break;

                case 'emotional_state':
                  setLastEventTime(new Date());
                  setConnectionStatus('Receiving emotional events');

                  // Enhanced rate limiting with adaptive throttling
                  const now = Date.now();
                  const timeSinceFlush = now - lastFlushTime.current;

                  // Skip events immediately after flush (grace period)
                  if (timeSinceFlush < 100) {
                    return;
                  }

                  // Dynamic queue limit based on processing state
                  const queueLimit = timeSinceFlush > 5000 ? 50 : 30;
                  if (eventQueue.current.length >= queueLimit) {
                    console.log(`Queue at limit (${eventQueue.current.length}/${queueLimit}), dropping event`);
                    return;
                  }

                  const state = message.data;

                  // Simple push to queue - no object creation if we're overwhelmed
                  eventQueue.current.push({
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
                  });

                  // Dynamic batch timing based on queue pressure
                  if (!batchTimeout.current) {
                    const delay = eventQueue.current.length > 20 ? 50 :
                                 eventQueue.current.length > 10 ? 100 : 150;

                    batchTimeout.current = setTimeout(() => {
                      batchTimeout.current = undefined;
                      processBatch();
                    }, delay);
                  }
                  break;

                case 'stats':
                  if (message.data) {
                    // Calculate volatility from aggregated stats
                    const volatility = message.data.volatilityIndex ||
                      (message.data.averageFrustration || 0) * 0.4 +
                      (message.data.averageAnxiety || 0) * 0.3 +
                      (message.data.averageUrgency || 0) * 0.3;

                    setStats({
                      ...message.data,
                      volatilityIndex: Math.min(100, volatility)
                    });
                  }
                  break;
              }
            } catch (error) {
              console.error('Error processing message:', error);
              setDebugInfo(prev => ({...prev, errors: prev.errors + 1}));
            }
          }, 0);
        };

        ws.current.onerror = (error) => {
          console.error('Emotional WebSocket error:', error);
          setConnectionStatus('Connection error');
          setDebugInfo(prev => ({...prev, errors: prev.errors + 1}));
        };

        ws.current.onclose = (event) => {
          console.log('Emotional WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          ws.current = null;
          reconnectAttempts.current++;

          // Clear heartbeat
          if (heartbeatInterval.current) {
            clearInterval(heartbeatInterval.current);
          }

          const backoffTime = Math.min(3000 * Math.pow(1.5, reconnectAttempts.current), 30000);
          setConnectionStatus(`Disconnected - Reconnecting in ${Math.round(backoffTime/1000)}s (attempt ${reconnectAttempts.current})`);

          // Reconnect with exponential backoff
          if (!isCleaningUp) {
            reconnectTimeout.current = setTimeout(connectWebSocket, backoffTime);
          }
        };

      } catch (error) {
        console.error('Failed to connect to Emotional Broadcaster:', error);
        setIsLoading(false);
        setConnectionStatus('Failed to connect - Retrying...');
        reconnectAttempts.current++;

        // Retry with exponential backoff
        const backoffTime = Math.min(3000 * Math.pow(1.5, reconnectAttempts.current), 30000);
        if (!isCleaningUp) {
          reconnectTimeout.current = setTimeout(connectWebSocket, backoffTime);
        }
      }
    };

    // Start connection
    connectWebSocket();

    return () => {
      console.log('EmotionalStream cleanup - closing WebSocket');
      isCleaningUp = true;

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }

      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
      }

      if (ws.current) {
        ws.current.close(1000, 'Component unmounting');
        ws.current = null;
      }
    };
  }, [processBatch]);


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
        <div className="flex items-center gap-4">
          {events.length > 10 && (
            <button
              onClick={flushEvents}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
            >
              Clear ({events.length})
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-white/60">
              {connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Debug Info Bar */}
      <div className="mb-4 p-3 bg-black/20 rounded-lg border border-white/10">
        <div className="text-xs text-white/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Pipeline Health:</span>
              <span>Messages: {debugInfo.messages}</span>
              <span className={debugInfo.errors > 0 ? 'text-red-400' : ''}>Errors: {debugInfo.errors}</span>
              <span className={eventQueue.current.length > 20 ? 'text-yellow-400' : ''}>Queue: {eventQueue.current.length}</span>
            </div>
            {lastEventTime && (
              <span className={new Date().getTime() - lastEventTime.getTime() > 30000 ? 'text-yellow-400' : 'text-green-400'}>
                Last Event: {lastEventTime.toLocaleTimeString()}
                {new Date().getTime() - lastEventTime.getTime() > 30000 && ' (stale!)'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span>Endpoint: wss://api.sentientiq.app/ws/emotions</span>
            <span>Reconnect Attempts: {reconnectAttempts.current}</span>
          </div>
          {!isConnected && debugInfo.messages === 0 && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded">
              <span className="text-red-400">⚠️ No data received. Check: telemetry script → gateway → processor → Redis → broadcaster</span>
            </div>
          )}
          {isConnected && debugInfo.messages > 0 && events.length === 0 && (
            <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
              <span className="text-yellow-400">⚠️ Connected but no emotional events. Check behavior processor and Redis pub/sub.</span>
            </div>
          )}
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
        <AnimatePresence>
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10 overflow-hidden"
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