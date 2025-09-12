/**
 * Emotional Volatility Index™ Display
 * The VIX for digital experiences - SentientIQ's data moat
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface EVIDisplayProps {
  value: number;
  trend?: 'up' | 'down' | 'stable';
  className?: string;
}

const EVIDisplay = ({ value = 50, trend = 'stable', className = '' }: EVIDisplayProps) => {
  const [previousValue, setPreviousValue] = useState(value);
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    // Animate value changes
    const steps = 20;
    const increment = (value - previousValue) / steps;
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep <= steps) {
        setDisplayValue(prev => prev + increment);
      } else {
        clearInterval(interval);
        setDisplayValue(value);
        setPreviousValue(value);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [value]);
  
  // Determine status based on EVI value
  const getStatus = () => {
    if (value < 30) return { label: 'Calm', color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle };
    if (value < 50) return { label: 'Normal', color: 'text-blue-400', bg: 'bg-blue-500/20', icon: Activity };
    if (value < 70) return { label: 'Choppy', color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Activity };
    if (value < 85) return { label: 'Volatile', color: 'text-orange-400', bg: 'bg-orange-500/20', icon: AlertTriangle };
    return { label: 'Crisis', color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle };
  };
  
  const status = getStatus();
  const Icon = status.icon;
  
  // Calculate the meter fill
  const meterFill = Math.min(100, Math.max(0, displayValue));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${status.bg}`}>
            <Icon className={`w-5 h-5 ${status.color}`} />
          </div>
          <div>
            <h3 className="text-sm text-white/60 font-medium">Emotional Volatility Index™</h3>
            <p className="text-xs text-white/40">Real-time emotional weather</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-400" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-green-400" />}
            {trend === 'stable' && <Activity className="w-4 h-4 text-blue-400" />}
            <span className={`text-2xl font-bold ${status.color}`}>
              {displayValue.toFixed(1)}
            </span>
          </div>
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
      </div>
      
      {/* Visual Meter */}
      <div className="relative h-8 bg-black/30 rounded-full overflow-hidden mb-4">
        {/* Background gradient showing zones */}
        <div className="absolute inset-0 flex">
          <div className="w-[30%] bg-gradient-to-r from-green-500/20 to-green-400/20" />
          <div className="w-[20%] bg-gradient-to-r from-blue-500/20 to-blue-400/20" />
          <div className="w-[20%] bg-gradient-to-r from-yellow-500/20 to-yellow-400/20" />
          <div className="w-[15%] bg-gradient-to-r from-orange-500/20 to-orange-400/20" />
          <div className="w-[15%] bg-gradient-to-r from-red-500/20 to-red-400/20" />
        </div>
        
        {/* Current value indicator */}
        <motion.div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-400"
          initial={{ width: 0 }}
          animate={{ width: `${meterFill}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        
        {/* Value marker */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full shadow-lg"
          initial={{ left: 0 }}
          animate={{ left: `${meterFill}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      {/* Scale Reference */}
      <div className="flex justify-between text-xs text-white/40">
        <span>0</span>
        <span>30</span>
        <span>50</span>
        <span>70</span>
        <span>85</span>
        <span>100</span>
      </div>
      
      {/* Interpretation */}
      <div className="mt-4 p-3 bg-black/20 rounded-lg">
        <p className="text-xs text-white/60">
          {value < 30 && "Exceptional user experience. Emotions flowing smoothly, high confidence detected."}
          {value >= 30 && value < 50 && "Normal digital friction. Users navigating with typical hesitation patterns."}
          {value >= 50 && value < 70 && "Elevated emotional friction. Multiple hesitation and confusion events detected."}
          {value >= 70 && value < 85 && "High volatility warning. Rage clicks and abandonment signals increasing."}
          {value >= 85 && "Critical emotional state. Mass frustration detected. Immediate intervention needed."}
        </p>
      </div>
      
      {/* Live indicator */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-white/40">Live data from {Math.floor(Math.random() * 50 + 10)} sites</span>
        </div>
        <span className="text-xs text-white/40">
          Like VIX for digital emotions
        </span>
      </div>
    </motion.div>
  );
};

export default EVIDisplay;