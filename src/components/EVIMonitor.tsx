import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  AlertTriangle,
  Zap,
  ChevronDown
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

interface EVIData {
  score: number;
  condition: 'EUPHORIC' | 'OPTIMISTIC' | 'NEUTRAL' | 'ANXIOUS' | 'FEARFUL';
  signal: string;
  recommendation?: string;
  dominantEmotion: string;
  volatility?: {
    current: number;
    change24h: string;
    change7d: string;
  };
  emotions?: {
    [key: string]: number;
  };
  vertical?: string;
  timestamp: string;
}

const EVIMonitor: React.FC = () => {
  const [eviData, setEviData] = useState<EVIData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const subscription = useSubscription();
  
  // Fetch EVI data
  useEffect(() => {
    const fetchEVI = async () => {
      try {
        const tier = subscription.tier || 'free';
        const vertical = subscription.tier === 'enterprise' ? subscription.vertical : null;
        
        const url = vertical 
          ? `http://localhost:8004/api/evi/${tier}/${vertical}`
          : `http://localhost:8004/api/evi/${tier}`;
          
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.evi) {
          setEviData(data.evi);
        }
      } catch (error) {
        console.error('Failed to fetch EVI:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial fetch
    fetchEVI();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchEVI, 30000);
    
    return () => clearInterval(interval);
  }, [subscription.tier, subscription.vertical]);
  
  // Get color based on condition
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'EUPHORIC': return 'from-green-400 to-emerald-400';
      case 'OPTIMISTIC': return 'from-blue-400 to-cyan-400';
      case 'NEUTRAL': return 'from-gray-400 to-slate-400';
      case 'ANXIOUS': return 'from-yellow-400 to-orange-400';
      case 'FEARFUL': return 'from-red-400 to-pink-400';
      default: return 'from-gray-400 to-gray-500';
    }
  };
  
  const getConditionIcon = (condition: string) => {
    switch (condition) {
      case 'EUPHORIC':
      case 'OPTIMISTIC': return <TrendingUp className="w-4 h-4" />;
      case 'ANXIOUS':
      case 'FEARFUL': return <TrendingDown className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };
  
  if (loading || !eviData) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10">
        <Activity className="w-4 h-4 text-white/40 animate-pulse" />
        <span className="text-sm text-white/40">Loading EVI...</span>
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Main EVI Display */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-3 px-4 py-2
          bg-gradient-to-r ${getConditionColor(eviData.condition)}
          backdrop-blur-xl rounded-lg
          border border-white/20
          hover:border-white/40 transition-all
          shadow-lg shadow-black/20
        `}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Icon */}
        <div className="flex items-center gap-2">
          {getConditionIcon(eviData.condition)}
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                EVI: {eviData.score}
              </span>
              {eviData.volatility && (
                <span className={`text-xs ${
                  eviData.volatility.change24h.startsWith('+') 
                    ? 'text-green-200' 
                    : 'text-red-200'
                }`}>
                  {eviData.volatility.change24h}
                </span>
              )}
            </div>
            <span className="text-xs text-white/80">
              {eviData.condition}
            </span>
          </div>
        </div>
        
        {/* Vertical Badge (for enterprise) */}
        {eviData.vertical && eviData.vertical !== 'GLOBAL' && (
          <div className="px-2 py-0.5 bg-black/30 rounded text-xs text-white/90">
            {eviData.vertical}
          </div>
        )}
        
        {/* Expand Icon */}
        <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${
          expanded ? 'rotate-180' : ''
        }`} />
      </motion.button>
      
      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 w-96 z-50"
          >
            <div className="bg-black/95 backdrop-blur-2xl rounded-xl border border-white/20 p-6 shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  Emotional Value Index
                </h3>
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getConditionColor(eviData.condition)}`}>
                  <span className="text-xs font-bold text-white">
                    {eviData.score}
                  </span>
                </div>
              </div>
              
              {/* Signal */}
              <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-white font-medium">
                      {eviData.signal}
                    </p>
                    {eviData.recommendation && subscription.tier !== 'free' && (
                      <p className="text-xs text-white/60 mt-1">
                        {eviData.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Emotions Breakdown (Pro+ only) */}
              {eviData.emotions && subscription.tier !== 'free' && (
                <div className="mb-4">
                  <h4 className="text-xs text-white/60 uppercase tracking-wider mb-2">
                    Emotional Climate
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(eviData.emotions).map(([emotion, value]) => (
                      <div key={emotion} className="text-center">
                        <div className="text-xs text-white/40 capitalize">{emotion}</div>
                        <div className="text-sm font-bold text-white">{value}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Volatility (Pro+ only) */}
              {eviData.volatility && subscription.tier !== 'free' && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-white/40">Current</div>
                    <div className="text-sm font-bold text-white">
                      {eviData.volatility.current}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-white/40">24h</div>
                    <div className={`text-sm font-bold ${
                      eviData.volatility.change24h.startsWith('+') 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {eviData.volatility.change24h}
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-white/40">7d</div>
                    <div className={`text-sm font-bold ${
                      eviData.volatility.change7d.startsWith('+') 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {eviData.volatility.change7d}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Upgrade CTA for free users */}
              {subscription.tier === 'free' && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <div className="flex-1">
                      <p className="text-xs text-white/80">
                        Upgrade to Pro for detailed emotions & volatility tracking
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Timestamp */}
              <div className="mt-4 text-xs text-white/30 text-center">
                Last updated: {new Date(eviData.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EVIMonitor;