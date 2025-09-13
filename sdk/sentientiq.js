/**
 * SentientIQ SDK v5.0
 * 
 * One line to save millions.
 * Zero config. Auto-identity. Non-blocking.
 * 
 * Usage:
 *   <script src="https://cdn.sentientiq.app/sdk.js" data-api-key="YOUR_KEY"></script>
 * 
 * Or:
 *   import SentientIQ from '@sentientiq/sdk';
 *   SentientIQ.init('YOUR_KEY');
 */

(function(window, document) {
  'use strict';

  // SDK Configuration
  const VERSION = '5.0.0';
  const WS_ENDPOINT = 'wss://stream.sentientiq.app';
  const BEACON_ENDPOINT = 'https://beacon.sentientiq.app/v1/events';
  const MAX_QUEUE_SIZE = 100;
  const BATCH_INTERVAL = 1000; // 1 second
  const RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Performance constants
  const SAMPLE_RATE = 50; // ms between physics samples
  const VELOCITY_DECAY = 0.95;
  const RAGE_THRESHOLD = 800;
  const CONFIDENCE_VELOCITY_MAX = 300;

  // The SDK
  const SentientIQ = {
    // State
    initialized: false,
    apiKey: null,
    sessionId: null,
    userId: null,
    userTraits: {},
    
    // Connection
    ws: null,
    worker: null,
    connected: false,
    reconnectAttempts: 0,
    
    // Tracking
    eventQueue: [],
    lastActivity: Date.now(),
    mousePosition: { x: 0, y: 0 },
    scrollPosition: 0,
    velocity: 0,
    acceleration: 0,
    
    // Section detection
    currentSection: null,
    sectionObserver: null,

    /**
     * Initialize SentientIQ
     */
    init: function(apiKey, options = {}) {
      if (this.initialized) return;
      
      this.apiKey = apiKey || this.extractApiKey();
      if (!this.apiKey) {
        console.error('SentientIQ: No API key provided');
        return;
      }

      this.sessionId = this.generateSessionId();
      this.initialized = true;

      // Auto-identify from common auth patterns
      this.autoIdentify();
      
      // Setup WebWorker for non-blocking processing
      this.setupWorker();
      
      // Connect WebSocket
      this.connect();
      
      // Setup event listeners
      this.setupListeners();
      
      // Setup section observer
      this.setupSectionObserver();
      
      // Start heartbeat
      this.startHeartbeat();

      // Log initialization
      if (options.debug) {
        console.log('SentientIQ initialized:', {
          version: VERSION,
          sessionId: this.sessionId,
          userId: this.userId
        });
      }

      // Fire ready event
      this.emit('ready');
    },

    /**
     * Identify user (auto or manual)
     */
    identify: function(userId, traits = {}) {
      this.userId = userId;
      this.userTraits = traits;
      
      // Extract value for prioritization
      const ltv = traits.ltv || traits.value || traits.revenue || 0;
      
      // Send identification event
      this.send({
        type: 'identify',
        userId: userId,
        traits: traits,
        ltv: ltv,
        timestamp: Date.now()
      });

      // Store in localStorage for persistence
      try {
        localStorage.setItem('sq_user', JSON.stringify({ userId, traits }));
      } catch(e) {}
    },

    /**
     * Auto-identify from common patterns
     */
    autoIdentify: function() {
      // Check localStorage first
      try {
        const stored = localStorage.getItem('sq_user');
        if (stored) {
          const { userId, traits } = JSON.parse(stored);
          this.userId = userId;
          this.userTraits = traits;
          return;
        }
      } catch(e) {}

      // Check common auth patterns
      const patterns = [
        // Clerk
        () => window.Clerk?.user?.id,
        // Auth0
        () => window.auth0?.user?.sub,
        // Firebase
        () => window.firebase?.auth()?.currentUser?.uid,
        // Supabase
        () => window.supabase?.auth?.user()?.id,
        // Custom patterns
        () => window.user?.id,
        () => window.currentUser?.id,
        () => document.querySelector('[data-user-id]')?.dataset.userId
      ];

      for (const pattern of patterns) {
        try {
          const userId = pattern();
          if (userId) {
            this.identify(userId);
            break;
          }
        } catch(e) {}
      }
    },

    /**
     * Setup WebWorker for non-blocking processing
     */
    setupWorker: function() {
      if (!window.Worker) return;

      const workerCode = `
        let eventBuffer = [];
        let sending = false;

        self.onmessage = function(e) {
          const { type, data } = e.data;
          
          if (type === 'event') {
            eventBuffer.push(data);
            
            if (eventBuffer.length >= 10 && !sending) {
              flush();
            }
          }
        };

        function flush() {
          if (eventBuffer.length === 0 || sending) return;
          
          sending = true;
          const events = eventBuffer.splice(0, 10);
          
          self.postMessage({
            type: 'batch',
            events: events
          });
          
          sending = false;
        }

        setInterval(flush, 1000);
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (e) => {
        if (e.data.type === 'batch') {
          this.sendBatch(e.data.events);
        }
      };
    },

    /**
     * Connect WebSocket
     */
    connect: function() {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

      const wsUrl = `${WS_ENDPOINT}?api_key=${this.apiKey}&session=${this.sessionId}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.flushQueue();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleIntervention(data);
          } catch(e) {}
        };

        this.ws.onclose = () => {
          this.connected = false;
          this.reconnect();
        };

        this.ws.onerror = () => {
          this.connected = false;
        };
      } catch(e) {
        // Fallback to beacon API
        this.connected = false;
      }
    },

    /**
     * Reconnect with exponential backoff
     */
    reconnect: function() {
      if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        return;
      }

      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts));
    },

    /**
     * Setup event listeners
     */
    setupListeners: function() {
      // Mouse movement (throttled)
      let lastMouseTime = 0;
      document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseTime < SAMPLE_RATE) return;
        lastMouseTime = now;

        const deltaX = e.clientX - this.mousePosition.x;
        const deltaY = e.clientY - this.mousePosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Calculate velocity
        const newVelocity = distance / SAMPLE_RATE * 1000;
        this.acceleration = newVelocity - this.velocity;
        this.velocity = newVelocity;

        // Detect rage pattern
        if (this.velocity > RAGE_THRESHOLD && this.acceleration > 500) {
          this.detectEmotion('rage', 95);
        }

        this.mousePosition = { x: e.clientX, y: e.clientY };
        
        // Queue event
        this.queueEvent({
          type: 'mousemove',
          x: e.clientX,
          y: e.clientY,
          velocity: this.velocity,
          acceleration: this.acceleration
        });
      });

      // Click events
      document.addEventListener('click', (e) => {
        const target = e.target;
        const element = this.getElementIdentifier(target);
        
        this.queueEvent({
          type: 'click',
          element: element,
          x: e.clientX,
          y: e.clientY,
          section: this.currentSection
        });

        // Detect purchase intent on pricing CTAs
        if (this.currentSection === 'pricing' && target.matches('[data-cta], .cta, .btn-primary')) {
          this.detectEmotion('purchase_intent', 90);
        }
      });

      // Scroll events (throttled)
      let lastScrollTime = 0;
      let lastScrollY = window.scrollY;
      
      window.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime < SAMPLE_RATE) return;
        
        const scrollDelta = window.scrollY - lastScrollY;
        const scrollVelocity = Math.abs(scrollDelta) / (now - lastScrollTime) * 1000;
        
        this.queueEvent({
          type: 'scroll',
          position: window.scrollY,
          velocity: scrollVelocity,
          direction: scrollDelta > 0 ? 'down' : 'up'
        });

        lastScrollTime = now;
        lastScrollY = window.scrollY;
      });

      // Page visibility
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.queueEvent({
            type: 'visibility',
            hidden: true
          });
          
          // Detect abandonment risk
          if (this.velocity > 600) {
            this.detectEmotion('abandonment_risk', 85);
          }
        }
      });

      // Rage quit detection
      window.addEventListener('beforeunload', () => {
        if (this.velocity > RAGE_THRESHOLD) {
          // Send immediately via beacon
          this.sendBeacon({
            type: 'emotion',
            emotion: 'rage_quit',
            confidence: 99,
            velocity: this.velocity
          });
        }
      });
    },

    /**
     * Setup section observer
     */
    setupSectionObserver: function() {
      const sections = document.querySelectorAll('[data-section], section, .section, #hero, #pricing, #demo, #testimonials');
      
      if (!window.IntersectionObserver || sections.length === 0) return;

      this.sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            const section = entry.target.dataset.section || 
                          entry.target.id || 
                          entry.target.className;
            
            if (section !== this.currentSection) {
              this.handleSectionChange(section);
            }
          }
        });
      }, {
        threshold: 0.5
      });

      sections.forEach(section => {
        this.sectionObserver.observe(section);
      });
    },

    /**
     * Handle section change
     */
    handleSectionChange: function(newSection) {
      const oldSection = this.currentSection;
      this.currentSection = newSection;

      // Track transition
      this.queueEvent({
        type: 'section_change',
        from: oldSection,
        to: newSection,
        timestamp: Date.now()
      });

      // Detect section-specific emotions
      if (newSection === 'pricing') {
        if (this.velocity > 500) {
          this.detectEmotion('price_curiosity', 70);
        }
      } else if (newSection === 'testimonials') {
        this.detectEmotion('trust_building', 65);
      }
    },

    /**
     * Detect emotion
     */
    detectEmotion: function(emotion, confidence) {
      const event = {
        type: 'emotion',
        emotion: emotion,
        confidence: confidence,
        section: this.currentSection,
        velocity: this.velocity,
        userId: this.userId,
        ltv: this.userTraits.ltv || 0,
        timestamp: Date.now()
      };

      // High-priority emotions bypass queue
      if (confidence > 85 && this.userTraits.ltv > 10000) {
        this.send(event);
      } else {
        this.queueEvent(event);
      }

      this.emit('emotion', event);
    },

    /**
     * Queue event for batch processing
     */
    queueEvent: function(event) {
      event.sessionId = this.sessionId;
      event.userId = this.userId;
      event.timestamp = event.timestamp || Date.now();

      if (this.worker) {
        this.worker.postMessage({ type: 'event', data: event });
      } else {
        this.eventQueue.push(event);
        
        if (this.eventQueue.length >= MAX_QUEUE_SIZE) {
          this.flushQueue();
        }
      }
    },

    /**
     * Send event immediately
     */
    send: function(event) {
      if (this.connected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(event));
      } else {
        this.sendBeacon(event);
      }
    },

    /**
     * Send batch of events
     */
    sendBatch: function(events) {
      if (this.connected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'batch',
          events: events
        }));
      } else {
        // Fallback to beacon
        navigator.sendBeacon(BEACON_ENDPOINT, JSON.stringify({
          apiKey: this.apiKey,
          sessionId: this.sessionId,
          events: events
        }));
      }
    },

    /**
     * Send via beacon API (fallback)
     */
    sendBeacon: function(event) {
      if (!navigator.sendBeacon) return;

      navigator.sendBeacon(BEACON_ENDPOINT, JSON.stringify({
        apiKey: this.apiKey,
        sessionId: this.sessionId,
        event: event
      }));
    },

    /**
     * Flush event queue
     */
    flushQueue: function() {
      if (this.eventQueue.length === 0) return;

      const events = this.eventQueue.splice(0, MAX_QUEUE_SIZE);
      this.sendBatch(events);
    },

    /**
     * Handle intervention from server
     */
    handleIntervention: function(data) {
      if (data.type === 'intervention') {
        // Emit for customer's handlers
        this.emit('intervention', data);

        // Default handlers
        switch(data.action) {
          case 'show_chat':
            this.showChat(data);
            break;
          case 'show_discount':
            this.showDiscount(data);
            break;
          case 'highlight_element':
            this.highlightElement(data);
            break;
        }
      }
    },

    /**
     * Default intervention: Show chat
     */
    showChat: function(data) {
      // Trigger Intercom/Zendesk/etc
      if (window.Intercom) {
        window.Intercom('show');
        window.Intercom('showNewMessage', data.message);
      } else if (window.zE) {
        window.zE('webWidget', 'open');
        window.zE('webWidget', 'chat:send', data.message);
      }
    },

    /**
     * Default intervention: Show discount
     */
    showDiscount: function(data) {
      // Create floating discount banner
      const banner = document.createElement('div');
      banner.className = 'sq-discount-banner';
      banner.innerHTML = `
        <div style="position:fixed;bottom:20px;right:20px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,0.3);z-index:99999;max-width:300px;animation:slideIn 0.3s ease;">
          <div style="font-size:18px;font-weight:bold;margin-bottom:10px;">💎 Special Offer</div>
          <div style="margin-bottom:15px;">${data.message || 'Get 20% off your first month'}</div>
          <button onclick="SentientIQ.acceptOffer('${data.offerId}')" style="background:white;color:#667eea;border:none;padding:10px 20px;border-radius:5px;font-weight:bold;cursor:pointer;">Claim Now</button>
        </div>
      `;
      document.body.appendChild(banner);

      // Auto-remove after 30 seconds
      setTimeout(() => banner.remove(), 30000);
    },

    /**
     * Accept offer
     */
    acceptOffer: function(offerId) {
      this.queueEvent({
        type: 'offer_accepted',
        offerId: offerId
      });
      
      // Remove banner
      document.querySelector('.sq-discount-banner')?.remove();
    },

    /**
     * Highlight element
     */
    highlightElement: function(data) {
      const element = document.querySelector(data.selector);
      if (!element) return;

      element.style.transition = 'all 0.3s ease';
      element.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.8)';
      element.style.transform = 'scale(1.05)';

      setTimeout(() => {
        element.style.boxShadow = '';
        element.style.transform = '';
      }, 3000);
    },

    /**
     * Start heartbeat
     */
    startHeartbeat: function() {
      setInterval(() => {
        this.flushQueue();
        
        // Send heartbeat if active
        if (Date.now() - this.lastActivity < 30000) {
          this.queueEvent({
            type: 'heartbeat',
            section: this.currentSection
          });
        }
      }, 30000);
    },

    /**
     * Get element identifier
     */
    getElementIdentifier: function(element) {
      return element.id || 
             element.dataset.track || 
             element.className || 
             element.tagName.toLowerCase();
    },

    /**
     * Extract API key from script tag
     */
    extractApiKey: function() {
      const script = document.currentScript || 
                    document.querySelector('script[data-api-key]');
      return script?.dataset.apiKey;
    },

    /**
     * Generate session ID
     */
    generateSessionId: function() {
      return `sq_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    },

    /**
     * Event emitter
     */
    listeners: {},
    
    on: function(event, callback) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
    },

    emit: function(event, data) {
      if (!this.listeners[event]) return;
      
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch(e) {
          console.error('SentientIQ: Event handler error', e);
        }
      });
    },

    /**
     * Public API
     */
    track: function(eventName, properties = {}) {
      this.queueEvent({
        type: 'custom',
        event: eventName,
        properties: properties
      });
    },

    page: function(name, properties = {}) {
      this.queueEvent({
        type: 'page',
        name: name,
        properties: properties,
        url: window.location.href
      });
    },

    revenue: function(amount, properties = {}) {
      this.queueEvent({
        type: 'revenue',
        amount: amount,
        properties: properties
      });
    }
  };

  // Auto-initialize if script tag present
  if (document.currentScript?.dataset.apiKey) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        SentientIQ.init();
      });
    } else {
      SentientIQ.init();
    }
  }

  // Export for module systems
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SentientIQ;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return SentientIQ; });
  } else {
    window.SentientIQ = SentientIQ;
  }

})(window, document);