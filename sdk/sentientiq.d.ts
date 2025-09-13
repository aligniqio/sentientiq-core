/**
 * SentientIQ SDK TypeScript Definitions
 * 
 * One line to save millions.
 */

declare module '@sentientiq/sdk' {
  export interface UserTraits {
    email?: string;
    name?: string;
    company?: string;
    plan?: string;
    ltv?: number;
    value?: number;
    revenue?: number;
    [key: string]: any;
  }

  export interface EmotionEvent {
    type: 'emotion';
    emotion: string;
    confidence: number;
    section: string | null;
    velocity: number;
    userId: string | null;
    ltv: number;
    timestamp: number;
  }

  export interface InterventionEvent {
    type: 'intervention';
    action: 'show_chat' | 'show_discount' | 'highlight_element' | string;
    message?: string;
    offerId?: string;
    selector?: string;
    [key: string]: any;
  }

  export interface InitOptions {
    debug?: boolean;
    endpoint?: string;
    sampleRate?: number;
    autoIdentify?: boolean;
  }

  export interface SentientIQSDK {
    /**
     * Initialize SentientIQ with your API key
     */
    init(apiKey: string, options?: InitOptions): void;

    /**
     * Identify the current user
     */
    identify(userId: string, traits?: UserTraits): void;

    /**
     * Track a custom event
     */
    track(eventName: string, properties?: Record<string, any>): void;

    /**
     * Track a page view
     */
    page(name?: string, properties?: Record<string, any>): void;

    /**
     * Track revenue
     */
    revenue(amount: number, properties?: Record<string, any>): void;

    /**
     * Listen for emotion detection events
     */
    on(event: 'emotion', callback: (data: EmotionEvent) => void): void;
    
    /**
     * Listen for intervention events
     */
    on(event: 'intervention', callback: (data: InterventionEvent) => void): void;
    
    /**
     * Listen for SDK ready event
     */
    on(event: 'ready', callback: () => void): void;

    /**
     * Accept an offer (used internally by intervention UI)
     */
    acceptOffer(offerId: string): void;

    // State
    readonly initialized: boolean;
    readonly connected: boolean;
    readonly sessionId: string | null;
    readonly userId: string | null;
    readonly currentSection: string | null;
    readonly velocity: number;
    readonly acceleration: number;
  }

  const SentientIQ: SentientIQSDK;
  export default SentientIQ;
}

// Global declaration for script tag usage
declare global {
  interface Window {
    SentientIQ: import('@sentientiq/sdk').SentientIQSDK;
  }
}