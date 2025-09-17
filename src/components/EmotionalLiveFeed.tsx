/**
 * Emotional Live Feed
 * Real-time emotional intelligence from actual websites
 * NO MOCK DATA - Only real emotions from real users
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/clerk-react';
import { Users, AlertCircle, Zap, Brain, Lightbulb, TrendingUp, Target, ArrowRight, MousePointer, Eye, Activity } from 'lucide-react';
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

interface InterventionEvent {
  id: string;
  timestamp: number;
  sessionId: string;
  type: 'behavior' | 'emotion' | 'decision' | 'intervention' | 'interaction';
  stage: 'telemetry' | 'processor' | 'engine' | 'websocket' | 'choreographer' | 'renderer';
  data: {
    event?: string;
    emotion?: string;
    confidence?: number;
    interventionType?: string;
    timing?: any;
    result?: 'shown' | 'clicked' | 'dismissed' | 'converted';
  };
  correlationId?: string;
}

interface InterventionMetrics {
  topInterventions: Array<{
    type: string;
    shown: number;
    clicked: number;
    converted: number;
    dismissed: number;
    effectiveness: number;
    clickRate: number;
    conversionRate: number;
  }>;
  topPatterns: Array<{
    pattern: string;
    triggered: number;
    successful: number;
    effectiveness: number;
  }>;
  totalShown: number;
  totalConverted: number;
  overallEffectiveness: number;
}

const EMOTION_COLORS: Record<string, string> = {
  // RED gradients - Critical states (High Risk)
  rage: 'from-red-600 to-red-700',
  rage_click: 'from-red-500 to-red-600',
  abandonment: 'from-red-700 to-red-800',
  abandonment_intent: 'from-red-600 to-red-700',
  abandonment_risk: 'from-red-500 to-red-600',
  abandonment_warning: 'from-red-600 to-red-700',
  frustration: 'from-red-400 to-red-500',
  cart_shock: 'from-red-500 to-red-600',
  cart_abandonment: 'from-red-600 to-red-700',
  financial_anxiety: 'from-red-500 to-orange-600',
  comparison_shopping: 'from-red-400 to-orange-500',

  // YELLOW gradients - Caution states (Medium Risk)
  hesitation: 'from-yellow-500 to-amber-500',
  confusion: 'from-yellow-400 to-yellow-500',
  anxiety: 'from-amber-500 to-orange-500',
  skepticism: 'from-yellow-500 to-amber-600',
  sticker_shock: 'from-amber-500 to-orange-600',
  price_shock: 'from-yellow-500 to-amber-600',
  price_hesitation: 'from-yellow-400 to-amber-500',
  price_paralysis: 'from-amber-600 to-orange-600',
  trust_hesitation: 'from-yellow-500 to-amber-500',
  seeking_validation: 'from-yellow-400 to-amber-400',
  distracted: 'from-yellow-300 to-amber-400',
  idle: 'from-amber-300 to-yellow-400',

  // GREEN gradients - Positive states (Good Intent)
  confidence: 'from-green-500 to-emerald-600',
  confident_user: 'from-green-600 to-emerald-700',
  curiosity: 'from-emerald-500 to-green-600',
  delight: 'from-green-400 to-emerald-500',
  interest: 'from-green-600 to-emerald-700',
  engagement: 'from-emerald-500 to-teal-600',
  engaged: 'from-green-500 to-emerald-600',
  purchase_intent: 'from-green-600 to-green-700',
  strong_purchase_intent: 'from-green-700 to-green-800',
  checkout_intent: 'from-green-600 to-emerald-700',
  demo_interest: 'from-emerald-500 to-teal-600',
  demo_activation: 'from-green-600 to-teal-700',
  intrigue: 'from-emerald-400 to-green-500',

  // BLUE gradients - Information seeking (Low Risk)
  reading: 'from-blue-400 to-blue-500',
  deep_reading: 'from-blue-500 to-indigo-600',
  browsing: 'from-blue-300 to-blue-400',
  scanning: 'from-sky-400 to-blue-500',
  exploring: 'from-blue-400 to-indigo-500',
  information_gathering: 'from-blue-500 to-indigo-600',
  reference_checking: 'from-sky-500 to-blue-600',

  // PURPLE gradients - High value states
  tier_comparison: 'from-purple-500 to-indigo-600',
  price_evaluation: 'from-purple-400 to-indigo-500',
  price_consideration: 'from-purple-500 to-pink-600',
  form_engagement: 'from-purple-400 to-indigo-500',
  signup_intent: 'from-purple-600 to-indigo-700',

  // GRAY - Neutral/Unknown
  normal: 'from-gray-500 to-gray-600',
  noticing: 'from-gray-400 to-gray-500',
  re_engaged: 'from-gray-500 to-blue-500',
  returning_visitor: 'from-gray-400 to-blue-400',

  // Default fallback
  default: 'from-gray-400 to-gray-500'
};

const EMOTION_LABELS: Record<string, string> = {
  // Critical states (RED)
  rage: 'Rage Click',
  rage_click: 'Rage Click',
  abandonment: 'Abandoning',
  abandonment_intent: 'Exit Intent',
  abandonment_risk: 'Exit Risk',
  abandonment_warning: 'Exit Warning',
  frustration: 'Frustrated',
  cart_shock: 'Cart Shock',
  cart_abandonment: 'Cart Abandon',
  cart_hesitation: 'Cart Hesitation',
  financial_anxiety: 'Price Anxiety',
  comparison_shopping: 'Comparing',

  // Caution states (YELLOW)
  hesitation: 'Hesitating',
  confusion: 'Confused',
  anxiety: 'Anxious',
  skepticism: 'Skeptical',
  sticker_shock: 'Price Shock',
  price_shock: 'Price Shock',
  price_hesitation: 'Price Hesitation',
  price_paralysis: 'Price Paralysis',
  trust_hesitation: 'Trust Issues',
  seeking_validation: 'Validating',
  distracted: 'Distracted',
  idle: 'Idle',

  // Positive states (GREEN)
  confidence: 'Confident',
  confident_user: 'Confident User',
  curiosity: 'Curious',
  delight: 'Delighted',
  interest: 'Interested',
  engagement: 'Engaged',
  engaged: 'Engaged',
  purchase_intent: 'Purchase Intent',
  strong_purchase_intent: 'Strong Intent',
  checkout_intent: 'Checkout Ready',
  demo_interest: 'Demo Interest',
  demo_activation: 'Demo Active',
  intrigue: 'Intrigued',

  // Information seeking (BLUE)
  reading: 'Reading',
  deep_reading: 'Deep Reading',
  browsing: 'Browsing',
  scanning: 'Scanning',
  exploring: 'Exploring',
  information_gathering: 'Researching',
  reference_checking: 'Checking Refs',

  // High value states (PURPLE)
  tier_comparison: 'Comparing Tiers',
  price_evaluation: 'Evaluating Price',
  price_consideration: 'Considering',
  form_engagement: 'Form Active',
  signup_intent: 'Signup Intent',

  // Neutral (GRAY)
  normal: 'Normal',
  noticing: 'Noticing',
  re_engaged: 'Re-engaged',
  returning_visitor: 'Returning',

  // Default
  default: 'Unknown'
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
  const [interventionMetrics, setInterventionMetrics] = useState<InterventionMetrics | null>(null);
  const [interventionEvents, setInterventionEvents] = useState<InterventionEvent[]>([]);
  const [activeInterventions, setActiveInterventions] = useState<Map<string, any>>(new Map());
  const pollingInterval = useRef<NodeJS.Timeout>();
  const ws = useRef<WebSocket | null>(null);
  const interventionWs = useRef<WebSocket | null>(null);

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
            } else if (data.type === 'intervention_metrics') {
              // Update intervention effectiveness metrics
              setInterventionMetrics(data.metrics);
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

  // Connect to Intervention WebSocket
  useEffect(() => {
    if (!user) return;

    const connectInterventionWs = () => {
      const tenantId = user.id || 'demo';
      const sessionId = `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const wsUrl = `wss://api.sentientiq.app/ws?channel=interventions&tenant_id=${tenantId}&session=${sessionId}`;

      console.log('Connecting to intervention WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Intervention WebSocket connected successfully');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Intervention WebSocket message received:', data.type);
          handleIncomingInterventionEvent(data);
        } catch (e) {
          console.error('Failed to parse intervention message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('Intervention WebSocket error event:', error);
        console.log('WebSocket readyState:', ws.readyState);
        console.log('WebSocket URL:', wsUrl);
      };

      ws.onclose = (event) => {
        console.log(`Intervention WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        // Reconnect after 3 seconds
        setTimeout(connectInterventionWs, 3000);
      };

      interventionWs.current = ws;
    };

    const handleIncomingInterventionEvent = (data: any) => {
      // Handle pipeline events
      if (data.type === 'pipeline_event') {
        const event: InterventionEvent = {
          id: `${data.sessionId || 'unknown'}_${Date.now()}`,
          timestamp: data.timestamp || Date.now(),
          sessionId: data.sessionId || data.session_id,
          type: mapInterventionEventType(data.payload?.behavior || data.payload?.interventionType || data.stage),
          stage: data.stage as InterventionEvent['stage'],
          data: data.payload || {},
          correlationId: data.correlationId
        };

        setInterventionEvents(prev => [event, ...prev].slice(0, 50));
        return;
      }

      // Handle intervention events
      if (data.type === 'intervention_event') {
        const event: InterventionEvent = {
          id: `${data.sessionId || 'unknown'}_${Date.now()}`,
          timestamp: Date.now(),
          sessionId: data.sessionId || data.session_id,
          type: 'intervention',
          stage: 'engine',
          data: data.payload || data,
          correlationId: data.correlationId
        };

        setInterventionEvents(prev => [event, ...prev].slice(0, 50));
        setActiveInterventions(prev => {
          const next = new Map(prev);
          next.set(event.sessionId, event);
          return next;
        });
        return;
      }

      // Handle legacy events
      const event: InterventionEvent = {
        id: `${data.sessionId || 'unknown'}_${Date.now()}`,
        timestamp: Date.now(),
        sessionId: data.sessionId || data.session_id,
        type: mapInterventionEventType(data.type),
        stage: mapInterventionEventStage(data.component || data.type),
        data: data.payload || data,
        correlationId: data.correlationId
      };

      setInterventionEvents(prev => [event, ...prev].slice(0, 50));

      // Track active interventions
      if (event.type === 'intervention') {
        setActiveInterventions(prev => {
          const next = new Map(prev);
          next.set(event.sessionId, event);
          return next;
        });
      }

      if (event.data.result === 'converted' || event.data.result === 'dismissed') {
        setActiveInterventions(prev => {
          const next = new Map(prev);
          next.delete(event.sessionId);
          return next;
        });
      }
    };

    const mapInterventionEventType = (type: string): InterventionEvent['type'] => {
      if (type?.includes('behavior')) return 'behavior';
      if (type?.includes('emotion')) return 'emotion';
      if (type?.includes('decision')) return 'decision';
      if (type?.includes('interaction')) return 'interaction';
      if (type?.includes('intervention')) return 'intervention';
      return 'behavior';
    };

    const mapInterventionEventStage = (component: string): InterventionEvent['stage'] => {
      if (component?.includes('telemetry')) return 'telemetry';
      if (component?.includes('processor')) return 'processor';
      if (component?.includes('engine')) return 'engine';
      if (component?.includes('websocket')) return 'websocket';
      if (component?.includes('choreographer')) return 'choreographer';
      if (component?.includes('renderer')) return 'renderer';
      return 'telemetry';
    };

    connectInterventionWs();

    return () => {
      if (interventionWs.current) {
        interventionWs.current.close();
      }
    };
  }, [user]);

  // Helper functions for intervention events
  const getInterventionEventColor = (type: InterventionEvent['type']) => {
    switch (type) {
      case 'behavior': return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'emotion': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'decision': return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'intervention': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'interaction': return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const getStageIcon = (stage: InterventionEvent['stage']) => {
    switch (stage) {
      case 'telemetry': return <MousePointer className="w-4 h-4 text-blue-400" />;
      case 'processor': return <Brain className="w-4 h-4 text-purple-400" />;
      case 'engine': return <Activity className="w-4 h-4 text-yellow-400" />;
      case 'websocket': return <Zap className="w-4 h-4 text-green-400" />;
      case 'choreographer': return <Eye className="w-4 h-4 text-pink-400" />;
      case 'renderer': return <Target className="w-4 h-4 text-cyan-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

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
      <div className="w-full flex gap-4 mb-8">
        {/* Emotional Volatility Index */}
        <div className="flex-1">
          <EVIDisplay
            value={stats.volatilityIndex || 50}
            trend={stats.volatilityIndex && stats.volatilityIndex > 60 ? 'up' : stats.volatilityIndex && stats.volatilityIndex < 40 ? 'down' : 'stable'}
            className="w-full"
          />
        </div>

        {/* Active Users Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-6 flex flex-col items-center justify-center min-w-[200px]"
        >
          <Users className="w-8 h-8 text-purple-400 mb-3" />
          <div className="text-3xl font-bold text-white">{stats.activeUsers}</div>
          <div className="text-sm text-white/60 mt-1">Active Now</div>
          <div className="mt-2 text-xs text-green-400 animate-pulse">● LIVE</div>
        </motion.div>
      </div>


      {/* Intervention Effectiveness Dashboard */}
      {interventionMetrics && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Intervention Performance</h2>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white/60">Live Effectiveness</span>
            </div>
          </div>

          {/* Overall Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-white">{interventionMetrics.totalShown}</div>
              <div className="text-xs text-white/60 mt-1">Interventions Shown</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-green-400">{interventionMetrics.totalConverted}</div>
              <div className="text-xs text-white/60 mt-1">Conversions</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-purple-400">
                {interventionMetrics.overallEffectiveness.toFixed(1)}%
              </div>
              <div className="text-xs text-white/60 mt-1">Overall Effectiveness</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-2xl font-bold text-blue-400">
                {interventionMetrics.totalShown > 0
                  ? ((interventionMetrics.totalConverted / interventionMetrics.totalShown) * 100).toFixed(1)
                  : '0'}%
              </div>
              <div className="text-xs text-white/60 mt-1">Conversion Rate</div>
            </div>
          </div>

          {/* Top Performing Interventions */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                Top Performing Interventions
              </h3>
              <div className="space-y-2">
                {interventionMetrics.topInterventions.length > 0 ? (
                  interventionMetrics.topInterventions.map((intervention) => (
                    <div
                      key={intervention.type}
                      className="p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {intervention.type.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          intervention.effectiveness > 70
                            ? 'bg-green-500/20 text-green-400'
                            : intervention.effectiveness > 40
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {intervention.effectiveness.toFixed(0)}% effective
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-white/40">Shown:</span>
                          <span className="text-white ml-1">{intervention.shown}</span>
                        </div>
                        <div>
                          <span className="text-white/40">Clicked:</span>
                          <span className="text-green-400 ml-1">{intervention.clickRate.toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-white/40">Converted:</span>
                          <span className="text-purple-400 ml-1">{intervention.conversionRate.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-white/40">
                    <p className="text-sm">No intervention data yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Patterns */}
            <div>
              <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                Most Effective Patterns
              </h3>
              <div className="space-y-2">
                {interventionMetrics.topPatterns.length > 0 ? (
                  interventionMetrics.topPatterns.map((pattern) => (
                    <div
                      key={pattern.pattern}
                      className="p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {pattern.pattern.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())}
                        </span>
                        <span className="text-xs text-white/60">
                          {pattern.triggered} triggers
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                            style={{ width: `${pattern.effectiveness}%` }}
                          />
                        </div>
                        <span className="text-xs text-white/60">
                          {pattern.successful}/{pattern.triggered} successful
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-white/40">
                    <p className="text-sm">Pattern learning in progress...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Intervention Intelligence Flow - Real-time Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 mt-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Intelligence Flow Architecture</h2>
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white/60">Real-time Choreography</span>
          </div>
        </div>

        {/* Flow Pipeline */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { name: 'Telemetry', icon: MousePointer, color: 'from-blue-500 to-blue-600', count: interventionEvents.filter(e => e.stage === 'telemetry').length },
            { name: 'Processor', icon: Brain, color: 'from-purple-500 to-purple-600', count: interventionEvents.filter(e => e.stage === 'processor').length },
            { name: 'Engine', icon: Zap, color: 'from-orange-500 to-orange-600', count: interventionEvents.filter(e => e.stage === 'engine').length },
            { name: 'WebSocket', icon: Activity, color: 'from-green-500 to-green-600', count: interventionEvents.filter(e => e.stage === 'websocket').length },
            { name: 'Choreographer', icon: Eye, color: 'from-pink-500 to-pink-600', count: interventionEvents.filter(e => e.stage === 'choreographer').length },
            { name: 'Renderer', icon: Target, color: 'from-yellow-500 to-yellow-600', count: interventionEvents.filter(e => e.stage === 'renderer').length }
          ].map((stage, index) => {
            const Icon = stage.icon;
            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-xl bg-gradient-to-br ${stage.color} bg-opacity-20 backdrop-blur-md border border-white/20 relative`}
              >
                <Icon className="w-6 h-6 mb-2 text-white" />
                <div className="text-xs font-medium text-white">{stage.name}</div>
                <div className="text-lg font-bold text-white">{stage.count}</div>
                {stage.count > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Real Data Flow Examples */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-semibold text-white/80">Recent Intervention Paths</h3>
          {interventionEvents
            .filter(e => e.type === 'intervention' && e.data.interventionType)
            .slice(0, 3)
            .map((event, idx) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="p-3 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10"
              >
                <div className="text-xs font-mono text-blue-400 mb-1">
                  {event.data.event || 'behavior'} → {event.data.emotion || 'detected'} → {event.data.interventionType || 'intervention'} → {event.data.result || 'processing'}
                </div>
                <div className="text-xs text-gray-400">
                  Session {event.sessionId.substring(0, 8)} • {new Date(event.timestamp).toLocaleTimeString()}
                  {event.data.confidence && ` • ${event.data.confidence.toFixed(0)}% confidence`}
                </div>
              </motion.div>
            ))
          }
          {interventionEvents.filter(e => e.type === 'intervention').length === 0 && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="text-xs text-gray-400">Waiting for intervention data...</div>
            </div>
          )}
        </div>

        {/* Live Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Active Sessions',
              value: activeInterventions.size.toString(),
              color: activeInterventions.size > 0 ? 'text-green-400' : 'text-white'
            },
            {
              label: 'Events/Min',
              value: Math.round(interventionEvents.filter(e =>
                Date.now() - e.timestamp < 60000
              ).length).toString(),
              color: 'text-blue-400'
            },
            {
              label: 'Success Rate',
              value: interventionEvents.length > 0
                ? `${Math.round(interventionEvents.filter(e => e.data.result === 'converted').length / interventionEvents.length * 100)}%`
                : '—',
              color: 'text-purple-400'
            },
            {
              label: 'Avg Latency',
              value: interventionEvents.length > 0
                ? (() => {
                    const recentEvents = interventionEvents.slice(0, 10);
                    const latencies = recentEvents.map(e => {
                      const prevEvent = interventionEvents.find(
                        pe => pe.correlationId === e.correlationId && pe.timestamp < e.timestamp
                      );
                      return prevEvent ? e.timestamp - prevEvent.timestamp : 100;
                    });
                    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
                    return `${Math.round(avgLatency)}ms`;
                  })()
                : '—',
              color: 'text-yellow-400'
            }
          ].map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20"
            >
              <div className="text-xs text-gray-400 mb-1">{metric.label}</div>
              <div className={`text-xl font-bold ${metric.color}`}>{metric.value}</div>
            </motion.div>
          ))}
        </div>
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
                  <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${EMOTION_COLORS[event.emotion] || EMOTION_COLORS.default} shadow-lg`}>
                    <span className="text-xs font-semibold text-white drop-shadow">
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

      {/* Active Interventions - Matching the Live Emotional Feed styling */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6 mt-8"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Active Interventions</h2>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white/60">Live Monitoring</span>
          </div>
        </div>

        {/* Active Intervention Cards */}
        {activeInterventions.size > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Array.from(activeInterventions.values()).slice(0, 6).map(intervention => (
              <motion.div
                key={intervention.sessionId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-md border border-green-500/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-green-400">
                    {intervention.sessionId.substring(0, 8)}...
                  </span>
                  <Zap className="w-4 h-4 text-green-400 animate-pulse" />
                </div>
                <div className="text-lg font-medium text-white">
                  {intervention.data.interventionType || 'Unknown'}
                </div>
                <div className="text-sm text-gray-400">
                  {intervention.data.emotion && `Emotion: ${intervention.data.emotion}`}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Intelligence Stream */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white/80 mb-3">Intelligence Stream</h3>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {interventionEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-white/40"
              >
                <Brain className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <p className="text-lg mb-2">Monitoring behavioral patterns...</p>
                <p className="text-sm">
                  Interventions will appear here as they're triggered by user behavior
                </p>
              </motion.div>
            ) : (
              interventionEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r ${getInterventionEventColor(event.type)} backdrop-blur-md border`}
                >
                  {/* Stage Icon */}
                  <div className="p-2 rounded-lg bg-white/10">
                    {getStageIcon(event.stage)}
                  </div>

                  {/* Event Details */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white/80 capitalize">{event.stage}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-bold text-white capitalize">{event.type}</span>
                      {event.correlationId && (
                        <span className="text-xs font-mono text-gray-400">
                          [{event.correlationId.substring(0, 8)}]
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-300 mt-1">
                      {event.data.event && <span>Event: {event.data.event} </span>}
                      {event.data.emotion && <span>Emotion: {event.data.emotion} ({event.data.confidence?.toFixed(2)}) </span>}
                      {event.data.interventionType && <span>Intervention: {event.data.interventionType} </span>}
                      {event.data.result && <span className="font-bold text-yellow-400">{event.data.result}</span>}
                    </div>
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

        {interventionEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-white/40">
              Showing last {interventionEvents.length} intervention events • Real-time choreography
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
};

export default EmotionalLiveFeed;