/**
 * Intervention Diagnostics
 * The safety net that catches shit before it breaks
 * Because debugging distributed systems in production is hell
 */

interface DiagnosticEvent {
  timestamp: number;
  component: 'processor' | 'engine' | 'websocket' | 'choreographer' | 'renderer';
  event: string;
  data: any;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  correlationId?: string;
}

interface CommunicationHealth {
  component: string;
  lastSeen: number;
  messageCount: number;
  errorCount: number;
  avgLatency: number;
  status: 'healthy' | 'degraded' | 'dead';
}

export class InterventionDiagnostics {
  private static instance: InterventionDiagnostics;
  private events: DiagnosticEvent[] = [];
  private communicationHealth = new Map<string, CommunicationHealth>();
  private correlationMap = new Map<string, DiagnosticEvent[]>();
  private enabled = true;
  private maxEvents = 1000;

  // Thresholds for health monitoring
  private readonly HEARTBEAT_TIMEOUT = 5000; // 5 seconds without message = dead
  private readonly LATENCY_WARNING = 500; // 500ms latency = warning
  private readonly ERROR_THRESHOLD = 5; // 5 errors = degraded

  // Communication expectations
  private readonly expectedFlows = [
    {
      name: 'emotion_to_intervention',
      start: 'processor:emotion_diagnosed',
      end: 'engine:intervention_decided',
      maxDuration: 100
    },
    {
      name: 'decision_to_delivery',
      start: 'engine:intervention_decided',
      end: 'websocket:intervention_sent',
      maxDuration: 50
    },
    {
      name: 'delivery_to_render',
      start: 'websocket:intervention_received',
      end: 'renderer:intervention_shown',
      maxDuration: 1000
    },
    {
      name: 'behavior_to_emotion',
      start: 'choreographer:behavioral_signal',
      end: 'processor:emotion_diagnosed',
      maxDuration: 200
    }
  ];

  private constructor() {
    this.startHealthMonitoring();
    this.attachGlobalErrorHandler();
  }

  static getInstance(): InterventionDiagnostics {
    if (!InterventionDiagnostics.instance) {
      InterventionDiagnostics.instance = new InterventionDiagnostics();
    }
    return InterventionDiagnostics.instance;
  }

  /**
   * Log an event from any component
   */
  public log(
    component: DiagnosticEvent['component'],
    event: string,
    data: any,
    level: DiagnosticEvent['level'] = 'info',
    correlationId?: string
  ) {
    const diagnosticEvent: DiagnosticEvent = {
      timestamp: Date.now(),
      component,
      event,
      data,
      level,
      correlationId
    };

    // Store event
    this.events.push(diagnosticEvent);
    if (this.events.length > this.maxEvents) {
      this.events.shift(); // Remove oldest
    }

    // Track correlation
    if (correlationId) {
      const correlated = this.correlationMap.get(correlationId) || [];
      correlated.push(diagnosticEvent);
      this.correlationMap.set(correlationId, correlated);
    }

    // Update health
    this.updateComponentHealth(component);

    // Check for flow completion
    this.checkFlowCompletion(diagnosticEvent);

    // Console output with styling
    if (this.enabled) {
      this.consoleLog(diagnosticEvent);
    }

    // Critical errors get special treatment
    if (level === 'critical') {
      this.handleCriticalError(diagnosticEvent);
    }

    // Check for communication issues
    this.detectCommunicationIssues(diagnosticEvent);
  }

  /**
   * Console logging with pretty colors
   */
  private consoleLog(event: DiagnosticEvent) {
    const styles = {
      debug: 'color: gray',
      info: 'color: blue',
      warn: 'color: orange; font-weight: bold',
      error: 'color: red; font-weight: bold',
      critical: 'background: red; color: white; font-weight: bold; padding: 2px 4px'
    };

    const emoji = {
      processor: '🧠',
      engine: '⚙️',
      websocket: '📡',
      choreographer: '🎭',
      renderer: '🎨'
    };

    console.log(
      `%c[${new Date(event.timestamp).toLocaleTimeString()}] ${emoji[event.component]} ${event.component}:${event.event}`,
      styles[event.level],
      event.data,
      event.correlationId ? `(${event.correlationId})` : ''
    );
  }

  /**
   * Update component health metrics
   */
  private updateComponentHealth(component: string) {
    const health = this.communicationHealth.get(component) || {
      component,
      lastSeen: 0,
      messageCount: 0,
      errorCount: 0,
      avgLatency: 0,
      status: 'healthy' as const
    };

    health.lastSeen = Date.now();
    health.messageCount++;

    // Check if component had errors recently
    const recentErrors = this.events
      .filter(e =>
        e.component === component &&
        e.level === 'error' &&
        Date.now() - e.timestamp < 60000 // Last minute
      ).length;

    health.errorCount = recentErrors;

    // Update status
    if (recentErrors >= this.ERROR_THRESHOLD) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    this.communicationHealth.set(component, health);
  }

  /**
   * Check if an expected flow completed within time
   */
  private checkFlowCompletion(event: DiagnosticEvent) {
    if (!event.correlationId) return;

    this.expectedFlows.forEach(flow => {
      if (event.event === flow.end) {
        const correlatedEvents = this.correlationMap.get(event.correlationId!) || [];
        const startEvent = correlatedEvents.find(e => e.event === flow.start);

        if (startEvent) {
          const duration = event.timestamp - startEvent.timestamp;

          if (duration > flow.maxDuration) {
            this.log(
              'choreographer',
              'flow_latency_warning',
              {
                flow: flow.name,
                expected: flow.maxDuration,
                actual: duration,
                correlation: event.correlationId
              },
              'warn'
            );
          } else {
            this.log(
              'choreographer',
              'flow_completed',
              {
                flow: flow.name,
                duration,
                correlation: event.correlationId
              },
              'debug'
            );
          }
        }
      }
    });
  }

  /**
   * Detect communication breakdowns
   */
  private detectCommunicationIssues(event: DiagnosticEvent) {
    // Check for orphaned messages (no response)
    if (event.correlationId) {
      setTimeout(() => {
        const correlated = this.correlationMap.get(event.correlationId!) || [];

        // Expected chain: processor -> engine -> websocket -> choreographer -> renderer
        const expectedComponents = ['processor', 'engine', 'websocket', 'choreographer', 'renderer'];
        const receivedComponents = new Set(correlated.map(e => e.component));

        const missing = expectedComponents.filter(c => !receivedComponents.has(c as any));

        if (missing.length > 0 && correlated.length < 5) {
          this.log(
            'choreographer',
            'incomplete_flow',
            {
              correlation: event.correlationId,
              received: Array.from(receivedComponents),
              missing,
              events: correlated.map(e => `${e.component}:${e.event}`)
            },
            'warn'
          );
        }
      }, 2000); // Check after 2 seconds
    }

    // Check for WebSocket disconnections
    if (event.component === 'websocket' && event.event === 'disconnected') {
      this.log(
        'choreographer',
        'websocket_failure',
        {
          lastEvents: this.events.filter(e => e.component === 'websocket').slice(-5)
        },
        'critical'
      );
    }

    // Check for renderer failures
    if (event.component === 'renderer' && event.level === 'error') {
      const recentChoreography = this.events
        .filter(e => e.component === 'choreographer' && Date.now() - e.timestamp < 5000)
        .slice(-3);

      this.log(
        'choreographer',
        'render_failure_context',
        {
          renderError: event.data,
          recentChoreography
        },
        'error'
      );
    }
  }

  /**
   * Handle critical errors with recovery attempts
   */
  private handleCriticalError(event: DiagnosticEvent) {
    console.error('🚨 CRITICAL ERROR DETECTED:', event);

    // Attempt recovery based on component
    switch (event.component) {
      case 'websocket':
        console.log('🔧 Attempting WebSocket reconnection...');
        // Trigger reconnection logic
        window.dispatchEvent(new CustomEvent('sentientiq:reconnect'));
        break;

      case 'renderer':
        console.log('🔧 Clearing failed interventions...');
        // Clear any stuck interventions
        window.dispatchEvent(new CustomEvent('sentientiq:clear_interventions'));
        break;

      case 'processor':
        console.log('🔧 Resetting emotion state...');
        // Reset emotion tracking
        window.dispatchEvent(new CustomEvent('sentientiq:reset_emotions'));
        break;
    }

    // Send error report if available
    this.sendErrorReport(event);
  }

  /**
   * Start health monitoring loop
   */
  private startHealthMonitoring() {
    setInterval(() => {
      const now = Date.now();

      this.communicationHealth.forEach((health, component) => {
        // Check for dead components
        if (now - health.lastSeen > this.HEARTBEAT_TIMEOUT) {
          if (health.status !== 'dead') {
            health.status = 'dead';
            this.log(
              'choreographer',
              'component_timeout',
              {
                component,
                lastSeen: new Date(health.lastSeen).toLocaleTimeString(),
                messageCount: health.messageCount
              },
              'error'
            );
          }
        }
      });

      // Log health summary every minute
      if (now % 60000 < 1000) {
        this.logHealthSummary();
      }
    }, 1000);
  }

  /**
   * Global error handler for uncaught issues
   */
  private attachGlobalErrorHandler() {
    const originalError = window.onerror;

    window.onerror = (message, source, lineno, colno, error) => {
      if (source?.includes('intervention') || source?.includes('sentient')) {
        this.log(
          'choreographer',
          'uncaught_error',
          {
            message,
            source,
            line: lineno,
            column: colno,
            stack: error?.stack
          },
          'critical'
        );
      }

      // Call original handler if exists
      if (originalError) {
        return originalError(message, source, lineno, colno, error);
      }
      return false;
    };
  }

  /**
   * Send error report to backend
   */
  private sendErrorReport(event: DiagnosticEvent) {
    const report = {
      event,
      context: {
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        recentEvents: this.events.slice(-20),
        health: Array.from(this.communicationHealth.values())
      }
    };

    // Send to backend (if available)
    fetch('/api/diagnostics/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report)
    }).catch(err => {
      console.error('Failed to send error report:', err);
    });
  }

  /**
   * Log health summary
   */
  private logHealthSummary() {
    const summary = {
      healthy: 0,
      degraded: 0,
      dead: 0,
      components: Array.from(this.communicationHealth.values())
    };

    summary.components.forEach(c => {
      summary[c.status]++;
    });

    if (summary.degraded > 0 || summary.dead > 0) {
      console.warn('🏥 System Health Check:', summary);
    }
  }

  /**
   * Get or create session ID
   */
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sentientiq_session_id');
    if (!sessionId) {
      sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('sentientiq_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Public API for debugging
   */
  public getRecentEvents(count = 50): DiagnosticEvent[] {
    return this.events.slice(-count);
  }

  public getHealthStatus(): Map<string, CommunicationHealth> {
    return this.communicationHealth;
  }

  public getCorrelatedFlow(correlationId: string): DiagnosticEvent[] {
    return this.correlationMap.get(correlationId) || [];
  }

  public enable() {
    this.enabled = true;
    console.log('🔍 Intervention diagnostics enabled');
  }

  public disable() {
    this.enabled = false;
    console.log('🔇 Intervention diagnostics disabled');
  }

  public clear() {
    this.events = [];
    this.correlationMap.clear();
    console.log('🧹 Diagnostic history cleared');
  }

  /**
   * Export diagnostic data for analysis
   */
  public export(): string {
    const data = {
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      events: this.events,
      health: Array.from(this.communicationHealth.values()),
      correlations: Array.from(this.correlationMap.entries())
    };

    return JSON.stringify(data, null, 2);
  }
}

export const diagnostics = InterventionDiagnostics.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).sentientDiagnostics = diagnostics;
  console.log('🔍 SentientIQ Diagnostics available at: window.sentientDiagnostics');
  console.log('   - sentientDiagnostics.getRecentEvents()');
  console.log('   - sentientDiagnostics.getHealthStatus()');
  console.log('   - sentientDiagnostics.export()');
}