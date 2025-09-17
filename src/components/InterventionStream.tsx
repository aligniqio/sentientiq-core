/**
 * Intervention Stream Component
 * Dedicated WebSocket connection for intervention events
 * Broadcast Point #2: Real-time interventions from orchestrator
 */

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, AlertCircle, TrendingUp, Brain, Activity, MousePointer, Eye } from 'lucide-react';

interface InterventionEvent {
  id: string;
  sessionId: string;
  interventionType: string;
  emotion?: string;
  confidence?: number;
  priority?: string;
  timing?: string;
  reason?: string;
  timestamp: string;
}

interface InterventionStats {
  totalShown: number;
  totalConverted: number;
  activeInterventions: number;
  successRate: number;
}

const INTERVENTION_COLORS: Record<string, string> = {
  // Modal interventions
  'discount_modal': 'from-green-500/20 to-green-600/20 border-green-500/30',
  'cart_save_modal': 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  'exit_modal': 'from-red-500/20 to-red-600/20 border-red-500/30',
  'value_popup': 'from-purple-500/20 to-purple-600/20 border-purple-500/30',

  // Trust builders
  'trust_badges': 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  'success_stories': 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
  'money_back_guarantee': 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',

  // Urgency creators
  'urgency_banner': 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
  'save_cart_urgent': 'from-red-600/20 to-orange-600/20 border-orange-500/30',

  // Support
  'help_offer': 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30',
  'live_chat': 'from-blue-500/20 to-indigo-600/20 border-blue-500/30',

  // Comparison tools
  'comparison_chart': 'from-purple-500/20 to-pink-600/20 border-purple-500/30',

  // Payment options
  'payment_plan_offer': 'from-green-500/20 to-teal-600/20 border-green-500/30',
  'discount_offer': 'from-yellow-500/20 to-green-600/20 border-green-500/30',

  // Default
  'default': 'from-gray-500/20 to-gray-600/20 border-gray-500/30'
};

const INTERVENTION_LABELS: Record<string, string> = {
  'discount_modal': 'Discount Modal',
  'cart_save_modal': 'Save Cart',
  'exit_modal': 'Exit Intent',
  'value_popup': 'Value Proposition',
  'trust_badges': 'Trust Signals',
  'success_stories': 'Success Stories',
  'money_back_guarantee': 'Guarantee',
  'urgency_banner': 'Urgency Banner',
  'save_cart_urgent': 'Urgent Save',
  'help_offer': 'Help Offer',
  'live_chat': 'Live Chat',
  'comparison_chart': 'Comparison',
  'payment_plan_offer': 'Payment Plans',
  'discount_offer': 'Discount'
};

const InterventionStream = () => {
  const [interventions, setInterventions] = useState<InterventionEvent[]>([]);
  const [activeInterventions, setActiveInterventions] = useState<Map<string, InterventionEvent>>(new Map());
  const [stats, setStats] = useState<InterventionStats>({
    totalShown: 0,
    totalConverted: 0,
    activeInterventions: 0,
    successRate: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isCleaningUp = false;

    const connectWebSocket = () => {
      if (isCleaningUp) return;

      // Connect to intervention broadcaster on EC2
      const wsUrl = `ws://98.87.12.130:3004/ws/interventions`;

      console.log('Connecting to Intervention Broadcaster:', wsUrl);

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log('✅ Connected to Intervention Broadcaster');
          setIsConnected(true);
          setIsLoading(false);

          // Subscribe to intervention channel
          ws.current?.send(JSON.stringify({
            type: 'subscribe',
            channel: 'interventions'
          }));
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch(message.type) {
              case 'intervention_triggered':
                const intervention: InterventionEvent = {
                  id: `${message.sessionId}_${Date.now()}`,
                  sessionId: message.sessionId,
                  interventionType: message.interventionType,
                  emotion: message.emotion,
                  confidence: message.confidence,
                  priority: message.priority,
                  timing: message.timing,
                  reason: message.reason,
                  timestamp: message.timestamp || new Date().toISOString()
                };

                setInterventions(prev => [intervention, ...prev].slice(0, 50));

                // Track active intervention
                setActiveInterventions(prev => {
                  const next = new Map(prev);
                  next.set(intervention.sessionId, intervention);
                  return next;
                });

                // Update stats
                setStats(prev => ({
                  ...prev,
                  totalShown: prev.totalShown + 1,
                  activeInterventions: prev.activeInterventions + 1
                }));
                break;

              case 'intervention_completed':
                // Remove from active
                setActiveInterventions(prev => {
                  const next = new Map(prev);
                  next.delete(message.sessionId);
                  return next;
                });

                // Update stats based on result
                if (message.result === 'converted') {
                  setStats(prev => ({
                    ...prev,
                    totalConverted: prev.totalConverted + 1,
                    activeInterventions: Math.max(0, prev.activeInterventions - 1),
                    successRate: ((prev.totalConverted + 1) / prev.totalShown) * 100
                  }));
                } else {
                  setStats(prev => ({
                    ...prev,
                    activeInterventions: Math.max(0, prev.activeInterventions - 1)
                  }));
                }
                break;

              case 'stats':
                if (message.stats) {
                  setStats(message.stats);
                }
                break;
            }
          } catch (error) {
            console.error('Failed to parse intervention message:', error);
          }
        };

        ws.current.onerror = (error) => {
          console.error('Intervention WebSocket error:', error);
        };

        ws.current.onclose = () => {
          console.log('Intervention WebSocket closed');
          setIsConnected(false);
          ws.current = null;

          // Reconnect after 3 seconds
          if (!isCleaningUp) {
            reconnectTimeout.current = setTimeout(connectWebSocket, 3000);
          }
        };

      } catch (error) {
        console.error('Failed to connect to Intervention Broadcaster:', error);
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

  const getPriorityColor = (priority?: string): string => {
    switch(priority) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTimingIcon = (timing?: string) => {
    switch(timing) {
      case 'immediate': return <Zap className="w-3 h-3 text-red-400" />;
      case 'optimal': return <Target className="w-3 h-3 text-green-400" />;
      case 'delayed': return <Activity className="w-3 h-3 text-yellow-400" />;
      default: return <Brain className="w-3 h-3 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-green-500" />
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
          <h2 className="text-xl font-bold text-white">Live Intervention Stream</h2>
          <p className="text-sm text-white/60 mt-1">Real-time intervention decisions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-sm text-white/60">
            {isConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-xl font-bold text-white">{stats.totalShown}</div>
          <div className="text-xs text-white/60">Shown</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-xl font-bold text-green-400">{stats.totalConverted}</div>
          <div className="text-xs text-white/60">Converted</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-xl font-bold text-yellow-400">{activeInterventions.size}</div>
          <div className="text-xs text-white/60">Active</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-xl font-bold text-purple-400">
            {stats.successRate.toFixed(0)}%
          </div>
          <div className="text-xs text-white/60">Success</div>
        </div>
      </div>

      {/* Active Interventions */}
      {activeInterventions.size > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-green-400" />
            Active Interventions ({activeInterventions.size})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from(activeInterventions.values()).slice(0, 4).map(intervention => (
              <motion.div
                key={intervention.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-3 rounded-lg bg-gradient-to-r ${
                  INTERVENTION_COLORS[intervention.interventionType] || INTERVENTION_COLORS.default
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white">
                    {INTERVENTION_LABELS[intervention.interventionType] || intervention.interventionType}
                  </span>
                  <Zap className="w-4 h-4 text-green-400 animate-pulse" />
                </div>
                <div className="text-xs text-white/60">
                  Session: {intervention.sessionId.substring(0, 8)}...
                </div>
                {intervention.emotion && (
                  <div className="text-xs text-white/80 mt-1">
                    Triggered by: {intervention.emotion}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Intervention Feed */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {interventions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/40"
            >
              <Target className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-lg mb-2">Monitoring for interventions...</p>
              <p className="text-sm">Interventions will appear as they're triggered</p>
            </motion.div>
          ) : (
            interventions.map((intervention, index) => (
              <motion.div
                key={intervention.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.02 }}
                className={`flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r ${
                  INTERVENTION_COLORS[intervention.interventionType] || INTERVENTION_COLORS.default
                }`}
              >
                {/* Timing Icon */}
                <div className="p-2 rounded-lg bg-white/10">
                  {getTimingIcon(intervention.timing)}
                </div>

                {/* Intervention Type */}
                <div className="px-2 py-1 rounded-full bg-white/20">
                  <span className="text-xs font-bold text-white">
                    {INTERVENTION_LABELS[intervention.interventionType] || intervention.interventionType}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono text-white/60">
                      {intervention.sessionId.substring(0, 8)}...
                    </span>
                    {intervention.emotion && (
                      <span className="text-white/80">
                        {intervention.emotion}
                      </span>
                    )}
                    {intervention.confidence && (
                      <span className="text-white/60">
                        {intervention.confidence}%
                      </span>
                    )}
                    {intervention.priority && (
                      <span className={`font-semibold ${getPriorityColor(intervention.priority)}`}>
                        {intervention.priority}
                      </span>
                    )}
                  </div>
                  {intervention.reason && (
                    <div className="text-xs text-white/40 mt-1">
                      {intervention.reason}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-xs text-white/40">
                  {new Date(intervention.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {interventions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            Broadcast Point #2 • Interventions • {interventions.length} events
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default InterventionStream;