/**
 * Intervention Dashboard Component
 * The crystal palace of marketing truth
 * Where the magic becomes visible
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Zap,
  Eye,
  MousePointer,
  TrendingUp,
  Activity,
  Layers,
  GitBranch,
  Sparkles,
  ArrowRight
} from 'lucide-react';

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

export const InterventionDashboard: React.FC = () => {
  const [events, setEvents] = useState<InterventionEvent[]>([]);
  const [activeInterventions, setActiveInterventions] = useState<Map<string, any>>(new Map());
  const [showFlowViz, setShowFlowViz] = useState(false);
  const [flowIconPressed, setFlowIconPressed] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const connectWebSocket = () => {
    const ws = new WebSocket('wss://api.sentientiq.app/ws?channel=interventions');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleIncomingEvent(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  };

  const handleIncomingEvent = (data: any) => {
    const event: InterventionEvent = {
      id: `${data.sessionId || 'unknown'}_${Date.now()}`,
      timestamp: Date.now(),
      sessionId: data.sessionId || data.session_id,
      type: mapEventType(data.type),
      stage: mapEventStage(data.component || data.type),
      data: data.payload || data,
      correlationId: data.correlationId
    };

    setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100

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

  const mapEventType = (type: string): InterventionEvent['type'] => {
    if (type.includes('behavior') || type.includes('hover') || type.includes('click')) return 'behavior';
    if (type.includes('emotion') || type.includes('frustration')) return 'emotion';
    if (type.includes('decision') || type.includes('pattern')) return 'decision';
    if (type.includes('intervention') || type.includes('trigger')) return 'intervention';
    if (type.includes('interaction') || type.includes('conversion')) return 'interaction';
    return 'behavior';
  };

  const mapEventStage = (component: string): InterventionEvent['stage'] => {
    if (component.includes('telemetry')) return 'telemetry';
    if (component.includes('processor')) return 'processor';
    if (component.includes('engine')) return 'engine';
    if (component.includes('websocket')) return 'websocket';
    if (component.includes('choreographer')) return 'choreographer';
    if (component.includes('renderer')) return 'renderer';
    return 'telemetry';
  };

  const getStageIcon = (stage: InterventionEvent['stage']) => {
    switch (stage) {
      case 'telemetry': return <MousePointer className="w-4 h-4" />;
      case 'processor': return <Brain className="w-4 h-4" />;
      case 'engine': return <Zap className="w-4 h-4" />;
      case 'websocket': return <Activity className="w-4 h-4" />;
      case 'choreographer': return <Eye className="w-4 h-4" />;
      case 'renderer': return <Sparkles className="w-4 h-4" />;
      default: return <Layers className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: InterventionEvent['type']) => {
    switch (type) {
      case 'behavior': return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
      case 'emotion': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'decision': return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'intervention': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'interaction': return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/30';
    }
  };

  const handleFlowIconMouseDown = () => {
    setFlowIconPressed(true);
    longPressTimer.current = setTimeout(() => {
      setShowFlowViz(true);
      setFlowIconPressed(false);
    }, 1000); // 1 second long press
  };

  const handleFlowIconMouseUp = () => {
    setFlowIconPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <>
      {/* Flow Visualization Icon (Easter Egg) */}
      <motion.button
        className="fixed top-4 right-4 p-3 rounded-xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all z-50"
        onMouseDown={handleFlowIconMouseDown}
        onMouseUp={handleFlowIconMouseUp}
        onMouseLeave={handleFlowIconMouseUp}
        animate={flowIconPressed ? { scale: 0.95 } : { scale: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <GitBranch className="w-5 h-5 text-white" />
      </motion.button>

      {/* Main Dashboard */}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Intervention Intelligence
          </h1>
          <p className="text-gray-400">Real-time behavioral choreography</p>
        </div>

        {/* Active Interventions */}
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Interventions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from(activeInterventions.values()).map(intervention => (
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
                <div className="text-lg font-medium">
                  {intervention.data.interventionType || 'Unknown'}
                </div>
                <div className="text-sm text-gray-400">
                  {intervention.data.emotion && `Emotion: ${intervention.data.emotion}`}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Event Stream */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Intelligence Stream</h2>
          <div className="space-y-2 max-h-[600px] overflow-y-auto glassmorphic-scroll">
            <AnimatePresence>
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className={`p-4 rounded-lg bg-gradient-to-r ${getEventColor(event.type)} backdrop-blur-md border`}
                >
                  <div className="flex items-center gap-4">
                    {/* Stage Icon */}
                    <div className="p-2 rounded-lg bg-white/10">
                      {getStageIcon(event.stage)}
                    </div>

                    {/* Event Details */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{event.stage}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-sm font-bold capitalize">{event.type}</span>
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
                    <div className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Flow Visualization Modal */}
      <AnimatePresence>
        {showFlowViz && (
          <FlowVisualization onClose={() => setShowFlowViz(false)} />
        )}
      </AnimatePresence>

      <style>{`
        .glassmorphic-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .glassmorphic-scroll::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .glassmorphic-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .glassmorphic-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </>
  );
};

// Flow Visualization Component (The Easter Egg)
const FlowVisualization: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="w-full max-w-6xl bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 rounded-2xl border border-white/20 backdrop-blur-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Intelligence Flow Architecture
        </h2>

        {/* Flow Diagram */}
        <div className="relative">
          {/* Stages */}
          <div className="grid grid-cols-6 gap-4 mb-8">
            {[
              { name: 'Telemetry', icon: MousePointer, color: 'from-blue-500 to-blue-600' },
              { name: 'Processor', icon: Brain, color: 'from-purple-500 to-purple-600' },
              { name: 'Engine', icon: Zap, color: 'from-orange-500 to-orange-600' },
              { name: 'WebSocket', icon: Activity, color: 'from-green-500 to-green-600' },
              { name: 'Choreographer', icon: Eye, color: 'from-pink-500 to-pink-600' },
              { name: 'Renderer', icon: Sparkles, color: 'from-yellow-500 to-yellow-600' }
            ].map((stage, index) => (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className={`p-6 rounded-xl bg-gradient-to-br ${stage.color} bg-opacity-20 backdrop-blur-md border border-white/20`}>
                  <stage.icon className="w-8 h-8 mb-2 text-white" />
                  <div className="text-sm font-medium text-white">{stage.name}</div>
                </div>

                {index < 5 && (
                  <motion.div
                    className="absolute top-1/2 -right-2 transform -translate-y-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    <ArrowRight className="w-6 h-6 text-white/50" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Data Flow Examples */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10"
            >
              <div className="text-sm font-mono text-blue-400 mb-2">hover_price_tier → frustration → discount_offer → 500ms_delay → slideUp → claimed</div>
              <div className="text-xs text-gray-400">3.2s hover on Enterprise pricing → Price anxiety detected → 15% discount modal → Shown after 500ms → Animated from bottom → User converted</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-white/10"
            >
              <div className="text-sm font-mono text-purple-400 mb-2">rage_scroll → confusion → help_offer → sticky → floating → dragged</div>
              <div className="text-xs text-gray-400">200px/s scroll velocity → User lost detected → Help chat bubble → Persistent display → Floating position → User repositioned</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 }}
              className="p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-green-500/10 border border-white/10"
            >
              <div className="text-sm font-mono text-orange-400 mb-2">exit_intent → abandonment → exit_rescue → 0ms → scaleIn → converted</div>
              <div className="text-xs text-gray-400">Mouse to top at 100px/s → Cart abandonment risk → 20% discount modal → Immediate trigger → Scale animation → Purchase completed</div>
            </motion.div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Avg Response Time', value: '73ms', change: '-12%' },
              { label: 'Intervention Success', value: '34.2%', change: '+8.3%' },
              { label: 'Emotional Accuracy', value: '91.7%', change: '+2.1%' },
              { label: 'Revenue Impact', value: '+23%', change: '+5%' }
            ].map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.4 + index * 0.1 }}
                className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-md border border-white/20"
              >
                <div className="text-xs text-gray-400 mb-1">{metric.label}</div>
                <div className="text-2xl font-bold text-white">{metric.value}</div>
                <div className={`text-xs ${metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                  {metric.change} vs last week
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <motion.button
          className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-medium hover:opacity-90 transition-opacity"
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Close Intelligence View
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

export default InterventionDashboard;