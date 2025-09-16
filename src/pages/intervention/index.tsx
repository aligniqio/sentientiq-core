/**
 * Intervention Intelligence Page
 * THE CROWN JEWEL - Where behavioral choreography becomes visible
 * Full transparency of the intervention logic in glassmorphic UI
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Activity, Zap } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { InterventionDashboard } from '@/components/InterventionDashboard';

const InterventionIntelligencePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black">
      <PageHeader
        title="Intervention Intelligence"
        subtitle="Real-time behavioral choreography and intervention effectiveness"
      />

      {/* Connection Status */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-white/60">
            Connected to Intervention Choreographer™
          </span>
          <span className="ml-auto text-sm font-semibold text-purple-400 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Live Monitoring
          </span>
        </div>
      </div>

      {/* Main Dashboard */}
      <InterventionDashboard />

      {/* Philosophy Footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="max-w-7xl mx-auto px-6 py-12 mt-12 border-t border-white/10"
      >
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">The Philosophy</h3>
            <Zap className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="text-sm text-white/60 max-w-2xl mx-auto">
            Glassmorphism isn't just a design choice—it's our philosophy.
            Full transparency of the intervention logic. We're not hiding the magic.
            Every behavioral pattern, every decision, every millisecond of timing is visible.
          </p>
          <p className="text-xs text-white/40 mt-4">
            "This is the gold" - The feature that makes SentientIQ category-defining.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default InterventionIntelligencePage;