/**
 * SentientIQ API Client
 * Connects to the PhD Collective Neural Intelligence
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://3.15.29.138:8000';

export interface AskRequest {
  question: string;
  agent?: string;
  context?: Record<string, any>;
}

export interface AskResponse {
  agent: string;
  decision: 'GO' | 'WAIT';
  confidence: number;
  insight: string;
  why: {
    features: Record<string, number>;
    model_version: string;
  };
  query: string;
}

export interface PulseSnapshot {
  timestamp: number;
  evi: number;
  trend: 'rising' | 'falling' | 'stable';
  signals: Record<string, any>;
  consensus: number;
  alert_level: string;
}

export const AGENTS = [
  'Strategy',
  'Emotion',
  'Pattern',
  'Identity',
  'Chaos',
  'ROI',
  'Warfare',
  'Omni',
  'First',
  'Truth',
  'Brutal',
  'Context'
] as const;

export type AgentType = typeof AGENTS[number];

class SentientAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async ask(request: AskRequest): Promise<AskResponse> {
    const response = await fetch(`${this.baseUrl}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async getPulseSnapshot(): Promise<PulseSnapshot> {
    const response = await fetch(`${this.baseUrl}/pulse/snapshot`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  subscribeToPulse(onMessage: (data: PulseSnapshot) => void): EventSource {
    const eventSource = new EventSource(`${this.baseUrl}/pulse`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        console.error('Failed to parse pulse data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Pulse stream error:', error);
    };

    return eventSource;
  }

  async sendFeedback(feedback: {
    ask_payload: any;
    answer_payload: any;
    outcome: any;
  }): Promise<{ ok: boolean; feedback_id: string }> {
    const response = await fetch(`${this.baseUrl}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.baseUrl}/healthz`);
    return response.json();
  }

  async getVersion(): Promise<{ version: string; aws_region: string }> {
    const response = await fetch(`${this.baseUrl}/version`);
    return response.json();
  }
}

export const api = new SentientAPI();