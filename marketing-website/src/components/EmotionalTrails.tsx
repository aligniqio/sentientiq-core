/**
 * Emotional Trails Visualization
 * Shows the difference between chaotic user behavior and intelligent detection
 */

import { useEffect, useRef, useState } from 'react';

export default function EmotionalTrails() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const trails = useRef<Array<{ x: number; y: number; age: number; type: 'chaos' | 'intelligence' }>>([]);
  const emotionalState = useRef<'normal' | 'rage' | 'confusion' | 'hesitation'>('normal');
  const clickTimes = useRef<number[]>([]);
  const lastScrollY = useRef(0);
  const scrollDirections = useRef<number[]>([]);
  const animationId = useRef<number>();
  
  const [showLabels, setShowLabels] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    contextRef.current = ctx;

    // Track mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      mousePos.current = { x, y };
      
      // Add chaotic trail
      trails.current.push({
        x,
        y,
        age: 0,
        type: 'chaos'
      });

      // Keep trails limited
      if (trails.current.length > 100) {
        trails.current.shift();
      }
    };

    // Detect rage clicks
    const handleClick = () => {
      const now = Date.now();
      clickTimes.current.push(now);
      clickTimes.current = clickTimes.current.filter(t => now - t < 2000);
      
      if (clickTimes.current.length >= 3) {
        const intervals = [];
        for (let i = 1; i < clickTimes.current.length; i++) {
          intervals.push(clickTimes.current[i] - clickTimes.current[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 300) {
          emotionalState.current = 'rage';
          // Add intelligence trail marker
          trails.current.push({
            x: mousePos.current.x,
            y: mousePos.current.y,
            age: 0,
            type: 'intelligence'
          });
        }
      }
    };

    // Detect confusion via scroll
    const handleScroll = () => {
      const currentY = window.scrollY;
      const direction = currentY > lastScrollY.current ? 1 : -1;
      lastScrollY.current = currentY;
      
      scrollDirections.current.push(direction);
      if (scrollDirections.current.length > 10) {
        scrollDirections.current.shift();
      }
      
      // Check for erratic scrolling
      if (scrollDirections.current.length >= 4) {
        let changes = 0;
        for (let i = 1; i < scrollDirections.current.length; i++) {
          if (scrollDirections.current[i] !== scrollDirections.current[i-1]) {
            changes++;
          }
        }
        if (changes >= 3) {
          emotionalState.current = 'confusion';
          trails.current.push({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            age: 0,
            type: 'intelligence'
          });
        }
      }
    };

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw trails
      trails.current = trails.current.filter(trail => {
        trail.age += 1;
        
        if (trail.type === 'chaos') {
          // Chaotic customer trail - red, erratic
          const opacity = Math.max(0, 1 - trail.age / 50);
          ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.3})`;
          ctx.lineWidth = 2;
          
          // Draw erratic line
          ctx.beginPath();
          ctx.moveTo(trail.x, trail.y);
          ctx.lineTo(
            trail.x + (Math.random() - 0.5) * 20,
            trail.y + (Math.random() - 0.5) * 20
          );
          ctx.stroke();
          
          // Small chaos particle
          ctx.fillStyle = `rgba(239, 68, 68, ${opacity * 0.5})`;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Intelligence detection - purple/blue, precise
          const opacity = Math.max(0, 1 - trail.age / 100);
          
          // Glowing detection ring
          const radius = trail.age * 2;
          const gradient = ctx.createRadialGradient(
            trail.x, trail.y, 0,
            trail.x, trail.y, radius
          );
          gradient.addColorStop(0, `rgba(147, 51, 234, ${opacity})`);
          gradient.addColorStop(0.5, `rgba(59, 130, 246, ${opacity * 0.5})`);
          gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, radius, 0, Math.PI * 2);
          ctx.fill();
          
          // Detection marker
          ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(trail.x, trail.y, 10, 0, Math.PI * 2);
          ctx.stroke();
          
          // Show emotional state label
          if (opacity > 0.5 && showLabels) {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            
            let label = '';
            if (emotionalState.current === 'rage') label = 'RAGE DETECTED';
            if (emotionalState.current === 'confusion') label = 'CONFUSION DETECTED';
            if (emotionalState.current === 'hesitation') label = 'HESITATION DETECTED';
            
            if (label) {
              ctx.fillText(label, trail.x, trail.y - 20);
            }
          }
        }
        
        return trail.age < 100;
      });

      // Reset emotional state after display
      if (emotionalState.current !== 'normal') {
        setTimeout(() => {
          emotionalState.current = 'normal';
        }, 2000);
      }

      animationId.current = requestAnimationFrame(animate);
    };

    // Start animation
    animate();

    // Attach event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
    };
  }, [showLabels]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Legend */}
      <div className="fixed top-20 right-4 z-50 p-4 bg-black/80 backdrop-blur-xl rounded-lg border border-white/10 max-w-xs">
        <h3 className="text-sm font-bold text-white mb-3">Emotional Trail Visualization</h3>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full opacity-50"></div>
            <span className="text-red-400">Your customers: Chaotic, confused</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span className="text-purple-400">SentientIQ: Detecting, predicting</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-white/50">
          Try rage clicking or scrolling erratically
        </p>
      </div>
    </>
  );
}