/**
 * Behavioral Stream Component
 * Shows raw behavioral events alongside emotional interpretations
 * "See the behavior, understand the emotion"
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Brain, MousePointer, Eye, AlertCircle, TrendingUp } from 'lucide-react';

interface BehavioralEvent {
  type: string;
  timestamp: number;
  metadata?: any;
  sessionId?: string;
}

interface EmotionalEvent {
  sessionId: string;
  emotion: string;
  confidence: number;
  patterns?: string[];
  timestamp: string;
}

const BehavioralStream = () => {
  const [behaviorEvents, setBehaviorEvents] = useState<BehavioralEvent[]>([]);
  const [emotionEvents, setEmotionEvents] = useState<EmotionalEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activePattern, setActivePattern] = useState<string | null>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      const wsUrl = window.location.hostname === 'sentientiq.app'
        ? 'wss://api.sentientiq.app/ws/behavioral'
        : 'ws://localhost:9223'; // New endpoint for behavioral data

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setIsConnected(true);

        // Subscribe to both streams
        ws?.send(JSON.stringify({
          type: 'subscribe',
          subjects: ['TELEMETRY.events', 'EMOTIONS.state']
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.subject === 'TELEMETRY.events' && message.data) {
            // Raw behavioral events
            const telemetry = message.data;
            if (telemetry.events) {
              setBehaviorEvents(prev => {
                const newEvents = [...telemetry.events.slice(-5), ...prev].slice(0, 50);
                return newEvents;
              });
            }
          } else if (message.subject === 'EMOTIONS.state' && message.data) {
            // Emotional interpretations
            const emotion = message.data;
            setEmotionEvents(prev => {
              const newEvents = [emotion, ...prev].slice(0, 20);
              return newEvents;
            });

            // Highlight active pattern
            if (emotion.patterns && emotion.patterns.length > 0) {
              setActivePattern(emotion.patterns[0]);
              setTimeout(() => setActivePattern(null), 3000);
            }
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Event type to icon/color mapping
  const getEventStyle = (type: string) => {
    const styles: Record<string, { icon: any, color: string, label: string }> = {
      'hover': { icon: Eye, color: 'text-blue-400', label: 'Hover' },
      'click': { icon: MousePointer, color: 'text-green-400', label: 'Click' },
      'rage_click': { icon: AlertCircle, color: 'text-red-500', label: 'Rage Click!' },
      'rapid_click': { icon: AlertCircle, color: 'text-orange-500', label: 'Rapid Click' },
      'scroll': { icon: TrendingUp, color: 'text-purple-400', label: 'Scroll' },
      'erratic_movement': { icon: AlertCircle, color: 'text-red-400', label: 'Erratic!' },
      'price_selection': { icon: Brain, color: 'text-green-500', label: 'Price Copy' },
      'form_focus': { icon: Activity, color: 'text-cyan-400', label: 'Form' },
      'exit_intent': { icon: AlertCircle, color: 'text-yellow-500', label: 'Leaving!' },
      'text_selection': { icon: Eye, color: 'text-blue-500', label: 'Reading' },
      'dwell': { icon: Eye, color: 'text-gray-400', label: 'Pause' },
      'mouse_exit': { icon: MousePointer, color: 'text-gray-500', label: 'Mouse Exit' },
      'tab_switch': { icon: Activity, color: 'text-indigo-400', label: 'Tab Switch' }
    };

    return styles[type] || {
      icon: Activity,
      color: 'text-gray-400',
      label: type.replace(/_/g, ' ')
    };
  };

  // Pattern descriptions
  const patternDescriptions: Record<string, string> = {
    'stickerShock': '💸 User saw price and panicked',
    'comparisonShopping': '🛒 Comparing with competitors',
    'purchaseFunnel': '🎯 Moving toward purchase',
    'abandonmentRisk': '⚠️ May abandon cart',
    'frustrationSpiral': '😤 Getting frustrated with UI'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Behavioral Events Stream */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Behavioral Stream
            </h3>
            <p className="text-sm text-white/60 mt-1">Raw user actions</p>
          </div>
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence mode="popLayout">
            {behaviorEvents.map((event, index) => {
              const style = getEventStyle(event.type);
              const Icon = style.icon;

              return (
                <motion.div
                  key={`${event.type}-${event.timestamp}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 p-2 rounded-lg bg-black/30
                    ${activePattern && event.type.includes('erratic') ? 'ring-2 ring-red-500/50' : ''}`}
                >
                  <Icon className={`w-4 h-4 ${style.color}`} />
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${style.color}`}>
                      {style.label}
                    </span>
                    {event.metadata?.velocity && (
                      <span className="text-xs text-white/40 ml-2">
                        speed: {Math.abs(event.metadata.velocity)}
                      </span>
                    )}
                    {event.metadata?.target?.text && (
                      <span className="text-xs text-white/40 ml-2">
                        "{event.metadata.target.text}"
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/30">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Emotional Interpretation Stream */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Emotional Intelligence
            </h3>
            <p className="text-sm text-white/60 mt-1">What it means</p>
          </div>
        </div>

        {/* Active Pattern Alert */}
        <AnimatePresence>
          {activePattern && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg"
            >
              <p className="text-sm font-semibold text-purple-300">
                Pattern Detected: {patternDescriptions[activePattern] || activePattern}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-2 max-h-[350px] overflow-y-auto">
          {emotionEvents.map((emotion, index) => {
            const emotionColors: Record<string, string> = {
              frustration: 'bg-red-500',
              confusion: 'bg-yellow-500',
              interest: 'bg-blue-500',
              intention: 'bg-green-500',
              excitement: 'bg-purple-500',
              hesitation: 'bg-orange-500',
              trust: 'bg-cyan-500'
            };

            const bgColor = emotionColors[emotion.emotion] || 'bg-gray-500';

            return (
              <motion.div
                key={`${emotion.sessionId}-${emotion.timestamp}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-black/30 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold text-white ${bgColor}`}>
                    {emotion.emotion.toUpperCase()}
                  </span>
                  <span className="text-sm text-white/70">
                    {emotion.confidence}% confidence
                  </span>
                </div>

                {emotion.patterns && emotion.patterns.length > 0 && (
                  <div className="text-xs text-white/50">
                    {emotion.patterns.map(p => patternDescriptions[p] || p).join(' • ')}
                  </div>
                )}

                <div className="text-xs text-white/30 mt-1">
                  {new Date(emotion.timestamp).toLocaleTimeString()}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default BehavioralStream;