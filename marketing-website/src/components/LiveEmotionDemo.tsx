/**
 * Live Emotion Detection Demo
 * 
 * The ultimate "holy shit" moment in marketing.
 * They feel it. We detect it. They buy it.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmotionEvent {
  id: string;
  emotion: string;
  confidence: number;
  timestamp: number;
  trigger: string;
  element?: string;
}

interface EmotionState {
  current: string;
  confidence: number;
  intensity: number;
  microBehaviors: string[];
}

interface Intervention {
  id: string;
  type: 'chat' | 'discount' | 'guide' | 'support' | 'upsell';
  message: string;
  timestamp: number;
}

const EMOTION_COLORS: Record<string, string> = {
  rage: '#ef4444',
  frustration: '#f97316',
  hesitation: '#eab308',
  confusion: '#a855f7',
  curiosity: '#3b82f6',
  delight: '#10b981',
  confidence: '#14b8a6',
  abandonment: '#dc2626',
  normal: '#6b7280'
};

const EMOTION_MESSAGES: Record<string, string> = {
  rage: "You're rage clicking. We see it.",
  frustration: "That scrolling pattern shows frustration.",
  hesitation: "2.3 seconds of hesitation detected.",
  confusion: "Up, down, up... you're lost.",
  curiosity: "Smooth exploration. You're interested.",
  delight: "That engagement pattern = delight.",
  confidence: "Decisive clicks. High confidence.",
  abandonment: "Mouse heading to close button...",
  normal: "Reading normally. Calm state."
};

export default function LiveEmotionDemo() {
  const [isActive, setIsActive] = useState(true); // AUTO-START!
  const [currentEmotion, setCurrentEmotion] = useState<EmotionState>({
    current: 'normal',
    confidence: 0,
    intensity: 0,
    microBehaviors: []
  });
  const [emotionHistory, setEmotionHistory] = useState<EmotionEvent[]>([]);
  const [clickCount, setClickCount] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [activeInterventions, setActiveInterventions] = useState<Intervention[]>([]);
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 11)); // Stable session ID
  const [isMobile] = useState(() => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0))
  
  // Refs for tracking - optimized for speed
  const clickTimesRef = useRef<number[]>([]);
  const scrollPositionsRef = useRef<number[]>([]);
  const lastMousePosRef = useRef({ x: 0, y: 0, time: 0 });
  const hoverStartRef = useRef<number>(0);
  const detectionCooldownRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const demoAreaRef = useRef<HTMLDivElement>(null);
  
  // Rate limiting - optimized for high traffic
  const DETECTION_COOLDOWN = 1500; // Faster response
  const MAX_EVENTS_PER_MINUTE = 15; // More events allowed
  const VELOCITY_SAMPLE_RATE = 16; // 60fps tracking
  
  /**
   * Detect rage from rapid clicking - OPTIMIZED
   */
  const detectRage = useCallback(() => {
    const now = performance.now();
    const recentClicks = clickTimesRef.current.filter(t => now - t < 1500);
    
    if (recentClicks.length >= 3) {
      let totalInterval = 0;
      for (let i = 1; i < recentClicks.length; i++) {
        totalInterval += recentClicks[i] - recentClicks[i - 1];
      }
      const avgInterval = totalInterval / (recentClicks.length - 1);
      
      if (avgInterval < 400 && now - detectionCooldownRef.current > DETECTION_COOLDOWN) {
        const confidence = Math.min(98, 100 - (avgInterval / 4));
        const intensity = recentClicks.length >= 5 ? 'EXTREME' : 'HIGH';
        triggerEmotion('rage', confidence, `${intensity}: ${recentClicks.length} clicks @ ${Math.round(avgInterval)}ms`);
        detectionCooldownRef.current = now;
        clickTimesRef.current = []; // Clear clicks after rage detection
        // Haptic feedback if available
        if ('vibrate' in navigator) navigator.vibrate(200);
      }
    }
  }, []);
  
  /**
   * Detect hesitation from hovering - INSTANT FEEDBACK
   */
  const detectHesitation = useCallback((element: string) => {
    const now = performance.now();
    const hoverDuration = now - hoverStartRef.current;
    if (now - detectionCooldownRef.current > DETECTION_COOLDOWN) {
      const confidence = Math.min(92, 60 + (hoverDuration / 80));
      triggerEmotion('hesitation', confidence, `${(hoverDuration/1000).toFixed(1)}s hover`);
      detectionCooldownRef.current = now;
      hoverStartRef.current = 0; // Reset so it doesn't keep triggering
      // Visual pulse on detection
      if (demoAreaRef.current) {
        demoAreaRef.current.style.transform = 'scale(1.02)';
        setTimeout(() => {
          if (demoAreaRef.current) demoAreaRef.current.style.transform = 'scale(1)';
        }, 200);
      }
    }
  }, []);
  
  /**
   * Detect confusion from scroll patterns - REAL-TIME
   */
  const detectConfusion = useCallback(() => {
    if (scrollPositionsRef.current.length >= 3) {
      const recent = scrollPositionsRef.current.slice(-3);
      const velocity = Math.abs(recent[2] - recent[0]) / 100;
      
      // Check for direction reversal
      const dir1 = recent[1] - recent[0];
      const dir2 = recent[2] - recent[1];
      const isReversal = (dir1 * dir2) < 0;
      
      if (isReversal && velocity > 2 && performance.now() - detectionCooldownRef.current > DETECTION_COOLDOWN) {
        const confidence = Math.min(88, 70 + velocity * 3);
        triggerEmotion('confusion', confidence, `Scroll reversal @ ${velocity.toFixed(1)}x speed`);
        detectionCooldownRef.current = performance.now();
      }
    }
  }, []);
  
  /**
   * Detect abandonment from mouse movement - PREDICTIVE
   */
  const detectAbandonment = useCallback((x: number, y: number) => {
    const now = performance.now();
    const timeDelta = now - lastMousePosRef.current.time;
    
    if (timeDelta > VELOCITY_SAMPLE_RATE) {
      const velocity = Math.sqrt(
        Math.pow(x - lastMousePosRef.current.x, 2) + 
        Math.pow(y - lastMousePosRef.current.y, 2)
      ) / timeDelta * 1000;
      
      // Predictive exit detection
      const exitZone = y < 150 && (x < 200 || x > window.innerWidth - 200);
      const highVelocity = velocity > 500;
      const upwardTrajectory = y < lastMousePosRef.current.y;
      
      if (exitZone && highVelocity && upwardTrajectory && 
          now - detectionCooldownRef.current > DETECTION_COOLDOWN) {
        const confidence = Math.min(91, 75 + (velocity / 50));
        triggerEmotion('abandonment', confidence, `EXIT PREDICTED: ${Math.round(velocity)}px/s upward`);
        detectionCooldownRef.current = now;
        // Flash warning
        document.body.style.transition = 'background-color 0.2s';
        document.body.style.backgroundColor = '#220000';
        setTimeout(() => {
          document.body.style.backgroundColor = '';
        }, 200);
      }
    }
  }, []);
  
  /**
   * Trigger emotion detection - INSTANT FEEDBACK
   */
  const triggerEmotion = useCallback((emotion: string, confidence: number, trigger: string) => {
    // Rate limiting check
    const now = performance.now();
    const recentEvents = emotionHistory.filter(e => now - e.timestamp < 60000);
    if (recentEvents.length >= MAX_EVENTS_PER_MINUTE) return;
    
    const event: EmotionEvent = {
      id: `${emotion}_${now}`,
      emotion,
      confidence,
      timestamp: now,
      trigger
    };
    
    // Instant state update
    setCurrentEmotion({
      current: emotion,
      confidence,
      intensity: confidence > 85 ? 95 : confidence > 70 ? 80 : 60,
      microBehaviors: [trigger]
    });
    
    setEmotionHistory(prev => [event, ...prev].slice(0, 7));
    
    // TRIGGER IN-BROWSER INTERVENTIONS!
    // Only trigger for high-confidence, meaningful emotions
    if (confidence > 80 && emotion !== 'normal' && emotion !== 'curiosity') {
      // Delay slightly so user sees emotion first
      setTimeout(() => triggerIntervention(emotion), 500);
    }
    
    // Audio feedback for high confidence detections (only after user interaction)
    if (confidence > 85 && 'AudioContext' in window && clickCount > 0) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        
        // Resume if suspended (Chrome autoplay policy)
        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = emotion === 'rage' ? 200 : 400;
        gainNode.gain.value = 0.05; // Even quieter
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        // Silently fail if audio not allowed
        console.debug('Audio feedback skipped:', e);
      }
    }
    
    // Reset to normal after 2.5 seconds
    setTimeout(() => {
      setCurrentEmotion(prev => 
        prev.current === emotion ? { ...prev, current: 'normal', confidence: 0 } : prev
      );
    }, 2500);
  }, [emotionHistory]);
  
  /**
   * Trigger live interventions in the browser!
   */
  const triggerIntervention = useCallback((emotion: string) => {
    let intervention: Intervention | null = null;
    
    switch(emotion) {
      case 'rage':
        intervention = {
          id: `int_${Date.now()}`,
          type: 'chat',
          message: 'We noticed you might be having trouble. Can we help?',
          timestamp: Date.now()
        };
        break;
      case 'hesitation':
        intervention = {
          id: `int_${Date.now()}`,
          type: 'discount',
          message: '15% OFF - Just for you, right now!',
          timestamp: Date.now()
        };
        break;
      case 'confusion':
        intervention = {
          id: `int_${Date.now()}`,
          type: 'guide',
          message: 'Click here for a guided tour →',
          timestamp: Date.now()
        };
        break;
      case 'abandonment':
        intervention = {
          id: `int_${Date.now()}`,
          type: 'support',
          message: 'Wait! Your account manager is available now',
          timestamp: Date.now()
        };
        break;
      case 'confidence':
        intervention = {
          id: `int_${Date.now()}`,
          type: 'upsell',
          message: 'You qualify for our Enterprise plan →',
          timestamp: Date.now()
        };
        break;
    }
    
    if (intervention) {
      setActiveInterventions(prev => [...prev, intervention]);
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setActiveInterventions(prev => prev.filter(i => i.id !== intervention!.id));
      }, 5000);
    }
  }, []);
  
  /**
   * Start detection when demo activates
   */
  useEffect(() => {
    if (!isActive) return;
    
    const handleClick = (e: MouseEvent) => {
      const now = performance.now();
      clickTimesRef.current.push(now);
      clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 3000);
      setClickCount(prev => prev + 1);
      
      // Instant visual feedback
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
      
      // Get the actual button text
      const target = e.target as HTMLElement;
      const button = target.closest('.demo-target') as HTMLElement;
      const buttonText = button?.textContent || '';
      
      // Always check for rage first
      const recentClicks = clickTimesRef.current.filter(t => now - t < 1000);
      if (recentClicks.length >= 3) {
        detectRage();
      } else if (buttonText.includes('Confidence') && recentClicks.length === 1) {
        // Single click on Confidence button
        triggerEmotion('confidence', 92, 'Decisive button click');
      } else if (buttonText.includes('Rage') && recentClicks.length < 3) {
        // Clicking rage button but not fast enough yet - don't trigger anything
        return;
      }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle with RAF for performance
      if (rafRef.current) return;
      
      rafRef.current = requestAnimationFrame(() => {
        const { clientX: x, clientY: y } = e;
        const now = performance.now();
        
        // High-precision velocity tracking
        detectAbandonment(x, y);
        lastMousePosRef.current = { x, y, time: now };
        
        // Track hovers on interactive elements
        const target = e.target as HTMLElement;
        const button = target.closest('.demo-target') as HTMLElement;
        
        if (button) {
          if (!hoverStartRef.current) {
            hoverStartRef.current = now;
            button.style.transform = 'scale(1.05)';
          } else {
            // Check if we've been hovering long enough
            const hoverDuration = now - hoverStartRef.current;
            if (hoverDuration > 1200 && button.textContent?.includes('Hesitate')) {
              detectHesitation('button');
            }
          }
        } else {
          // Mouse left the button
          if (hoverStartRef.current) {
            const hoveredEl = document.querySelector('.demo-target[style*="scale"]') as HTMLElement;
            if (hoveredEl) hoveredEl.style.transform = '';
            hoverStartRef.current = 0;
          }
        }
        
        rafRef.current = 0;
      });
    };
    
    const handleScroll = () => {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        scrollPositionsRef.current.push(scrollY);
        if (scrollPositionsRef.current.length > 5) scrollPositionsRef.current.shift();
        detectConfusion();
      });
    };
    
    // Touch event handlers for mobile
    const handleTouchStart = (e: TouchEvent) => {
      if (isMobile) {
        const now = performance.now();
        clickTimesRef.current.push(now);
        clickTimesRef.current = clickTimesRef.current.filter(t => now - t < 2000);
        setClickCount(prev => prev + 1);
        
        // Detect rapid taps (mobile rage)
        if (clickTimesRef.current.length >= 3) {
          const intervals: number[] = [];
          for (let i = 1; i < clickTimesRef.current.length; i++) {
            intervals.push(clickTimesRef.current[i] - clickTimesRef.current[i - 1]);
          }
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          
          if (avgInterval < 500) {
            triggerEmotion('frustration', 85, `Rapid taps: ${clickTimesRef.current.length}x`);
            clickTimesRef.current = [];
          }
        }
      }
    };
    
    // Attach listeners
    document.addEventListener('click', handleClick);
    if (!isMobile) {
      document.addEventListener('mousemove', handleMouseMove);
    }
    document.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('scroll', handleScroll);
    
    // Add click ripple styles
    const style = document.createElement('style');
    style.innerHTML = `
      .click-ripple {
        position: fixed;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(147, 51, 234, 0.3);
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: ripple 0.6s ease-out;
        z-index: 10000;
      }
      @keyframes ripple {
        to {
          width: 80px;
          height: 80px;
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.removeEventListener('click', handleClick);
      if (!isMobile) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
      document.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('scroll', handleScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      style.remove();
    };
  }, [isActive, detectRage, detectHesitation, detectConfusion, detectAbandonment, triggerEmotion]);
  
  return (
    <section className="section py-16 relative overflow-hidden">
      {/* LIVE IN-BROWSER INTERVENTIONS */}
      <AnimatePresence>
        {activeInterventions.map((intervention, idx) => {
          const positions = [
            { bottom: 20, right: 20 },
            { bottom: 20, left: 20 },
            { top: 100, right: 20 },
            { bottom: 100, right: 20 }
          ];
          const pos = positions[idx % positions.length];
          
          return (
            <motion.div
              key={intervention.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed z-[9999] max-w-sm"
              style={{ ...pos, position: 'fixed' }}
            >
              {intervention.type === 'chat' && (
                <div className="bg-blue-600 text-white p-4 rounded-lg shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-sm font-semibold">Support Chat</span>
                  </div>
                  <p>{intervention.message}</p>
                </div>
              )}
              
              {intervention.type === 'discount' && (
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-lg shadow-2xl animate-pulse">
                  <div className="text-2xl font-bold mb-1">🎉 SPECIAL OFFER</div>
                  <p className="text-lg">{intervention.message}</p>
                  <button className="mt-2 bg-white text-purple-600 px-4 py-2 rounded font-semibold">
                    CLAIM NOW
                  </button>
                </div>
              )}
              
              {intervention.type === 'guide' && (
                <div className="bg-green-600 text-white p-4 rounded-lg shadow-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👋</span>
                    <div>
                      <p className="font-semibold">Need help?</p>
                      <p className="text-sm">{intervention.message}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {intervention.type === 'support' && (
                <div className="bg-red-600 text-white p-4 rounded-lg shadow-2xl animate-bounce">
                  <div className="text-lg font-bold mb-1">⚡ URGENT</div>
                  <p>{intervention.message}</p>
                  <button className="mt-2 bg-white text-red-600 px-4 py-2 rounded font-semibold">
                    CONNECT NOW
                  </button>
                </div>
              )}
              
              {intervention.type === 'upsell' && (
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-4 rounded-lg shadow-2xl">
                  <div className="text-lg font-bold mb-1">⭐ EXCLUSIVE</div>
                  <p>{intervention.message}</p>
                  <button className="mt-2 bg-white text-orange-600 px-4 py-2 rounded font-semibold">
                    LEARN MORE
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {/* Emotional background pulse */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: `radial-gradient(circle at center, ${EMOTION_COLORS[currentEmotion.current]}22 0%, transparent 70%)`
        }}
        transition={{ duration: 0.5 }}
      />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <p className="kicker">LIVE RIGHT NOW</p>
          <h2 className="mt-3 text-5xl font-bold">
            Your emotions. <span className="gradient-text">Detected instantly.</span>
          </h2>
          <p className="mt-4 text-lg text-white/70 max-w-2xl mx-auto">
            This page is watching you. Try clicking, hovering, or scrolling.
          </p>
        </div>
        
        {/* FULL WIDTH DEMO */}
        <div className="max-w-7xl mx-auto px-4">
          <div ref={demoAreaRef} className="glass-card p-8 rounded-2xl transition-transform duration-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Live Detection Active</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-white/60">DETECTING YOUR EMOTIONS</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Current Emotion Display - DRAMATIC */}
              <motion.div
                className="text-center py-8 relative"
                key={currentEmotion.current}
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
              >
                <motion.div 
                  className="text-6xl font-bold mb-4 relative"
                  style={{ color: EMOTION_COLORS[currentEmotion.current] }}
                  animate={{ 
                    textShadow: currentEmotion.current !== 'normal' 
                      ? `0 0 40px ${EMOTION_COLORS[currentEmotion.current]}55`
                      : '0 0 0px transparent'
                  }}
                >
                  {currentEmotion.current.toUpperCase()}
                  {currentEmotion.intensity > 90 && (
                    <motion.span
                      className="absolute -right-8 top-0 text-2xl"
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      ⚡
                    </motion.span>
                  )}
                </motion.div>
                {/* Always render confidence div with fixed height to prevent layout shift */}
                <div className="text-2xl text-white/60 mb-2" style={{ height: '36px' }}>
                  {currentEmotion.confidence > 0 ? `${currentEmotion.confidence.toFixed(0)}% confidence` : '\u00A0'}
                </div>
                {/* Always render message with fixed height */}
                <p className="text-lg text-white/80" style={{ minHeight: '32px' }}>
                  {EMOTION_MESSAGES[currentEmotion.current]}
                </p>
              </motion.div>
              
              {/* Interactive Targets - Mobile Responsive */}
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
                {!isMobile ? (
                  <>
                    <button className="demo-target glass-card p-4 hover:border-purple-400/50 transition-all">
                      <div className="text-base font-semibold">Hesitate</div>
                      <p className="text-xs text-white/60 mt-1">Hover 2s</p>
                    </button>
                    
                    <button className="demo-target glass-card p-4 hover:border-purple-400/50 transition-all">
                      <div className="text-base font-semibold">Rage Click</div>
                      <p className="text-xs text-white/60 mt-1">Click 3x fast</p>
                    </button>
                    
                    <button className="demo-target glass-card p-4 hover:border-purple-400/50 transition-all">
                      <div className="text-base font-semibold">Confidence</div>
                      <p className="text-xs text-white/60 mt-1">Click once</p>
                    </button>
                  </>
                ) : (
                  <>
                    <div className="glass-card p-6 text-center bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                      <div className="text-4xl mb-3">📱</div>
                      <h4 className="text-lg font-semibold mb-2">Mobile Detection Active</h4>
                      <p className="text-sm text-white/70 mb-4">
                        We detect emotions differently on mobile:
                      </p>
                      <div className="space-y-2 text-left text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Rapid taps = Frustration</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Swipe velocity = Searching</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>Pinch/zoom = Confusion</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span>App switch = Abandonment</span>
                        </div>
                      </div>
                      <p className="text-xs text-white/50 mt-4">
                        Try tapping rapidly or scrolling fast!
                      </p>
                    </div>
                  </>
                )}</div>
              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="glass-card p-3 text-center">
                  <div className="text-xl font-bold text-purple-400">{clickCount}</div>
                  <div className="text-xs text-white/60">Interactions</div>
                </div>
                <div className="glass-card p-3 text-center">
                  <div className="text-xl font-bold text-blue-400">{emotionHistory.length}</div>
                  <div className="text-xs text-white/60">Emotions Detected</div>
                </div>
              </div>
              
              {/* Compact History */}
              {emotionHistory.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-xs text-white/60 uppercase tracking-wider mb-2">Recent</h3>
                  <div className="space-y-1">
                    {emotionHistory.slice(0, 3).map((event) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: EMOTION_COLORS[event.emotion] }}
                        />
                        <span>{event.emotion}</span>
                        <span className="text-white/40">{event.confidence}%</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* BUSINESS DASHBOARD - FULL WIDTH BELOW */}
          <div className="glass-card p-8 rounded-2xl bg-gradient-to-br from-purple-900/10 to-blue-900/10 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold">What Your Business Sees</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-white/60">LIVE FEED</span>
              </div>
            </div>
            
            {/* Dashboard Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* User Identity */}
              <div className="p-4 bg-black/30 rounded-lg">
                <div className="text-xs text-purple-400 mb-1">USER IDENTIFIED</div>
                <div className="font-mono text-sm">
                  <div>Session: {sessionId}</div>
                  <div className="text-green-400">Value: $24,000/yr</div>
                  <div className="text-white/60">Company: Fortune 500</div>
                </div>
              </div>
              
              {/* Real-time Event Stream */}
              <div className="p-4 bg-black/30 rounded-lg">
                <div className="text-xs text-purple-400 mb-2">BEHAVIORAL STREAM</div>
                <div className="space-y-1 font-mono text-xs">
                  {emotionHistory.slice(0, 4).map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-white/40">{new Date(event.timestamp).toISOString().substring(11, 23)}</span>
                      <span className="text-yellow-400">EMOTION:</span>
                      <span style={{ color: EMOTION_COLORS[event.emotion] }}>
                        {event.emotion.toUpperCase()}
                      </span>
                      <span className="text-white/40">({event.confidence}%)</span>
                    </motion.div>
                  ))}
                  {emotionHistory.length === 0 && (
                    <div className="text-white/40">Waiting for behavioral signals...</div>
                  )}
                </div>
              </div>
              
              {/* Intervention Recommendation */}
              {currentEmotion.current !== 'normal' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
                >
                  <div className="text-xs text-red-400 mb-1">⚡ INTERVENTION REQUIRED</div>
                  <div className="text-sm font-medium">
                    {currentEmotion.current === 'rage' && 'Open support chat NOW'}
                    {currentEmotion.current === 'hesitation' && 'Offer assistance or discount'}
                    {currentEmotion.current === 'confusion' && 'Simplify page or guide user'}
                    {currentEmotion.current === 'abandonment' && 'URGENT: Save this customer'}
                    {currentEmotion.current === 'confidence' && 'Upsell opportunity detected'}
                    {currentEmotion.current === 'curiosity' && 'Engage with product demo'}
                  </div>
                  <div className="text-xs text-white/60 mt-2">
                    Revenue at risk: $24,000
                  </div>
                </motion.div>
              )}
              
              {/* Metrics Dashboard */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-black/30 rounded text-center">
                  <div className="text-2xl font-bold text-green-400">{clickCount}</div>
                  <div className="text-xs text-white/60">Interactions</div>
                </div>
                <div className="p-3 bg-black/30 rounded text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {emotionHistory.length > 0 ? Math.max(...emotionHistory.map(e => e.confidence)) : 0}%
                  </div>
                  <div className="text-xs text-white/60">Peak Confidence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* The Hook */}
        <div className="text-center mt-12">
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            {showExplanation ? 'Hide' : 'Show'} how this works →
          </button>
          
          <AnimatePresence>
            {showExplanation && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 text-left max-w-3xl mx-auto glass-card p-6 overflow-hidden"
              >
                <h3 className="text-lg font-semibold mb-4">Real Behavior. Real Revenue Impact.</h3>
                <div className="space-y-3 text-sm text-white/70">
                  <p>
                    <span className="text-white font-medium">Customer Rage:</span> When they click repeatedly in frustration, we intervene before they abandon
                  </p>
                  <p>
                    <span className="text-white font-medium">Purchase Hesitation:</span> When they pause at checkout, we address objections in real-time
                  </p>
                  <p>
                    <span className="text-white font-medium">Lost & Confused:</span> When they can't find what they need, we guide them instantly
                  </p>
                  <p>
                    <span className="text-white font-medium">Exit Intent:</span> When they move to leave, we save the sale with perfect timing
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white font-semibold">
                    Your competitors are flying blind. You see everything.
                  </p>
                  <p className="text-sm text-white/70 mt-2">
                    No surveys. No guessing. Just immediate action on what customers actually feel.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Intervention Teaser */}
        {emotionHistory.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/30">
              <h3 className="text-xl font-semibold mb-3">
                ✨ You just saw {activeInterventions.length > 0 ? activeInterventions.length : 'automatic'} interventions trigger
              </h3>
              <p className="text-lg text-white/80 mb-4">
                That's just 5 of our <span className="text-green-400 font-bold">237 pre-built interventions</span>.
                Plus unlimited custom rules based on YOUR business logic.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl mb-1">💬</div>
                  <div>Chat Triggers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🎯</div>
                  <div>Targeted Offers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🚨</div>
                  <div>Escalations</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* CTA */}
        {isActive && emotionHistory.length >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 text-center"
          >
            <div className="glass-card p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
              <h3 className="text-2xl font-semibold mb-4">
                That's anonymous detection. Here's where it gets powerful...
              </h3>
              <p className="text-lg text-white/80 mb-6">
                We don't just know someone is feeling {emotionHistory[0].emotion}.<br/>
                <span className="text-white font-semibold">
                  We know john@fortune500.com worth $100k/year is feeling {emotionHistory[0].emotion}.
                </span>
              </p>
              <div className="text-sm text-white/60 mb-6">
                Scroll down to see how we identify exactly WHO is feeling WHAT →
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}