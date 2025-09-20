/**
 * Pulse Dashboard - Real-time emotional intelligence monitoring
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
// Using NATS components with SSL proxy
import NATSEmotionalStream from '@/components/NATSEmotionalStream';
import NATSInterventionStream from '@/components/NATSInterventionStream';
import BehavioralNarrator from '@/components/BehavioralNarrator';
import EVIDisplay from '@/components/EVIDisplay';
import PageHeader from '@/components/PageHeader';
import { Users } from 'lucide-react';

const PulseDashboard: React.FC = () => {
  // EVI value will be calculated from emotional stream
  const [eviValue] = useState(0);

  return (
    <>
      <PageHeader
        title="SentientIQ Pulse"
        subtitle="Real-time Emotional Intelligence Dashboard"
      />

      {/* Live Status Bar */}
      <div className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-40 -mt-6">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Live Event Streams</h2>

            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Top Level Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* EVI Display */}
          <div className="lg:col-span-2">
            <EVIDisplay
              value={eviValue}
              trend={eviValue > 60 ? 'up' : eviValue < 40 ? 'down' : 'stable'}
              className="w-full h-full"
            />
          </div>

          {/* Session Status */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 flex flex-col items-center justify-center"
          >
            <Users className="w-8 h-8 text-purple-400 mb-3" />
            <div className="text-2xl font-bold text-white">Monitoring</div>
            <div className="text-sm text-white/60 mt-1">Live Sessions</div>
            <div className="mt-4 text-center">
              <p className="text-xs text-white/40">
                Tracking visitor emotions in real-time
              </p>
            </div>
          </motion.div>
        </div>

        {/* Behavioral Theater - Shows the WHY behind emotions */}
        <div className="mb-6">
          <BehavioralNarrator />
        </div>

        {/* Broadcast Streams */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Broadcast Point #1: NATS Emotional Stream */}
          <div className="h-full">
            <NATSEmotionalStream />
          </div>

          {/* Broadcast Point #2: NATS Intervention Stream */}
          <div className="h-full">
            <NATSInterventionStream />
          </div>
        </div>
      </div>
    </>
  );
};

export default PulseDashboard;