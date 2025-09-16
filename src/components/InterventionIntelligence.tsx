/**
 * Intervention Intelligence Component
 * Compact view for the Shopping Pattern Intelligence section
 * Shows real-time intervention choreography
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  TrendingUp,
  MousePointer,
  Brain,
  Eye,
  Target,
  ArrowRight,
  GitBranch,
  Activity
} from 'lucide-react';

interface InterventionIntelligenceProps {
  events: any[];
  stats: any;
  interventionMetrics: any;
}

interface ActiveIntervention {
  sessionId: string;
  type: string;
  emotion: string;
  timing: string;
  status: 'pending' | 'shown' | 'interacted' | 'dismissed';
  timestamp: number;
}

export const InterventionIntelligence: React.FC<InterventionIntelligenceProps> = ({
  events,
  stats,
  interventionMetrics
}) => {
  const [activeInterventions, setActiveInterventions] = useState<ActiveIntervention[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<any[]>([]);
  const [showFlowViz, setShowFlowViz] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Process events to extract intervention data
  useEffect(() => {
    const interventionEvents = events.filter(e =>
      e.metadata?.intervention || e.emotion === 'intervention_triggered'
    );

    const active = interventionEvents
      .slice(0, 5)
      .map(e => ({
        sessionId: e.session_id,
        type: e.metadata?.intervention_type || 'unknown',
        emotion: e.emotion,
        timing: e.metadata?.timing || 'immediate',
        status: 'shown' as const,
        timestamp: Date.now()
      }));

    setActiveInterventions(active);
  }, [events]);

  // Easter egg flow viz handlers
  const handleFlowIconMouseDown = () => {
    longPressTimer.current = setTimeout(() => {
      setShowFlowViz(true);
    }, 1000);
  };

  const handleFlowIconMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <>
      {/* Flow Icon Easter Egg - Floating */}
      <motion.button
        className="fixed top-20 right-6 p-2 rounded-lg bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 hover:border-white/40 transition-all z-50"
        onMouseDown={handleFlowIconMouseDown}
        onMouseUp={handleFlowIconMouseUp}
        onMouseLeave={handleFlowIconMouseUp}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <GitBranch className="w-4 h-4 text-white/80" />
      </motion.button>

      <div className="space-y-6">
        {/* Active Interventions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white/80">Active Interventions</h3>
            <Activity className="w-4 h-4 text-green-400 animate-pulse" />
          </div>

          {activeInterventions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeInterventions.map((intervention, index) => (
                <motion.div
                  key={`${intervention.sessionId}-${index}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-purple-400">
                      {intervention.sessionId.substring(0, 8)}...
                    </span>
                    <Zap className="w-3 h-3 text-yellow-400" />
                  </div>
                  <div className="text-sm font-medium text-white">
                    {intervention.type}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-white/60">
                      {intervention.emotion}
                    </span>
                    <ArrowRight className="w-3 h-3 text-white/40" />
                    <span className="text-xs text-green-400">
                      {intervention.timing}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-white/20" />
              <p className="text-sm text-white/40">Monitoring behavioral patterns...</p>
            </div>
          )}
        </div>

        {/* Choreography Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
            <MousePointer className="w-4 h-4 text-blue-400 mb-1" />
            <div className="text-lg font-bold text-white">
              {stats?.totalEvents || 0}
            </div>
            <div className="text-xs text-white/60">Behaviors Tracked</div>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
            <Brain className="w-4 h-4 text-purple-400 mb-1" />
            <div className="text-lg font-bold text-white">
              {events.length}
            </div>
            <div className="text-xs text-white/60">Emotions Detected</div>
          </div>

          <div className="p-3 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
            <Target className="w-4 h-4 text-green-400 mb-1" />
            <div className="text-lg font-bold text-white">
              {interventionMetrics?.conversionRate || '0'}%
            </div>
            <div className="text-xs text-white/60">Success Rate</div>
          </div>
        </div>

        {/* Intervention Effectiveness */}
        {interventionMetrics && interventionMetrics.byType && (
          <div>
            <h3 className="text-sm font-medium text-white/80 mb-3">Intervention Performance</h3>
            <div className="space-y-2">
              {Object.entries(interventionMetrics.byType)
                .slice(0, 4)
                .map(([type, metrics]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-white/80">{type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/60">
                        {metrics.shown || 0} shown
                      </span>
                      <span className="text-sm font-bold text-green-400">
                        {metrics.conversionRate ? `${metrics.conversionRate.toFixed(1)}%` : '0%'}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Real-time Decision Stream */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-white/5 to-white/10 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-white/60" />
            <span className="text-xs font-medium text-white/60">Intelligence Stream</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {events.slice(0, 5).map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-xs"
              >
                <span className="text-white/40">
                  {new Date(event.timestamp || Date.now()).toLocaleTimeString()}
                </span>
                <ArrowRight className="w-3 h-3 text-white/20" />
                <span className="text-white/60">{event.emotion}</span>
                {event.metadata?.intervention_type && (
                  <>
                    <ArrowRight className="w-3 h-3 text-white/20" />
                    <span className="text-green-400">{event.metadata.intervention_type}</span>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow Visualization Modal */}
      <AnimatePresence>
        {showFlowViz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-8"
            onClick={() => setShowFlowViz(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-full max-w-4xl bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 rounded-2xl border border-white/20 backdrop-blur-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Intervention Intelligence Architecture
              </h2>

              {/* Mini Flow Diagram */}
              <div className="grid grid-cols-6 gap-2 mb-6">
                {[
                  { name: 'Behavior', icon: MousePointer },
                  { name: 'Emotion', icon: Brain },
                  { name: 'Decision', icon: Zap },
                  { name: 'Timing', icon: Eye },
                  { name: 'Render', icon: Target },
                  { name: 'Result', icon: TrendingUp }
                ].map((stage, i) => (
                  <motion.div
                    key={stage.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="text-center"
                  >
                    <div className="p-4 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/20 mb-2">
                      <stage.icon className="w-6 h-6 mx-auto text-white" />
                    </div>
                    <span className="text-xs text-white/60">{stage.name}</span>
                  </motion.div>
                ))}
              </div>

              {/* Example Flow */}
              <div className="p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10">
                <code className="text-sm text-blue-400">
                  hover(3.2s) → frustration(0.76) → discount_offer → delay(500ms) → modal → converted
                </code>
              </div>

              <button
                onClick={() => setShowFlowViz(false)}
                className="mt-6 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-medium hover:opacity-90"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default InterventionIntelligence;