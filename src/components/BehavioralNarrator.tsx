/**
 * Behavioral Narrator Component
 * Shows the "theater" of user behavior that leads to emotions
 * Perfect for demos - makes the invisible visible
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer,
  Eye,
  AlertCircle,
  TrendingUp,
  Zap,
  Target,
  ArrowUpCircle,
  RotateCw,
  Type,
  ShoppingCart,
  DollarSign,
  Clock,
  Navigation
} from 'lucide-react';

interface BehavioralEvent {
  type: string;
  description: string;
  icon: JSX.Element;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
}

const BehavioralNarrator = () => {
  const [events, setEvents] = useState<BehavioralEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectToTelemetry();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectToTelemetry = () => {
    const wsUrl = window.location.hostname === 'sentientiq.app'
      ? 'wss://api.sentientiq.app/ws/nats'
      : 'ws://localhost:9222';

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        ws.send(JSON.stringify({
          type: 'subscribe',
          subject: 'TELEMETRY.events'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'message' && message.data) {
            processTelemetryEvent(message.data);
          }
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setTimeout(connectToTelemetry, 3000);
      };
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  };

  const processTelemetryEvent = (data: any) => {
    const events = data.events || [data];

    events.forEach((event: any) => {
      const behavioral = translateToBehavioral(event);
      if (behavioral) {
        setEvents(prev => [behavioral, ...prev].slice(0, 10));
      }
    });
  };

  const translateToBehavioral = (event: any): BehavioralEvent | null => {
    const type = event.type;
    const data = event.data || {};

    // Create theatrical descriptions for demo audience
    switch(type) {
      case 'price_proximity':
        return {
          type: 'price_proximity',
          description: `👁️ Hovering ${data.distance < 50 ? 'directly over' : 'near'} price element ($${data.element || '299/mo'})`,
          icon: <DollarSign className="w-4 h-4" />,
          severity: data.distance < 50 ? 'critical' : 'warning',
          timestamp: Date.now()
        };

      case 'rage_click':
        return {
          type: 'rage_click',
          description: `🖱️ Rage clicked ${data.count || 3} times in frustration!`,
          icon: <AlertCircle className="w-4 h-4" />,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'circular_motion':
        return {
          type: 'circular_motion',
          description: `🔄 Mouse circling in confusion (${data.radius}px radius)`,
          icon: <RotateCw className="w-4 h-4" />,
          severity: 'warning',
          timestamp: Date.now()
        };

      case 'viewport_approach':
        return {
          type: 'viewport_approach',
          description: `🚪 Moving toward ${data.edge} edge to exit (${data.velocity}px/s)`,
          icon: <ArrowUpCircle className="w-4 h-4" />,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'mouse_exit':
        return {
          type: 'mouse_exit',
          description: `🚨 Mouse left viewport at ${data.velocity}px/s!`,
          icon: <Navigation className="w-4 h-4" />,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'scroll':
        if (data.scrollSpeed < 15) {
          return {
            type: 'reading_pattern',
            description: `📖 Slow, steady scrolling (reading pattern detected)`,
            icon: <Eye className="w-4 h-4" />,
            severity: 'info',
            timestamp: Date.now()
          };
        } else if (data.scrollSpeed > 40) {
          return {
            type: 'fast_scroll',
            description: `⚡ Fast scrolling ${data.direction} (${data.scrollSpeed}px/s) - scanning content`,
            icon: <TrendingUp className="w-4 h-4" />,
            severity: 'warning',
            timestamp: Date.now()
          };
        }
        break;

      case 'idle':
        if (data.duration > 2000) {
          return {
            type: 'idle',
            description: `⏸️ Visitor frozen for ${(data.duration/1000).toFixed(1)}s (processing information)`,
            icon: <Clock className="w-4 h-4" />,
            severity: 'warning',
            timestamp: Date.now()
          };
        }
        break;

      case 'text_selection':
        return {
          type: 'text_selection',
          description: `📝 Selected text: "${(data.text || 'pricing tier').substring(0, 30)}..."`,
          icon: <Type className="w-4 h-4" />,
          severity: 'info',
          timestamp: Date.now()
        };

      case 'tab_switch':
        return {
          type: 'tab_switch',
          description: data.action === 'away'
            ? `🔄 Switched to another tab (comparing options)`
            : `↩️ Returned from tab (was away ${(data.awayDuration/1000).toFixed(0)}s)`,
          icon: <Target className="w-4 h-4" />,
          severity: 'warning',
          timestamp: Date.now()
        };

      case 'cta_proximity':
        return {
          type: 'cta_proximity',
          description: `🎯 Hovering near "Add to Cart" button (${data.distance}px away)`,
          icon: <ShoppingCart className="w-4 h-4" />,
          severity: data.distance < 50 ? 'critical' : 'info',
          timestamp: Date.now()
        };

      case 'mouse':
        // Only show dramatic mouse events
        if (data.jerk > 1000) {
          return {
            type: 'jerk',
            description: `⚡ Sudden jerk movement detected (${data.jerk}px/s³)`,
            icon: <Zap className="w-4 h-4" />,
            severity: 'warning',
            timestamp: Date.now()
          };
        } else if (data.speed > 500) {
          return {
            type: 'fast_movement',
            description: `💨 Rapid mouse movement at ${data.speed}px/s`,
            icon: <MousePointer className="w-4 h-4" />,
            severity: 'info',
            timestamp: Date.now()
          };
        }
        break;
    }

    return null;
  };

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-500/10 border-red-500/30 text-red-400';
      case 'warning': return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
      default: return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
    }
  };

  return (
    <div className="bg-gray-900/95 backdrop-blur-sm rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">
          Behavioral Stream
        </h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs text-red-400">Offline</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Waiting for behavioral events...
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={`${event.type}-${event.timestamp}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
              >
                <div className="mt-0.5">{event.icon}</div>
                <div className="flex-1">
                  <p className="text-sm leading-relaxed">
                    {event.description}
                  </p>
                  <p className="text-xs opacity-50 mt-1">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {events.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Showing last {events.length} behavioral events • Theater mode for demos
          </p>
        </div>
      )}
    </div>
  );
};

export default BehavioralNarrator;