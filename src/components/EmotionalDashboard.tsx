/**
 * Emotional Intelligence Dashboard
 * See what your users feel, not just what they do
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEmotionalIntelligence, EmotionalState } from '../services/emotional-intelligence';
import EVIDisplay from './EVIDisplay';

// Emotion colors - these matter psychologically
const EMOTION_COLORS: Record<EmotionalState, string> = {
  [EmotionalState.CURIOSITY]: '#10B981', // Emerald - growth
  [EmotionalState.FRUSTRATION]: '#F59E0B', // Amber - warning
  [EmotionalState.ANXIETY]: '#8B5CF6', // Violet - tension
  [EmotionalState.CONFIDENCE]: '#3B82F6', // Blue - trust
  [EmotionalState.HESITATION]: '#F97316', // Orange - caution
  [EmotionalState.URGENCY]: '#EF4444', // Red - action
  [EmotionalState.CONFUSION]: '#6B7280', // Gray - uncertainty
  [EmotionalState.DELIGHT]: '#EC4899', // Pink - joy
  [EmotionalState.RAGE]: '#DC2626', // Deep red - danger
  [EmotionalState.ABANDONMENT]: '#991B1B', // Dark red - loss
  [EmotionalState.DISCOVERY]: '#06B6D4', // Cyan - exploration
  [EmotionalState.DECISION_PARALYSIS]: '#A855F7' // Purple - stuck
};

// Emotion icons - visual language
const EMOTION_ICONS: Record<EmotionalState, string> = {
  [EmotionalState.CURIOSITY]: '🔍',
  [EmotionalState.FRUSTRATION]: '😤',
  [EmotionalState.ANXIETY]: '😰',
  [EmotionalState.CONFIDENCE]: '💪',
  [EmotionalState.HESITATION]: '🤔',
  [EmotionalState.URGENCY]: '⚡',
  [EmotionalState.CONFUSION]: '😵',
  [EmotionalState.DELIGHT]: '🤩',
  [EmotionalState.RAGE]: '🤬',
  [EmotionalState.ABANDONMENT]: '🚪',
  [EmotionalState.DISCOVERY]: '✨',
  [EmotionalState.DECISION_PARALYSIS]: '🔄'
};

interface EmotionalPulse {
  id: string;
  emotion: EmotionalState;
  x: number;
  y: number;
  timestamp: number;
}

export const EmotionalDashboard: React.FC = () => {
  const { emotionalState, conversionProbability, journey, profile } = useEmotionalIntelligence();
  const [pulses, setPulses] = useState<EmotionalPulse[]>([]);
  const [isRealTime, setIsRealTime] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const animationRef = useRef<number>(); // Reserved for future animation loop

  // Emotional heatmap visualization
  useEffect(() => {
    if (!canvasRef.current || !emotionalState) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Create gradient based on emotional intensity
    const gradient = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, 0,
      canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    
    const color = EMOTION_COLORS[emotionalState.state];
    const intensity = emotionalState.intensity / 100;
    
    gradient.addColorStop(0, `${color}${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(0.5, `${color}${Math.floor(intensity * 128).toString(16).padStart(2, '0')}`);
    gradient.addColorStop(1, `${color}00`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [emotionalState]);

  // Add emotional pulses when state changes
  useEffect(() => {
    if (!emotionalState) return;
    
    const newPulse: EmotionalPulse = {
      id: `${Date.now()}-${Math.random()}`,
      emotion: emotionalState.state,
      x: Math.random() * 100,
      y: Math.random() * 100,
      timestamp: Date.now()
    };
    
    setPulses(prev => [...prev.slice(-20), newPulse]); // Keep last 20 pulses
  }, [emotionalState?.state]);

  // Clean old pulses
  useEffect(() => {
    const interval = setInterval(() => {
      setPulses(prev => prev.filter(p => Date.now() - p.timestamp < 10000));
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Calculate emotional momentum
  const getEmotionalMomentum = () => {
    if (journey.length < 2) return 'stable';
    const recent = journey.slice(-5);
    const changes = new Set(recent.map(j => j.state)).size;
    if (changes === 1) return 'locked';
    if (changes === 2) return 'shifting';
    if (changes >= 3) return 'volatile';
    return 'stable';
  };

  const momentum = getEmotionalMomentum();

  return (
    <div className="emotional-dashboard bg-black text-white p-6 rounded-xl relative overflow-hidden">
      {/* Background emotional field */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 opacity-20"
        width={800}
        height={600}
      />
      
      {/* Header */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Emotional Intelligence Engine
          </h2>
          <button
            onClick={() => setIsRealTime(!isRealTime)}
            className={`px-4 py-2 rounded-lg transition-all ${
              isRealTime ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            {isRealTime ? '● LIVE' : '⏸ PAUSED'}
          </button>
        </div>
        <p className="text-gray-400 mt-2">Reading emotional signals in real-time</p>
      </div>

      {/* Emotional Volatility Index - The Data Moat */}
      <div className="relative z-10 mb-8">
        <EVIDisplay 
          value={emotionalState?.volatilityIndex || 50} 
          trend={momentum === 'volatile' ? 'up' : momentum === 'locked' ? 'down' : 'stable'}
          className="w-full"
        />
      </div>

      {/* Current State Display */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Primary Emotion */}
        <motion.div 
          className="bg-gray-900/80 backdrop-blur p-6 rounded-lg border"
          style={{ borderColor: emotionalState ? EMOTION_COLORS[emotionalState.state] : '#374151' }}
          animate={{ 
            boxShadow: emotionalState 
              ? `0 0 ${emotionalState.intensity}px ${EMOTION_COLORS[emotionalState.state]}`
              : 'none'
          }}
        >
          <div className="text-sm text-gray-400 mb-2">CURRENT EMOTION</div>
          {emotionalState ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl">{EMOTION_ICONS[emotionalState.state]}</span>
                <div>
                  <div className="text-xl font-bold">
                    {emotionalState.state.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-400">
                    {emotionalState.confidence}% confidence
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Intensity</span>
                  <span>{emotionalState.intensity}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <motion.div 
                    className="h-2 rounded-full"
                    style={{ backgroundColor: EMOTION_COLORS[emotionalState.state] }}
                    animate={{ width: `${emotionalState.intensity}%` }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="text-gray-500">Calibrating...</div>
          )}
        </motion.div>

        {/* Conversion Probability */}
        <motion.div className="bg-gray-900/80 backdrop-blur p-6 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">CONVERSION PROBABILITY</div>
          <div className="relative h-32">
            <svg className="w-full h-full">
              <circle
                cx="50%"
                cy="50%"
                r="40"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="40"
                fill="none"
                stroke={conversionProbability > 60 ? '#10B981' : conversionProbability > 30 ? '#F59E0B' : '#EF4444'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                animate={{
                  strokeDashoffset: `${2 * Math.PI * 40 * (1 - conversionProbability / 100)}`
                }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-bold">{Math.round(conversionProbability)}%</div>
                <div className="text-xs text-gray-400">likelihood</div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-sm">
            <span className="text-gray-400">Predicted Action: </span>
            <span className="text-white font-medium">
              {emotionalState?.predictedAction.replace('_', ' ')}
            </span>
          </div>
        </motion.div>

        {/* Emotional Momentum */}
        <motion.div className="bg-gray-900/80 backdrop-blur p-6 rounded-lg">
          <div className="text-sm text-gray-400 mb-2">EMOTIONAL MOMENTUM</div>
          <div className="flex items-center justify-center h-24">
            <div className={`text-4xl font-bold ${
              momentum === 'locked' ? 'text-green-400' :
              momentum === 'shifting' ? 'text-yellow-400' :
              momentum === 'volatile' ? 'text-red-400' :
              'text-gray-400'
            }`}>
              {momentum === 'locked' ? '🔒' :
               momentum === 'shifting' ? '🔄' :
               momentum === 'volatile' ? '⚠️' :
               '➡️'}
            </div>
            <div className="ml-4">
              <div className="text-xl font-bold capitalize">{momentum}</div>
              <div className="text-sm text-gray-400">
                {momentum === 'locked' ? 'User is focused' :
                 momentum === 'shifting' ? 'Emotion changing' :
                 momentum === 'volatile' ? 'High uncertainty' :
                 'Steady state'}
              </div>
            </div>
          </div>
          {emotionalState && (
            <div className="mt-4 text-sm">
              <span className="text-gray-400">Intervention Window: </span>
              <span className="text-white font-medium">
                {(emotionalState.interventionWindow / 1000).toFixed(1)}s
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Emotional Journey Timeline */}
      <div className="relative z-10 bg-gray-900/80 backdrop-blur p-6 rounded-lg mb-8">
        <h3 className="text-lg font-bold mb-4">Emotional Journey</h3>
        <div className="relative h-20 overflow-hidden">
          <div className="absolute inset-0 flex items-center">
            {journey.slice(-20).map((state, index) => (
              <motion.div
                key={`${state.state}-${index}`}
                className="flex-shrink-0 mx-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${EMOTION_COLORS[state.state]}20` }}
                  title={`${state.state} (${state.confidence}%)`}
                >
                  {EMOTION_ICONS[state.state]}
                </div>
                <div className="text-xs text-center mt-1 text-gray-400">
                  {state.confidence}%
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Emotional Profile */}
      <div className="relative z-10 bg-gray-900/80 backdrop-blur p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Session Emotional Profile</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(profile).map(([emotion, count]) => (
            <div key={emotion} className="text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto mb-2"
                style={{ backgroundColor: `${EMOTION_COLORS[emotion as EmotionalState]}20` }}
              >
                {EMOTION_ICONS[emotion as EmotionalState]}
              </div>
              <div className="text-sm font-medium">{emotion.replace('_', ' ')}</div>
              <div className="text-xs text-gray-400">{String(count)} times</div>
            </div>
          ))}
        </div>
      </div>

      {/* Emotional Pulses Animation */}
      <AnimatePresence>
        {pulses.map(pulse => (
          <motion.div
            key={pulse.id}
            className="absolute pointer-events-none"
            style={{
              left: `${pulse.x}%`,
              top: `${pulse.y}%`,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: 'easeOut' }}
          >
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: EMOTION_COLORS[pulse.emotion] }}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Intervention Alert */}
      {emotionalState && emotionalState.confidence > 85 && (
        <motion.div
          className="absolute top-4 right-4 bg-red-500/90 text-white px-4 py-2 rounded-lg"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
        >
          <div className="font-bold">INTERVENTION OPPORTUNITY</div>
          <div className="text-sm">{emotionalState.state} detected at {emotionalState.confidence}%</div>
        </motion.div>
      )}
    </div>
  );
};

export default EmotionalDashboard;