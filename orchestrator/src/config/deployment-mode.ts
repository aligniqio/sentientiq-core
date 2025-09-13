/**
 * Deployment configuration for different environments
 */

export type DeploymentMode = 'development' | 'alpha' | 'beta' | 'production';

export interface DeploymentConfig {
  mode: DeploymentMode;
  features: {
    ceoAlerts: boolean;
    dealIntelligence: boolean;
    eviCalculations: boolean;
    advancedAnalytics: boolean;
    s3Storage: boolean;
    twilioNotifications: boolean;
  };
  infrastructure: {
    useStubs: boolean;
    stubMode: 'console' | 'slack' | 'supabase';
    batchSize: number;
    flushIntervalMs: number;
  };
}

export function getDeploymentConfig(): DeploymentConfig {
  const mode = (process.env.DEPLOYMENT_MODE || 'development') as DeploymentMode;
  
  const configs: Record<DeploymentMode, DeploymentConfig> = {
    development: {
      mode: 'development',
      features: {
        ceoAlerts: false,
        dealIntelligence: false,
        eviCalculations: false,
        advancedAnalytics: false,
        s3Storage: false,
        twilioNotifications: false,
      },
      infrastructure: {
        useStubs: true,
        stubMode: 'console',
        batchSize: 10,
        flushIntervalMs: 60000,
      },
    },
    alpha: {
      mode: 'alpha',
      features: {
        ceoAlerts: process.env.ENABLE_CEO_ALERTS === 'true',
        dealIntelligence: process.env.ENABLE_DEAL_INTELLIGENCE === 'true',
        eviCalculations: process.env.ENABLE_EVI_CALCULATIONS === 'true',
        advancedAnalytics: false,
        s3Storage: false,
        twilioNotifications: false,
      },
      infrastructure: {
        useStubs: true,
        stubMode: 'slack',
        batchSize: 50,
        flushIntervalMs: 30000,
      },
    },
    beta: {
      mode: 'beta',
      features: {
        ceoAlerts: true,
        dealIntelligence: true,
        eviCalculations: true,
        advancedAnalytics: true,
        s3Storage: !!process.env.AWS_ACCESS_KEY_ID,
        twilioNotifications: !!process.env.TWILIO_ACCOUNT_SID,
      },
      infrastructure: {
        useStubs: !process.env.AWS_ACCESS_KEY_ID,
        stubMode: 'supabase',
        batchSize: 500,
        flushIntervalMs: 15000,
      },
    },
    production: {
      mode: 'production',
      features: {
        ceoAlerts: true,
        dealIntelligence: true,
        eviCalculations: true,
        advancedAnalytics: true,
        s3Storage: true,
        twilioNotifications: true,
      },
      infrastructure: {
        useStubs: false,
        stubMode: 'supabase',
        batchSize: 1000,
        flushIntervalMs: 10000,
      },
    },
  };
  
  return configs[mode];
}

export function isFeatureEnabled(feature: keyof DeploymentConfig['features']): boolean {
  const config = getDeploymentConfig();
  return config.features[feature];
}

export function shouldUseStubs(): boolean {
  const config = getDeploymentConfig();
  return config.infrastructure.useStubs;
}

// Alias for backward compatibility
export const deploymentConfig = getDeploymentConfig();

export type FeatureFlag = keyof DeploymentConfig['features'];

export interface SubsystemStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'offline';
  message?: string;
}

export function getSubsystemStatus(): SubsystemStatus[] {
  const config = getDeploymentConfig();
  return [
    {
      name: 'emotion-detection',
      status: 'healthy',
      message: 'Core emotion detection operational'
    },
    {
      name: 'interventions',
      status: 'healthy',
      message: 'Intervention engine active'
    },
    {
      name: 'data-storage',
      status: config.infrastructure.useStubs ? 'degraded' : 'healthy',
      message: config.infrastructure.useStubs ? `Using ${config.infrastructure.stubMode} stub` : 'S3 + Athena active'
    },
    {
      name: 'notifications',
      status: config.features.twilioNotifications ? 'healthy' : 'degraded',
      message: config.features.twilioNotifications ? 'Twilio SMS active' : 'Using Slack fallback'
    }
  ];
}

export interface DeploymentReadiness {
  ready: boolean;
  mode: DeploymentMode;
  checks: {
    database: boolean;
    authentication: boolean;
    notifications: boolean;
    storage: boolean;
  };
  warnings: string[];
}

export function getDeploymentReadiness(): DeploymentReadiness {
  const config = getDeploymentConfig();
  const warnings: string[] = [];
  
  if (config.infrastructure.useStubs) {
    warnings.push('Using stub infrastructure - not production ready');
  }
  
  if (!process.env.CLERK_SECRET_KEY?.startsWith('sk_live_')) {
    warnings.push('Using test Clerk credentials');
  }
  
  const checks = {
    database: !!process.env.SUPABASE_URL,
    authentication: !!process.env.CLERK_SECRET_KEY,
    notifications: !!process.env.SLACK_WEBHOOK_URL || !!process.env.TWILIO_ACCOUNT_SID,
    storage: !config.infrastructure.useStubs || !!process.env.SUPABASE_URL,
  };
  
  return {
    ready: Object.values(checks).every(Boolean),
    mode: config.mode,
    checks,
    warnings,
  };
}