/**
 * Pipeline Diagnostic Tool
 * Test utility to diagnose emotional event pipeline issues
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, XCircle, AlertCircle, Loader2, Send } from 'lucide-react';

interface DiagnosticStep {
  name: string;
  endpoint: string;
  status: 'pending' | 'testing' | 'success' | 'error' | 'warning';
  message?: string;
  details?: any;
}

const PipelineDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<DiagnosticStep[]>([
    {
      name: 'Telemetry WebSocket',
      endpoint: 'wss://api.sentientiq.app/ws/telemetry',
      status: 'pending'
    },
    {
      name: 'Emotional Broadcaster',
      endpoint: 'wss://api.sentientiq.app/ws/emotions',
      status: 'pending'
    },
    {
      name: 'Intervention Broadcaster',
      endpoint: 'wss://api.sentientiq.app/ws/interventions',
      status: 'pending'
    }
  ]);

  const testConnections = useRef<{ [key: string]: WebSocket }>({});

  const testWebSocketEndpoint = async (step: DiagnosticStep, index: number) => {
    return new Promise<void>((resolve) => {
      // Update status to testing
      setSteps(prev => prev.map((s, i) =>
        i === index ? { ...s, status: 'testing', message: 'Connecting...' } : s
      ));

      const ws = new WebSocket(step.endpoint);
      testConnections.current[step.endpoint] = ws;

      const timeout = setTimeout(() => {
        setSteps(prev => prev.map((s, i) =>
          i === index ? { ...s, status: 'error', message: 'Connection timeout (10s)' } : s
        ));
        ws.close();
        resolve();
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setSteps(prev => prev.map((s, i) =>
          i === index ? { ...s, status: 'success', message: 'Connected successfully' } : s
        ));

        // Send a test subscription message for emotional/intervention broadcasters
        if (step.endpoint.includes('emotions') || step.endpoint.includes('interventions')) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            tenant: null,
            filter: null
          }));
        }

        // Keep connection open for 2 seconds to receive any initial messages
        setTimeout(() => {
          ws.close();
          resolve();
        }, 2000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setSteps(prev => prev.map((s, i) =>
            i === index ? {
              ...s,
              details: message,
              message: `Received: ${message.type || 'unknown message type'}`
            } : s
          ));
        } catch (error) {
          console.error('Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        setSteps(prev => prev.map((s, i) =>
          i === index ? { ...s, status: 'error', message: 'Connection error' } : s
        ));
        resolve();
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        if (event.code !== 1000) { // 1000 is normal closure
          setSteps(prev => prev.map((s, i) =>
            i === index && s.status === 'testing' ? {
              ...s,
              status: 'warning',
              message: `Closed: ${event.code} - ${event.reason || 'No reason provided'}`
            } : s
          ));
        }
      };
    });
  };

  const sendTestTelemetryEvent = async () => {
    const telemetryWs = new WebSocket('wss://api.sentientiq.app/ws/telemetry');

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        telemetryWs.close();
        resolve();
      }, 5000);

      telemetryWs.onopen = () => {
        // Send a test telemetry event that should trigger rage detection
        const testEvent = {
          type: 'telemetry',
          sessionId: `test-${Date.now()}`,
          timestamp: new Date().toISOString(),
          pageUrl: 'https://sentientiq.ai/test',
          data: {
            mouseX: Math.random() * 1920,
            mouseY: Math.random() * 1080,
            velocityX: 500 + Math.random() * 500, // High velocity for rage
            velocityY: 500 + Math.random() * 500,
            accelerationX: 1000 + Math.random() * 1000, // High acceleration
            accelerationY: 1000 + Math.random() * 1000,
            clickCount: 5, // Multiple rapid clicks
            scrollDelta: 0,
            timeOnPage: 5000
          }
        };

        console.log('Sending test telemetry event:', testEvent);
        telemetryWs.send(JSON.stringify(testEvent));

        // Send a few more events to simulate rage pattern
        let count = 0;
        const interval = setInterval(() => {
          count++;
          if (count > 5) {
            clearInterval(interval);
            clearTimeout(timeout);
            telemetryWs.close();
            resolve();
            return;
          }

          testEvent.data.mouseX += (Math.random() - 0.5) * 200;
          testEvent.data.mouseY += (Math.random() - 0.5) * 200;
          testEvent.data.velocityX = 800 + Math.random() * 400;
          testEvent.data.velocityY = 800 + Math.random() * 400;
          testEvent.timestamp = new Date().toISOString();

          telemetryWs.send(JSON.stringify(testEvent));
        }, 100);
      };

      telemetryWs.onerror = (error) => {
        console.error('Test telemetry error:', error);
        clearTimeout(timeout);
        resolve();
      };
    });
  };

  const runDiagnostic = async () => {
    setIsRunning(true);

    // Reset all steps
    setSteps(prev => prev.map(s => ({ ...s, status: 'pending', message: undefined, details: undefined })));

    // Test each WebSocket endpoint
    for (let i = 0; i < steps.length; i++) {
      await testWebSocketEndpoint(steps[i], i);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
    }

    setIsRunning(false);
  };

  const sendTestEvent = async () => {
    setIsRunning(true);
    await sendTestTelemetryEvent();
    setIsRunning(false);
  };

  // Cleanup connections on unmount
  useEffect(() => {
    return () => {
      Object.values(testConnections.current).forEach(ws => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
    };
  }, []);

  const getStatusIcon = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending':
        return <Activity className="w-4 h-4 text-gray-400" />;
      case 'testing':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: DiagnosticStep['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-500/20 border-gray-500/30';
      case 'testing':
        return 'bg-blue-500/20 border-blue-500/30';
      case 'success':
        return 'bg-green-500/20 border-green-500/30';
      case 'error':
        return 'bg-red-500/20 border-red-500/30';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500/30';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Pipeline Diagnostic</h2>
          <p className="text-sm text-white/60 mt-1">Test WebSocket connections in the event pipeline</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sendTestEvent}
            disabled={isRunning}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Test Event
          </button>
          <button
            onClick={runDiagnostic}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Testing...' : 'Run Diagnostic'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.endpoint}
            className={`p-4 rounded-lg border ${getStatusColor(step.status)} transition-all`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(step.status)}
                <div>
                  <div className="font-semibold text-white">{step.name}</div>
                  <div className="text-xs text-white/60">{step.endpoint}</div>
                </div>
              </div>
              {step.message && (
                <div className="text-sm text-white/80">{step.message}</div>
              )}
            </div>
            {step.details && (
              <div className="mt-3 p-2 bg-black/20 rounded text-xs text-white/60">
                <pre>{JSON.stringify(step.details, null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/10">
        <h3 className="text-sm font-semibold text-white mb-2">Pipeline Flow:</h3>
        <div className="text-xs text-white/60 space-y-1">
          <div>1. Marketing site (sentientiq.ai) → Telemetry Gateway (port 3002)</div>
          <div>2. Gateway → Redis Stream (telemetry_events)</div>
          <div>3. Behavior Processor → Redis Pub/Sub (emotional_events)</div>
          <div>4. Emotional Broadcaster (port 3003) → Dashboard</div>
          <div>5. Intervention logic → Intervention Broadcaster (port 3004)</div>
        </div>
      </div>
    </motion.div>
  );
};

export default PipelineDiagnostic;