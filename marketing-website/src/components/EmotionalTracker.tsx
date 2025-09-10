/**
 * Live Emotional Intelligence Tracking
 * This is what we're selling - let them experience it
 */

import { useEffect } from 'react';

// Lightweight version of emotional detection for the marketing site
export default function EmotionalTracker() {
  useEffect(() => {
    let clickTimes: number[] = [];
    let hoverStart: number = 0;
    let scrollVelocities: number[] = [];
    let lastScrollTime: number = Date.now();
    let lastScrollY: number = window.scrollY;
    
    // Detect rage clicks
    const handleClick = (e: MouseEvent) => {
      const now = Date.now();
      clickTimes.push(now);
      
      // Keep only clicks from last 2 seconds
      clickTimes = clickTimes.filter(t => now - t < 2000);
      
      if (clickTimes.length >= 3) {
        const intervals = [];
        for (let i = 1; i < clickTimes.length; i++) {
          intervals.push(clickTimes[i] - clickTimes[i-1]);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        if (avgInterval < 300) {
          console.log('🤬 RAGE DETECTED - User is rage clicking!');
          // Show a subtle notification
          showEmotionNotification('rage', 'We detect your frustration. How can we help?');
        }
      }
    };
    
    // Detect hesitation
    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.tagName === 'A') {
        if (!hoverStart) {
          hoverStart = Date.now();
        }
      } else {
        if (hoverStart) {
          const hoverDuration = Date.now() - hoverStart;
          if (hoverDuration > 2000) {
            console.log('🤔 HESITATION DETECTED - User hovering for', hoverDuration, 'ms');
            showEmotionNotification('hesitation', 'Not sure? We can clarify.');
          }
          hoverStart = 0;
        }
      }
    };
    
    // Detect scroll patterns
    const handleScroll = () => {
      const now = Date.now();
      const currentY = window.scrollY;
      const timeDelta = now - lastScrollTime;
      const scrollDelta = Math.abs(currentY - lastScrollY);
      
      if (timeDelta > 0) {
        const velocity = scrollDelta / timeDelta;
        scrollVelocities.push(velocity);
        
        // Keep only recent velocities
        if (scrollVelocities.length > 10) {
          scrollVelocities.shift();
        }
        
        // Fast scrolling = searching/hunting
        if (velocity > 5) {
          console.log('🔍 SEARCHING DETECTED - Fast scroll velocity:', velocity);
          showEmotionNotification('searching', 'Looking for something specific?');
        }
        
        // Scroll up-down-up = confusion
        if (scrollVelocities.length >= 3) {
          const recent = scrollVelocities.slice(-3);
          const directions = recent.map((v, i) => {
            if (i === 0) return 0;
            return recent[i] > recent[i-1] ? 1 : -1;
          });
          
          if (directions[1] !== directions[2] && directions[1] !== 0) {
            console.log('😵 CONFUSION DETECTED - Erratic scrolling');
            showEmotionNotification('confusion', 'Let us guide you to what you need.');
          }
        }
      }
      
      lastScrollTime = now;
      lastScrollY = currentY;
    };
    
    // Show subtle notification
    const showEmotionNotification = (emotion: string, message: string) => {
      // Remove any existing notification
      const existing = document.getElementById('emotion-notification');
      if (existing) existing.remove();
      
      // Create new notification
      const notification = document.createElement('div');
      notification.id = 'emotion-notification';
      notification.className = 'emotion-notification';
      notification.innerHTML = `
        <div class="emotion-icon">${
          emotion === 'rage' ? '🤬' :
          emotion === 'hesitation' ? '🤔' :
          emotion === 'confusion' ? '😵' :
          emotion === 'searching' ? '🔍' : '👀'
        }</div>
        <div class="emotion-message">
          <div class="emotion-title">Emotion Detected: ${emotion}</div>
          <div class="emotion-text">${message}</div>
          <div class="emotion-footer">This is SentientIQ in action</div>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.classList.add('show');
      }, 100);
      
      // Remove after 5 seconds
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, 5000);
    };
    
    // Add styles for notifications
    const style = document.createElement('style');
    style.innerHTML = `
      .emotion-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        gap: 12px;
        align-items: center;
        max-width: 320px;
        opacity: 0;
        transform: translateY(20px) scale(0.95);
        transition: all 0.3s ease;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      }
      
      .emotion-notification.show {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      
      .emotion-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .emotion-message {
        flex: 1;
      }
      
      .emotion-title {
        color: #fff;
        font-weight: 600;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      
      .emotion-text {
        color: rgba(255, 255, 255, 0.8);
        font-size: 13px;
        line-height: 1.4;
      }
      
      .emotion-footer {
        color: rgba(255, 255, 255, 0.4);
        font-size: 11px;
        margin-top: 6px;
        font-style: italic;
      }
    `;
    document.head.appendChild(style);
    
    // Attach listeners
    document.addEventListener('click', handleClick);
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    
    // Log that tracking is active
    console.log('🧠 SentientIQ Emotional Intelligence Active - We\'re detecting your emotions in real-time');
    console.log('Try: Rage clicking, hesitating on buttons, or scrolling erratically');
    
    // Cleanup
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  return null; // This component doesn't render anything
}