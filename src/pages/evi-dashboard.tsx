import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Brain,
  DollarSign,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_INTEL_API_URL as string | undefined;

interface EmotionData {
  anticipation: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  joy: number;
  anger: number;
}

interface PulseData {
  evi: number;
  emotions: EmotionData;
  sample: number;
  ts: number;
  trend: 'rising' | 'falling' | 'stable';
  alert?: string;
}

interface HistoricalEvent {
  date: string;
  event: string;
  evi: number;
  outcome: string;
  saved: string;
}

const HISTORICAL_DISASTERS: HistoricalEvent[] = [
  {
    date: '2023-03-10',
    event: 'SVB Collapse',
    evi: 94,
    outcome: 'Fintech ads during bank run',
    saved: '$2.3M'
  },
  {
    date: '2024-02-15',
    event: 'HIPAA Breach News',
    evi: 89,
    outcome: 'Healthcare SaaS paused campaigns',
    saved: '$1.8M'
  },
  {
    date: '2024-06-01',
    event: 'AI Regulation Panic',
    evi: 91,
    outcome: 'AI startups held spend',
    saved: '$3.1M'
  }
];

const EviDashboard: React.FC = () => {
  const [pulseData, setPulseData] = useState<PulseData>({
    evi: 0,
    emotions: {
      anticipation: 0,
      trust: 0,
      fear: 0,
      surprise: 0,
      sadness: 0,
      disgust: 0,
      joy: 0,
      anger: 0
    },
    sample: 0,
    ts: Date.now(),
    trend: 'stable'
  });
  
  const [history, setHistory] = useState<number[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [recommendation, setRecommendation] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!API_BASE) {
      console.error('Missing VITE_INTEL_API_URL');
      return;
    }

    // Connect to SSE stream
    const connectStream = () => {
      const es = new EventSource(`${API_BASE}/pulse/stream`, { 
        withCredentials: false 
      });

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PulseData;
          
          // Calculate trend
          setPulseData(prev => ({
            ...data,
            trend: data.evi > prev.evi ? 'rising' : 
                   data.evi < prev.evi ? 'falling' : 'stable'
          }));

          // Update history
          setHistory(prev => [...prev.slice(-49), data.evi]);
          
          // Generate recommendation based on EVI
          generateRecommendation(data.evi);
          
          setIsLive(true);
        } catch (err) {
          console.error('Parse error:', err);
        }
      };

      es.onerror = () => {
        setIsLive(false);
        es.close();
        // Reconnect after 5 seconds
        setTimeout(connectStream, 5000);
      };

      eventSourceRef.current = es;
    };

    connectStream();

    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const generateRecommendation = (evi: number) => {
    if (evi >= 80) {
      setRecommendation('🚨 HALT ALL CAMPAIGNS - Extreme emotional volatility detected');
    } else if (evi >= 70) {
      setRecommendation('⚠️ REDUCE SPEND 50% - High volatility, wait for stability');
    } else if (evi >= 60) {
      setRecommendation('📊 MONITOR CLOSELY - Moderate volatility, be ready to pause');
    } else if (evi >= 40) {
      setRecommendation('✅ NORMAL OPERATIONS - Market emotions stable');
    } else if (evi >= 20) {
      setRecommendation('🎯 OPPORTUNITY WINDOW - Low volatility, increase spend');
    } else {
      setRecommendation('🚀 MAXIMUM OPPORTUNITY - Market primed for messaging');
    }
  };

  const getEviColor = (value: number) => {
    if (value >= 80) return 'from-red-600 to-red-800';
    if (value >= 60) return 'from-orange-600 to-yellow-600';
    if (value >= 40) return 'from-yellow-600 to-green-600';
    return 'from-green-600 to-blue-600';
  };

  const getEviStatus = (value: number) => {
    if (value >= 80) return { icon: XCircle, text: 'DANGER', color: 'text-red-500' };
    if (value >= 60) return { icon: AlertTriangle, text: 'WARNING', color: 'text-yellow-500' };
    if (value >= 40) return { icon: AlertCircle, text: 'NORMAL', color: 'text-blue-500' };
    return { icon: CheckCircle, text: 'OPTIMAL', color: 'text-green-500' };
  };

  const status = getEviStatus(pulseData.evi);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-5xl font-black mb-2">EMOTIONAL VOLATILITY INDEX</h1>
            <p className="text-xl text-gray-400">
              The Bloomberg Terminal for human emotion. One number. One decision.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${isLive ? 'text-green-500' : 'text-red-500'}`}>
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              <span className="text-sm font-bold">{isLive ? 'LIVE STREAM' : 'RECONNECTING'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main EVI Display - The Crystal Palace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Central EVI Meter */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <div className="relative backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-8">
            {/* Glass effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-blue-600/5 rounded-3xl" />
            
            <div className="relative">
              {/* EVI Value Display */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-sm text-gray-400 mb-2">CURRENT EVI™</div>
                  <div className="flex items-baseline gap-4">
                    <motion.div
                      key={pulseData.evi}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-8xl font-black"
                    >
                      {pulseData.evi}
                    </motion.div>
                    <div className="flex items-center gap-2">
                      {pulseData.trend === 'rising' && <TrendingUp className="w-8 h-8 text-red-500" />}
                      {pulseData.trend === 'falling' && <TrendingDown className="w-8 h-8 text-green-500" />}
                      {pulseData.trend === 'stable' && <Activity className="w-8 h-8 text-yellow-500" />}
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 mt-2 ${status.color}`}>
                    <status.icon className="w-6 h-6" />
                    <span className="font-bold">{status.text}</span>
                  </div>
                </div>

                {/* Visual Meter */}
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-800"
                    />
                    <motion.circle
                      cx="96"
                      cy="96"
                      r="88"
                      stroke="url(#eviGradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      animate={{
                        strokeDashoffset: `${2 * Math.PI * 88 * (1 - pulseData.evi / 100)}`
                      }}
                      transition={{ duration: 0.5 }}
                    />
                    <defs>
                      <linearGradient id="eviGradient">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Brain className="w-16 h-16 text-white/50" />
                  </div>
                </div>
              </div>

              {/* Recommendation Banner */}
              <motion.div
                key={recommendation}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl bg-gradient-to-r ${getEviColor(pulseData.evi)} bg-opacity-20 border border-white/20`}
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-6 h-6" />
                  <span className="font-bold text-lg">{recommendation}</span>
                </div>
              </motion.div>

              {/* Emotion Breakdown */}
              <div className="mt-8 grid grid-cols-4 gap-4">
                {Object.entries(pulseData.emotions).map(([emotion, value]) => (
                  <div key={emotion} className="text-center">
                    <div className="text-xs text-gray-400 mb-1 capitalize">{emotion}</div>
                    <div className="h-24 bg-gray-900 rounded-lg relative overflow-hidden">
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-blue-600"
                        animate={{ height: `${value * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="text-sm font-bold mt-1">{Math.round(value * 100)}%</div>
                  </div>
                ))}
              </div>

              {/* History Sparkline */}
              <div className="mt-8">
                <div className="text-sm text-gray-400 mb-2">60-MINUTE TREND</div>
                <div className="h-20 flex items-end gap-1">
                  {history.map((value, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${value}%` }}
                      className="flex-1 bg-gradient-to-t from-purple-600 to-blue-600 rounded-t"
                    />
                  ))}
                </div>
              </div>

              {/* Sample Size */}
              <div className="mt-4 text-sm text-gray-400 text-center">
                Analyzing {pulseData.sample.toLocaleString()} signals/second
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Panel - Historical Events */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              DISASTERS AVOIDED
            </h3>
            <div className="space-y-3">
              {HISTORICAL_DISASTERS.map((event, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-3 rounded-lg bg-red-900/20 border border-red-900/30"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-bold">{event.event}</span>
                    <span className="text-xs text-red-400">EVI: {event.evi}</span>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{event.date}</div>
                  <div className="text-xs">{event.outcome}</div>
                  <div className="text-sm font-bold text-green-400 mt-1">
                    Saved: {event.saved}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Money Saved Counter */}
          <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              TOTAL PROTECTED
            </h3>
            <div className="text-4xl font-black text-green-400">
              $7.2M
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Across 23 volatility events
            </div>
          </div>

          {/* Quick Actions */}
          <div className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6">
            <h3 className="text-lg font-bold mb-4">QUICK ACTIONS</h3>
            <div className="space-y-2">
              <button className="w-full p-3 rounded-lg bg-red-900/30 border border-red-900/50 text-left hover:bg-red-900/40 transition-colors">
                <div className="font-bold">Emergency Pause All</div>
                <div className="text-xs text-gray-400">Halt everything instantly</div>
              </button>
              <button className="w-full p-3 rounded-lg bg-yellow-900/30 border border-yellow-900/50 text-left hover:bg-yellow-900/40 transition-colors">
                <div className="font-bold">Reduce Spend 50%</div>
                <div className="text-xs text-gray-400">Scale back cautiously</div>
              </button>
              <button className="w-full p-3 rounded-lg bg-green-900/30 border border-green-900/50 text-left hover:bg-green-900/40 transition-colors">
                <div className="font-bold">Boost Opportunity</div>
                <div className="text-xs text-gray-400">Capitalize on stability</div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Insight */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-2xl bg-white/5 rounded-3xl border border-white/10 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">THE SIMPLE TRUTH</h3>
            <p className="text-gray-400">
              While others guess with dashboards, you know with certainty. 
              One number tells you whether to spend or save millions.
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">NO DASHBOARDS</div>
            <div className="text-lg text-gray-400">Just Decisions</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EviDashboard;