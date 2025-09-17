/**
 * NATS-Powered Emotional Stream Component
 * Finally, a reliable real-time event stream!
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, CheckCircle, Zap } from 'lucide-react';
import { useNATSEmotions } from '../hooks/useNATSEmotions';

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

const EMOTION_COLORS: Record<string, string> = {
  // Critical (RED)
  rage: 'from-red-600 to-red-700',
  frustration: 'from-red-400 to-red-500',

  // Positive (GREEN)
  confidence: 'from-green-500 to-emerald-600',
  delight: 'from-green-400 to-emerald-500',
  joy: 'from-green-600 to-emerald-700',
  triumph: 'from-green-600 to-green-700',
  purchase_intent: 'from-green-600 to-green-700',

  // Caution (YELLOW)
  hesitation: 'from-yellow-500 to-amber-500',
  confusion: 'from-yellow-400 to-yellow-500',

  // Information (BLUE)
  evaluation: 'from-blue-400 to-blue-500',

  // Default
  default: 'from-gray-400 to-gray-500'
};

const NATSEmotionalStream = () => {
  const [events, setEvents] = useState<EmotionalEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);

  const handleEvent = useCallback((event: EmotionalEvent) => {
    setEvents(prev => {
      // Keep only last 50 events for performance
      const newEvents = [event, ...prev].slice(0, 50);
      return newEvents;
    });
    setTotalEvents(prev => prev + 1);
  }, []);

  const { isConnected, connectionStatus, error } = useNATSEmotions(handleEvent);

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">NATS Emotional Stream</h2>
          <p className="text-sm text-white/60 mt-1">Persistent, reliable event streaming</p>
        </div>
        <div className="flex items-center gap-4">
          {events.length > 10 && (
            <button
              onClick={clearEvents}
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

      {/* Connection Info */}
      {error && (
        <div className="mb-4 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-white">{events.length}</div>
          <div className="text-xs text-white/60">Current</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-purple-400">{totalEvents}</div>
          <div className="text-xs text-white/60">Total</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            {isConnected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-bold">NATS</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">Connecting</span>
              </>
            )}
          </div>
          <div className="text-xs text-white/60">JetStream</div>
        </div>
      </div>

      {/* Event Feed */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
        <AnimatePresence>
          {events.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-white/40"
            >
              <Zap className="w-12 h-12 mx-auto mb-4 text-white/20" />
              <p className="text-lg mb-2">
                {isConnected ? 'Waiting for events...' : 'Connecting to NATS...'}
              </p>
              <p className="text-sm">Persistent event stream ready</p>
            </motion.div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={`${event.sessionId}-${event.timestamp}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  duration: 0.1,
                  type: "tween",
                  ease: "easeOut"
                }}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
              >
                {/* Emotion Badge */}
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${EMOTION_COLORS[event.emotion] || EMOTION_COLORS.default} shadow-lg`}>
                  <span className="text-xs font-semibold text-white">
                    {event.emotion}
                  </span>
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-white/60">
                      {event.sessionId}
                    </span>
                    <span className="text-white">
                      {event.confidence}% confidence
                    </span>
                  </div>

                  {/* Emotional Vectors */}
                  {(event.frustration || event.anxiety || event.urgency) && (
                    <div className="flex gap-3 mt-1 text-xs text-white/40">
                      {event.frustration && <span>F: {event.frustration}%</span>}
                      {event.anxiety && <span>A: {event.anxiety}%</span>}
                      {event.urgency && <span>U: {event.urgency}%</span>}
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

      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          NATS JetStream • Persistent Events • {totalEvents} total received
        </p>
      </div>
    </motion.div>
  );
};

export default NATSEmotionalStream;