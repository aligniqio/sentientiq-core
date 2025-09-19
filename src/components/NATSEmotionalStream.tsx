/**
 * NATS-Powered Emotional Stream Component
 * Finally, a reliable real-time event stream!
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle } from 'lucide-react';
import { useEmotionalSpectrum } from '../hooks/useEmotionalSpectrum';

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

  const { isConnected, connectionStatus, error } = useEmotionalSpectrum(handleEvent);

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
          <h2 className="text-xl font-bold text-white">Emotional Stream</h2>
          <p className="text-sm text-white/60 mt-1">Real-time visitor emotions</p>
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
                <span className="text-green-400 font-bold">Live</span>
              </>
            ) : (
              <>
                <Activity className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-bold">Connecting</span>
              </>
            )}
          </div>
          <div className="text-xs text-white/60">Connected</div>
        </div>
      </div>

      {/* Terminal-Style Event Feed */}
      <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
        <div className="max-h-[400px] overflow-y-auto space-y-1" style={{ scrollBehavior: 'smooth' }}>
          {events.length === 0 ? (
            <div className="text-white/40 text-center py-8">
              {isConnected ? '> Waiting for emotional signals...' : '> Connecting to stream...'}
            </div>
          ) : (
            events.map((event, index) => {
              // Color mapping based on emotion psychology
              const emotionColor =
                // CRITICAL - Dark Red (immediate intervention needed)
                ['abandonment_intent', 'exit_risk', 'cart_abandonment'].includes(event.emotion) ? 'text-red-600' :
                // HIGH RISK - Red
                ['frustration', 'rage', 'anger', 'cart_shock'].includes(event.emotion) ? 'text-red-500' :
                // PRICE SENSITIVITY - Orange-Red
                ['price_shock', 'sticker_shock', 'price_hesitation'].includes(event.emotion) ? 'text-orange-500' :
                // CAUTION - Yellow
                ['confusion', 'hesitation', 'skeptical', 'trust_hesitation', 'cart_hesitation'].includes(event.emotion) ? 'text-yellow-400' :
                // NEUTRAL/EXPLORING - Blue
                ['evaluation', 'comparison_shopping', 'searching', 'exploration', 'lost'].includes(event.emotion) ? 'text-blue-400' :
                // POSITIVE ENGAGEMENT - Light Green
                ['interest', 'curiosity', 'scanning', 'reading'].includes(event.emotion) ? 'text-green-300' :
                // PURCHASE SIGNALS - Dark Green
                ['confidence', 'purchase_intent', 'excitement', 'delight', 'trust_building'].includes(event.emotion) ? 'text-green-500' :
                // ANXIETY - Purple
                ['anxiety', 'cart_review'].includes(event.emotion) ? 'text-purple-400' :
                // DEFAULT
                'text-white/60';

              return (
                <div
                  key={`${event.sessionId}-${event.timestamp}-${index}`}
                  className="flex items-center gap-2 text-xs"
                  style={{ opacity: 1 }}
                >
                  <span className="text-white/30">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-white/50">--</span>
                  <span className={`${emotionColor} font-semibold`}>
                    {event.emotion.toUpperCase()}
                  </span>
                  <span className="text-white/70">
                    @ {event.confidence}%
                  </span>
                  <span className="text-white/30 truncate flex-1">
                    [{event.sessionId}]
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          {totalEvents} events processed
        </p>
      </div>
    </motion.div>
  );
};

export default NATSEmotionalStream;