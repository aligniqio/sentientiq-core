/**
 * Intervention Configuration & CDN Publishing API
 *
 * UI-driven configuration builder with automatic CDN deployment
 * Zero-friction GTM integration
 */

import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = Router();

// Supabase for config storage
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

// CDN configuration
const CDN_BASE_URL = process.env.CDN_BASE_URL || 'https://cdn.sentientiq.ai';
const BUNDLE_URL = `${CDN_BASE_URL}/v4.1/bundle.min.js`;

interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  fontFamily?: string;
  tone: 'formal' | 'casual' | 'friendly' | 'professional';
}

interface OffersConfig {
  discountPercent?: number;
  discountCode?: string;
  freeTrialDays?: number;
  roiMultiplier?: string;
  avgSavings?: string;
  // Automotive-specific offers
  cashBackAmount?: string;
  aprOffer?: string;
  testDriveIncentive?: string;
  tradeInBonus?: string;
  leaseSpecial?: string;
}

interface ChannelsConfig {
  supportUrl?: string;
  calendarUrl?: string;
  demoVideoUrl?: string;
  caseStudyUrl?: string;
  chatProvider?: 'intercom' | 'zendesk' | 'drift' | 'custom';
}

interface InterventionToggle {
  id: string;
  enabled: boolean;
  customMessage?: string;
}

interface TenantConfig {
  tenantId: string;
  apiKey: string;
  branding: BrandingConfig;
  offers: OffersConfig;
  channels: ChannelsConfig;
  interventions: InterventionToggle[];
  template: 'saas' | 'ecommerce' | 'automotive' | 'custom';
  createdAt?: Date;
  updatedAt?: Date;
  publishedVersion?: number;
}

/**
 * Get or create tenant configuration
 */
router.get('/config/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!supabase) {
      return res.status(503).json({ error: 'Configuration service unavailable' });
    }

    // Fetch existing config
    const { data, error } = await supabase
      .from('intervention_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error;
    }

    if (data) {
      return res.json({ success: true, config: data });
    }

    // Create default config for new tenant
    const defaultConfig: TenantConfig = {
      tenantId,
      apiKey: `sq_${crypto.randomBytes(16).toString('hex')}`,
      branding: {
        companyName: 'Your Company',
        primaryColor: '#7f5af0',
        accentColor: '#22c55e',
        tone: 'professional'
      },
      offers: {
        discountPercent: 20,
        discountCode: 'SAVE20',
        freeTrialDays: 14,
        roiMultiplier: '3.2x'
      },
      channels: {
        supportUrl: 'https://calendly.com/demo'
      },
      interventions: [
        { id: 'price_hover_assist', enabled: true },
        { id: 'exit_save', enabled: true },
        { id: 'confusion_help', enabled: false }
      ],
      template: 'saas',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedVersion: 0
    };

    const { data: newConfig, error: insertError } = await supabase
      .from('intervention_configs')
      .insert([{
        tenant_id: tenantId,
        ...defaultConfig
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    res.json({ success: true, config: newConfig, isNew: true });
  } catch (error: any) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update tenant configuration (saves to DB)
 */
router.put('/config/:tenantId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    if (!supabase) {
      return res.status(503).json({ error: 'Configuration service unavailable' });
    }

    // Update config
    const { data, error } = await supabase
      .from('intervention_configs')
      .update({
        ...updates,
        updated_at: new Date()
      })
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      config: data,
      message: 'Configuration saved'
    });
  } catch (error: any) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Publish configuration to CDN
 */
router.post('/config/:tenantId/publish', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!supabase) {
      return res.status(503).json({ error: 'Configuration service unavailable' });
    }

    // Fetch current config
    const { data: config, error } = await supabase
      .from('intervention_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;
    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    // Generate intervention rules based on template and toggles
    const rules = generateInterventionRules(config);

    // Build CDN-ready config
    const cdnConfig = {
      theme: {
        brandName: config.branding.companyName,
        primary: config.branding.primaryColor,
        accent: config.branding.accentColor,
        text: '#f8fafc',
        bg: '#0f1220',
        fontFamily: config.branding.fontFamily || 'Inter, -apple-system, sans-serif',
        logo: config.branding.logoUrl
      },
      globals: {
        supportUrl: config.channels.supportUrl,
        calendarUrl: config.channels.calendarUrl,
        discountCode: config.offers.discountCode,
        discountPercent: config.offers.discountPercent,
        freeTrialDays: config.offers.freeTrialDays,
        roiMultiplier: config.offers.roiMultiplier,
        avgSavings: config.offers.avgSavings,
        demoVideoUrl: config.channels.demoVideoUrl,
        caseStudyUrl: config.channels.caseStudyUrl
      },
      rules,
      analyticsEndpoint: `${process.env.API_BASE_URL || 'https://api.sentientiq.app'}/api/interventions/analytics`,
      version: Date.now()
    };

    // Simulate CDN upload (in production, use S3/CloudFront)
    const cdnUrl = await publishToCDN(tenantId, cdnConfig);

    // Update published version
    await supabase
      .from('intervention_configs')
      .update({
        published_version: cdnConfig.version,
        published_at: new Date(),
        cdn_url: cdnUrl
      })
      .eq('tenant_id', tenantId);

    // Generate GTM snippet
    const gtmSnippet = `<!-- SentientIQ v4.1 - Real Emotions, Real Interventions -->
<!-- Step 1: Load Detection Engine -->
<script src="https://sentientiq.ai/detect-v4.js"></script>

<!-- Step 2: Load Intervention Library -->
<script src="https://sentientiq.ai/interventions-v4.js"></script>

<!-- Step 3: Initialize with your configuration -->
<script>
(function() {
  // Initialize detection engine
  window.SentientIQ = window.SentientIQ || {};
  window.SentientIQ.config = {
    tenantId: '${tenantId}',
    apiKey: '${config.apiKey}',
    apiUrl: 'https://api.sentientiq.app',
    tier: '${config.tier || 'starter'}'
  };

  // Configuration will be loaded from CDN
  // ${cdnUrl}

  console.log('[SentientIQ] v4.1 initialized for ${config.branding?.companyName || tenantId}');
})();
</script>`;

    res.json({
      success: true,
      cdnUrl,
      gtmSnippet,
      previewUrl: `https://preview.sentientiq.ai/${tenantId}`,
      version: cdnConfig.version
    });
  } catch (error: any) {
    console.error('Error publishing config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate preview of interventions
 */
router.get('/config/:tenantId/preview', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!supabase) {
      return res.status(503).json({ error: 'Configuration service unavailable' });
    }

    const { data: config, error } = await supabase
      .from('intervention_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error) throw error;

    // Generate HTML preview page
    const previewHtml = `<!DOCTYPE html>
<html>
<head>
  <title>SentientIQ Preview - ${config.branding.companyName}</title>
  <style>
    body { font-family: ${config.branding.fontFamily || 'Inter'}; background: #0f1220; color: #f8fafc; padding: 2rem; }
    .preview-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 2rem; margin: 2rem 0; }
    .brand-preview { display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem; }
    .logo { width: 48px; height: 48px; border-radius: 8px; background: white; }
    .colors { display: flex; gap: 1rem; }
    .color-swatch { width: 60px; height: 60px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; }
    .intervention { background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 8px; margin: 0.5rem 0; }
    .enabled { border-left: 3px solid ${config.branding.accentColor}; }
    .disabled { opacity: 0.5; }
  </style>
</head>
<body>
  <h1>SentientIQ Intervention Preview</h1>

  <div class="preview-card">
    <h2>Branding</h2>
    <div class="brand-preview">
      ${config.branding.logoUrl ? `<img src="${config.branding.logoUrl}" class="logo" />` : '<div class="logo"></div>'}
      <div>
        <h3>${config.branding.companyName}</h3>
        <p>Tone: ${config.branding.tone}</p>
      </div>
    </div>
    <div class="colors">
      <div class="color-swatch" style="background: ${config.branding.primaryColor}">Primary</div>
      <div class="color-swatch" style="background: ${config.branding.accentColor}">Accent</div>
    </div>
  </div>

  <div class="preview-card">
    <h2>Offers</h2>
    <ul>
      <li>Discount: ${config.offers.discountPercent}% off (Code: ${config.offers.discountCode})</li>
      <li>Free Trial: ${config.offers.freeTrialDays} days</li>
      <li>ROI: ${config.offers.roiMultiplier}</li>
    </ul>
  </div>

  <div class="preview-card">
    <h2>Active Interventions</h2>
    ${config.interventions.map((i: InterventionToggle) => `
      <div class="intervention ${i.enabled ? 'enabled' : 'disabled'}">
        <strong>${i.id}</strong>
        ${i.customMessage ? `<p>${i.customMessage}</p>` : ''}
      </div>
    `).join('')}
  </div>

  <script src="${BUNDLE_URL}"></script>
  <script>
    // Load actual config for testing
    new SQInterventions({
      configUrl: '${config.cdn_url || `${CDN_BASE_URL}/configs/${tenantId}.json`}',
      apiKey: '${config.apiKey}',
      tenantId: '${tenantId}',
      debug: true
    }).init();
  </script>
</body>
</html>`;

    res.send(previewHtml);
  } catch (error: any) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get GTM installation instructions
 */
router.get('/config/:tenantId/gtm-guide', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    const guide = {
      steps: [
        {
          step: 1,
          title: "Open Google Tag Manager",
          instruction: "Log in to your GTM account and select your container"
        },
        {
          step: 2,
          title: "Create New Tag",
          instruction: "Click 'New Tag' and name it 'SentientIQ Interventions'"
        },
        {
          step: 3,
          title: "Choose Tag Type",
          instruction: "Select 'Custom HTML' as the tag type"
        },
        {
          step: 4,
          title: "Paste Code",
          instruction: "Copy and paste the provided GTM snippet into the HTML field"
        },
        {
          step: 5,
          title: "Set Trigger",
          instruction: "Add trigger: 'All Pages' or 'Page View - DOM Ready'"
        },
        {
          step: 6,
          title: "Save & Publish",
          instruction: "Save the tag and publish your container"
        }
      ],
      alternativeInstallation: {
        shopify: "Add to theme.liquid before </head>",
        wordpress: "Use 'Insert Headers and Footers' plugin",
        squarespace: "Settings → Advanced → Code Injection → Header",
        wix: "Settings → Custom Code → Add Code → Head"
      },
      testingSteps: [
        "Open your website with ?sq_debug=true parameter",
        "Open browser console to see intervention logs",
        "Test emotions on pricing page to trigger interventions"
      ]
    };

    res.json({ success: true, guide });
  } catch (error: any) {
    console.error('Error generating guide:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: Generate intervention rules based on template
 */
function generateInterventionRules(config: TenantConfig) {
  const rules = [];
  const { template, interventions, offers, channels, branding } = config;

  // Price hover assistance
  if (interventions.find(i => i.id === 'price_hover_assist')?.enabled) {
    rules.push({
      id: 'price_hover_assist',
      action: 'high_consideration_nurture',
      when: {
        emotionsAny: ['high_consideration', 'purchase_intent'],
        contextElementAny: ['PRICE_TIER', 'PRICE_ELEMENT'],
        minConfidence: 70,
        pages: ['/pricing*', '/plans*', '/upgrade*']
      },
      variant: {
        type: 'modal',
        title: `👋 Considering {{brand.brandName}}?`,
        body: interventions.find(i => i.id === 'price_hover_assist')?.customMessage ||
              `I see you're exploring our pricing. Most customers see {{globals.roiMultiplier}} ROI. Can I show you how?`,
        primary: {
          label: 'Calculate my ROI',
          href: '{{globals.calendarUrl}}'
        },
        secondary: {
          label: 'Watch 2-min demo',
          href: '{{globals.demoVideoUrl}}'
        }
      },
      frequency: { perSession: 1, cooldownSec: 300 }
    });
  }

  // Exit intent save
  if (interventions.find(i => i.id === 'exit_save')?.enabled) {
    rules.push({
      id: 'exit_save',
      action: 'offer_help_or_incentive',
      when: {
        emotionsAny: ['abandonment_risk', 'exit_intent'],
        minConfidence: 75
      },
      variant: {
        type: 'modal',
        title: 'Before you go...',
        body: `Get {{globals.discountPercent}}% off your first month with code {{globals.discountCode}}`,
        primary: {
          label: 'Claim discount',
          href: '/signup?code={{globals.discountCode}}'
        },
        secondary: {
          label: 'No thanks',
          href: '#close'
        },
        ttlMs: 10000
      },
      frequency: { perSession: 1, cooldownSec: 600 }
    });
  }

  // Confusion help
  if (interventions.find(i => i.id === 'confusion_help')?.enabled) {
    rules.push({
      id: 'confusion_help',
      action: 'micro_assist_tooltip',
      when: {
        emotionsAny: ['confusion', 'frustration'],
        minConfidence: 65
      },
      variant: {
        type: 'tooltip',
        title: 'Need help?',
        body: interventions.find(i => i.id === 'confusion_help')?.customMessage ||
              'Click here for a quick walkthrough',
        cta: {
          label: 'Show me',
          href: '{{globals.supportUrl}}'
        },
        ttlMs: 8000
      },
      frequency: { perSession: 2, cooldownSec: 180 }
    });
  }

  // Add template-specific rules
  if (template === 'ecommerce') {
    rules.push({
      id: 'cart_abandonment',
      action: 'offer_help_or_incentive',
      when: {
        emotionsAny: ['abandonment_risk'],
        pages: ['/cart*', '/checkout*'],
        minConfidence: 70
      },
      variant: {
        type: 'modal',
        title: 'Complete your order',
        body: `Get free shipping on this order with code FREESHIP`,
        primary: { label: 'Continue checkout', href: '/checkout' }
      }
    });
  }

  return rules;
}

/**
 * Helper: Publish config to CDN (simulated for now)
 */
async function publishToCDN(tenantId: string, config: any): Promise<string> {
  // In production, this would upload to S3/CloudFront
  // For now, we'll store in Supabase storage or return a mock URL

  const configUrl = `${CDN_BASE_URL}/configs/${tenantId}.json`;

  // If we had S3 configured:
  /*
  const s3Client = new S3Client({ region: 'us-west-2' });
  await s3Client.send(new PutObjectCommand({
    Bucket: 'sentientiq-cdn',
    Key: `configs/${tenantId}.json`,
    Body: JSON.stringify(config),
    ContentType: 'application/json',
    CacheControl: 'public, max-age=300'
  }));

  // Invalidate CloudFront
  const cfClient = new CloudFrontClient({ region: 'us-west-2' });
  await cfClient.send(new CreateInvalidationCommand({
    DistributionId: process.env.CF_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: { Quantity: 1, Items: [`/configs/${tenantId}.json`] }
    }
  }));
  */

  // Store in Supabase for now
  if (supabase) {
    await supabase
      .from('cdn_configs')
      .upsert({
        tenant_id: tenantId,
        config: config,
        updated_at: new Date()
      });
  }

  return configUrl;
}

/**
 * Get intervention statistics for Actions dashboard
 * Returns real-time intervention counts and revenue impact
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { range = '24h', tenantId } = req.query;

    // Calculate time window
    const now = new Date();
    const startTime = new Date();

    switch(range) {
      case '24h':
        startTime.setHours(now.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setHours(now.getHours() - 24);
    }

    if (!supabase) {
      // No database connection - fail honestly
      return res.status(503).json({
        error: 'Database connection unavailable',
        message: 'Cannot retrieve intervention statistics without database connection'
      });
    }

    // Query real intervention data from database
    const { data: interventions, error } = await supabase
      .from('intervention_events')
      .select('type, interaction_occurred, revenue_attributed')
      .gte('created_at', startTime.toISOString())
      .eq('tenant_id', tenantId || 'default');

    if (error) throw error;

    // Aggregate stats by intervention type
    const stats: Record<string, any> = {};

    if (interventions) {
      interventions.forEach((event: any) => {
        if (!stats[event.type]) {
          stats[event.type] = { fired: 0, interacted: 0, revenue: 0 };
        }
        stats[event.type].fired++;
        if (event.interaction_occurred) {
          stats[event.type].interacted++;
        }
        stats[event.type].revenue += event.revenue_attributed || 0;
      });
    }

    res.json({
      success: true,
      stats: stats, // Return actual data or empty object
      timeRange: range,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching intervention stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get intervention metrics for Accountability Scorecard
 * Returns comprehensive metrics for accountability dashboard
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { period = '24h', tenantId } = req.query;

    // Calculate time window
    const now = new Date();
    const startTime = new Date();

    switch(period) {
      case '24h':
        startTime.setHours(now.getHours() - 24);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setHours(now.getHours() - 24);
    }

    if (!supabase) {
      // No database connection - fail honestly
      return res.status(503).json({
        error: 'Database connection unavailable',
        message: 'Cannot retrieve intervention metrics without database connection'
      });
    }

    // Query real metrics from database
    const { data: events, error } = await supabase
      .from('intervention_events')
      .select('*')
      .gte('created_at', startTime.toISOString())
      .eq('tenant_id', tenantId || 'default');

    if (error) throw error;

    // Calculate comprehensive metrics
    let totalInterventions = 0;
    let totalInteractions = 0;
    let revenueInfluenced = 0;
    const byType: Record<string, any> = {};
    const byEmotion: Record<string, any> = {};

    if (events) {
      events.forEach((event: any) => {
        totalInterventions++;
        if (event.interaction_occurred) {
          totalInteractions++;
        }
        revenueInfluenced += event.revenue_attributed || 0;

        // By type
        if (!byType[event.type]) {
          byType[event.type] = { count: 0, interactions: 0, revenue: 0 };
        }
        byType[event.type].count++;
        if (event.interaction_occurred) {
          byType[event.type].interactions++;
        }
        byType[event.type].revenue += event.revenue_attributed || 0;

        // By emotion
        const emotion = event.trigger_emotion || 'unknown';
        if (!byEmotion[emotion]) {
          byEmotion[emotion] = { count: 0, interactions: 0 };
        }
        byEmotion[emotion].count++;
        if (event.interaction_occurred) {
          byEmotion[emotion].interactions++;
        }
      });
    }

    // Find top and worst performers
    let topPerforming = '';
    let worstPerforming = '';
    let maxRate = 0;
    let minRate = 100;

    Object.entries(byType).forEach(([type, stats]: [string, any]) => {
      const rate = (stats.interactions / stats.count) * 100;
      if (rate > maxRate) {
        maxRate = rate;
        topPerforming = type;
      }
      if (rate < minRate && stats.count > 10) { // Min 10 events for significance
        minRate = rate;
        worstPerforming = type;
      }
    });

    const interactionRate = totalInterventions > 0
      ? (totalInteractions / totalInterventions * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      metrics: {
        total_interventions: totalInterventions,
        total_interactions: totalInteractions,
        interaction_rate: parseFloat(interactionRate as string),
        revenue_influenced: revenueInfluenced,
        avg_deal_size: revenueInfluenced > 0 && totalInteractions > 0
          ? Math.round(revenueInfluenced / totalInteractions)
          : 0,
        deals_influenced: totalInteractions, // Each interaction could be a deal
        top_performing: topPerforming || null,
        worst_performing: worstPerforming || null,
        by_emotion: byEmotion // Return actual data or empty object
      },
      period,
      lastUpdated: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching intervention metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;