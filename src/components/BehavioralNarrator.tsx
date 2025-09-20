/**
 * Behavioral Narrator Component
 * Shows the "theater" of user behavior that leads to emotions
 * Terminal-style display matching the Emotional Stream
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle } from 'lucide-react';

interface BehavioralEvent {
  type: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
}

const BehavioralNarrator = () => {
  const [events, setEvents] = useState<BehavioralEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [totalEvents, setTotalEvents] = useState(0);
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
        setConnectionStatus('Live');
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
        setConnectionStatus('Reconnecting...');
        setTimeout(connectToTelemetry, 3000);
      };
    } catch (err) {
      console.error('WebSocket error:', err);
      setConnectionStatus('Offline');
    }
  };

  const processTelemetryEvent = (data: any) => {
    const events = data.events || [data];

    events.forEach((event: any) => {
      const behavioral = translateToBehavioral(event);
      if (behavioral) {
        setEvents(prev => [behavioral, ...prev].slice(0, 50));
        setTotalEvents(prev => prev + 1);
      }
    });
  };

  const translateToBehavioral = (event: any): BehavioralEvent | null => {
    const type = event.type;
    const data = event.data || {};

    // Create terminal-style descriptions for behavioral events
    switch(type) {
      case 'price_proximity':
        return {
          type: 'PRICE_HOVER',
          description: data.distance < 50
            ? `Direct hover over price element [$${data.element || '299/mo'}]`
            : `Approaching price area (${data.distance}px away)`,
          severity: data.distance < 50 ? 'critical' : 'warning',
          timestamp: Date.now()
        };

      case 'rage_click':
        return {
          type: 'RAGE_CLICK',
          description: `Rage clicking detected: ${data.count || 3}x rapid clicks`,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'circular_motion':
        return {
          type: 'CIRCULAR_MOTION',
          description: `Circular mouse pattern (${data.radius}px radius, confusion signal)`,
          severity: 'warning',
          timestamp: Date.now()
        };

      case 'viewport_approach':
        return {
          type: 'EXIT_VECTOR',
          description: `Moving to ${data.edge} edge at ${data.velocity}px/s`,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'mouse_exit':
        return {
          type: 'MOUSE_EXIT',
          description: `Mouse left viewport (velocity: ${data.velocity}px/s)`,
          severity: 'critical',
          timestamp: Date.now()
        };

      case 'scroll':
        if (data.scrollSpeed < 15) {
          return {
            type: 'READING_PATTERN',
            description: `Slow steady scroll ${data.direction} (reading behavior)`,
            severity: 'info',
            timestamp: Date.now()
          };
        } else if (data.scrollSpeed > 40) {
          return {
            type: 'FAST_SCROLL',
            description: `Fast scroll ${data.direction} at ${data.scrollSpeed}px/s (scanning)`,
            severity: 'warning',
            timestamp: Date.now()
          };
        }
        break;

      case 'idle':
        if (data.duration > 2000) {
          return {
            type: 'IDLE_FREEZE',
            description: `User frozen for ${(data.duration/1000).toFixed(1)}s (processing)`,
            severity: 'warning',
            timestamp: Date.now()
          };
        }
        break;

      case 'text_selection':
        return {
          type: 'TEXT_SELECT',
          description: `Selected text: "${(data.text || '').substring(0, 40)}..."`,
          severity: 'info',
          timestamp: Date.now()
        };

      case 'tab_switch':
        return {
          type: 'TAB_SWITCH',
          description: data.action === 'away'
            ? `Switched to another tab (comparison behavior)`
            : `Returned from tab (away ${(data.awayDuration/1000).toFixed(0)}s)`,
          severity: 'warning',
          timestamp: Date.now()
        };

      case 'cta_proximity':
        return {
          type: 'CTA_HOVER',
          description: `Hovering near CTA button (${data.distance}px away)`,
          severity: data.distance < 50 ? 'critical' : 'info',
          timestamp: Date.now()
        };

      case 'form_proximity':
        return {
          type: 'FORM_APPROACH',
          description: `Approaching form field (${data.distance}px)`,
          severity: 'info',
          timestamp: Date.now()
        };

      case 'mouse':
        // Only show significant mouse events
        if (data.jerk && data.jerk > 1000) {
          return {
            type: 'JERK_MOTION',
            description: `Sudden jerk detected: ${data.jerk}px/s³`,
            severity: 'warning',
            timestamp: Date.now()
          };
        } else if (data.speed > 500) {
          return {
            type: 'RAPID_MOVE',
            description: `Rapid movement at ${data.speed}px/s`,
            severity: 'info',
            timestamp: Date.now()
          };
        }
        break;

      case 'element_hover':
        if (data.element === 'price' || data.element?.includes('price')) {
          return {
            type: 'PRICE_DWELL',
            description: `Dwelling on price for ${(data.duration/1000).toFixed(1)}s`,
            severity: 'critical',
            timestamp: Date.now()
          };
        }
        break;
    }

    return null;
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const getBehaviorColor = (severity: string, type: string) => {
    // Match the emotional stream color scheme
    if (severity === 'critical') {
      return 'text-red-500';  // Critical behaviors (exit, rage, price shock)
    } else if (severity === 'warning') {
      return 'text-yellow-400';  // Warning behaviors (confusion, fast movement)
    } else if (type.includes('READING') || type.includes('TEXT')) {
      return 'text-green-300';  // Positive engagement
    } else {
      return 'text-blue-400';  // Neutral/exploring
    }
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
          <h2 className="text-xl font-bold text-white">Behavioral Stream</h2>
          <p className="text-sm text-white/60 mt-1">Raw visitor behaviors (the "why" behind emotions)</p>
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-white">{events.length}</div>
          <div className="text-xs text-white/60">Current</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{totalEvents}</div>
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
          <div className="text-xs text-white/60">Status</div>
        </div>
      </div>

      {/* Terminal-Style Behavioral Feed */}
      <div className="bg-black/50 rounded-lg p-4 font-mono text-sm">
        <div className="max-h-[400px] overflow-y-auto space-y-1" style={{ scrollBehavior: 'smooth' }}>
          {events.length === 0 ? (
            <div className="text-white/40 text-center py-8">
              {isConnected ? '> Waiting for behavioral events...' : '> Connecting to telemetry stream...'}
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={`${event.type}-${event.timestamp}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 text-xs"
              >
                <span className="text-white/30">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className="text-white/50">--</span>
                <span className={`${getBehaviorColor(event.severity, event.type)} font-semibold`}>
                  {event.type}
                </span>
                <span className="text-white/50">:</span>
                <span className="text-white/70 flex-1">
                  {event.description}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <p className="text-xs text-white/40">
          {totalEvents} behaviors captured
        </p>
      </div>
    </motion.div>
  );
};

export default BehavioralNarrator;