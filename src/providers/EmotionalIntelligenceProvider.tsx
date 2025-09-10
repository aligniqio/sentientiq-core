/**
 * Emotional Intelligence Provider
 * Injects the full emotional detection system into the app
 * Connects to the backend to store and learn from patterns
 */

import React, { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { getEmotionalIntelligence } from '../services/emotional-intelligence';

interface EmotionalIntelligenceProviderProps {
  children: React.ReactNode;
}

export const EmotionalIntelligenceProvider: React.FC<EmotionalIntelligenceProviderProps> = ({ children }) => {
  const { user } = useUser();
  
  useEffect(() => {
    if (!user) return;
    
    // Initialize the emotional intelligence system
    const ei = getEmotionalIntelligence();
    
    // Set up API connection for sending events to backend
    const sendEmotionalEvent = async (event: any) => {
      try {
        const response = await fetch('/api/emotional/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': user.id
          },
          body: JSON.stringify({
            session_id: sessionStorage.getItem('session_id') || generateSessionId(),
            user_id: user.id,
            timestamp: new Date(),
            emotion: event.state,
            confidence: event.confidence,
            intensity: event.intensity,
            predicted_action: event.predictedAction,
            intervention_window: event.interventionWindow,
            page_url: window.location.pathname,
            metadata: {
              user_email: user.primaryEmailAddress?.emailAddress,
              timestamp: Date.now()
            }
          })
        });
        
        if (response.ok) {
          console.log('📊 Emotional event recorded:', event.state);
        }
      } catch (error) {
        console.error('Failed to send emotional event:', error);
      }
    };
    
    // Listen for emotional state changes
    const handleStateChange = (event: any) => {
      console.log('🧠 Emotional state detected:', event);
      
      // Send to backend for learning
      sendEmotionalEvent(event);
      
      // Check if intervention is needed
      if (event.confidence > 85) {
        handleHighConfidenceEmotion(event);
      }
    };
    
    ei.on('stateChange', handleStateChange);
    
    // Handle high-confidence emotions with interventions
    const handleHighConfidenceEmotion = (event: any) => {
      switch (event.state) {
        case 'rage':
          console.log('🚨 RAGE INTERVENTION TRIGGERED');
          // Could show a help modal, simplify UI, etc.
          showNotification('😤 We notice you might be frustrated. Can we help?', 'warning');
          break;
          
        case 'abandonment':
          console.log('🚪 ABANDONMENT PREVENTION TRIGGERED');
          showNotification('👋 Wait! Don\'t leave yet. Need help?', 'info');
          break;
          
        case 'delight':
          console.log('✨ DELIGHT DETECTED - UPSELL OPPORTUNITY');
          // Perfect time for upsell or referral request
          break;
          
        case 'confusion':
          console.log('😵 CONFUSION DETECTED - GUIDE USER');
          showNotification('🤔 Looking for something? Let us guide you.', 'help');
          break;
      }
    };
    
    // Show intervention notification
    const showNotification = (message: string, type: string) => {
      // Check if notification already exists
      if (document.getElementById('ei-notification')) return;
      
      const notification = document.createElement('div');
      notification.id = 'ei-notification';
      notification.className = `
        fixed bottom-4 right-4 max-w-sm p-4 
        bg-black/90 backdrop-blur-xl border border-white/20 
        rounded-lg shadow-2xl z-50 
        transform translate-y-0 opacity-100 
        transition-all duration-300
      `;
      
      notification.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="text-2xl">${
            type === 'warning' ? '⚠️' :
            type === 'help' ? '💡' :
            type === 'success' ? '✅' :
            '💬'
          }</div>
          <div class="flex-1">
            <p class="text-white text-sm">${message}</p>
            <p class="text-gray-400 text-xs mt-1">Powered by Emotional Intelligence</p>
          </div>
          <button 
            onclick="this.parentElement.parentElement.remove()" 
            class="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (document.getElementById('ei-notification')) {
          notification.style.opacity = '0';
          notification.style.transform = 'translateY(20px)';
          setTimeout(() => notification.remove(), 300);
        }
      }, 10000);
    };
    
    // Generate session ID if not exists
    const generateSessionId = () => {
      const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', id);
      return id;
    };
    
    // Log activation
    console.log(`
╔══════════════════════════════════════════════════════╗
║     🧠 EMOTIONAL INTELLIGENCE ACTIVATED 🧠          ║
║                                                      ║
║  We're now detecting your emotions in real-time:    ║
║  • Rage clicks (3+ clicks in <300ms)                ║
║  • Hesitation (hovering >2s)                        ║
║  • Confusion (erratic scrolling)                    ║
║  • Abandonment (idle >60s)                          ║
║  • Delight (smooth interactions)                    ║
║                                                      ║
║  Marketing at the Speed of Emotion™                 ║
║  No Math.random(). Pure behavioral physics.         ║
╚══════════════════════════════════════════════════════╝
    `);
    
    // Cleanup
    return () => {
      ei.off('stateChange', handleStateChange);
    };
  }, [user]);
  
  return <>{children}</>;
};

export default EmotionalIntelligenceProvider;