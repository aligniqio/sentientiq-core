/**
 * Tenant Template Configuration API
 * Manages template selection, branding, and customization
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

type NextApiRequest = any;
type NextApiResponse = any;
import { interventionTemplates } from '@/data/intervention-templates';
import { cssEngine } from '@/services/css-engine';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req;
  const tenantId = query.tenantId as string;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    switch (method) {
      case 'GET':
        return handleGet(tenantId, res);

      case 'POST':
      case 'PUT':
        return handleUpdate(tenantId, body, res);

      case 'DELETE':
        return handleDelete(tenantId, res);

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get tenant template configuration
 */
async function handleGet(tenantId: string, res: NextApiResponse) {
  // Get tenant configuration
  const { data: config, error: configError } = await supabase
    .from('tenant_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (configError && configError.code !== 'PGRST116') {
    throw configError;
  }

  // Get available templates based on tier
  const tier = config?.tier || 'starter';
  const availableTemplates = interventionTemplates.filter(template => {
    const tierHierarchy = ['starter', 'growth', 'scale', 'enterprise'];
    const templateTierIndex = tierHierarchy.indexOf(template.tier);
    const tenantTierIndex = tierHierarchy.indexOf(tier);
    return templateTierIndex <= tenantTierIndex;
  });

  // Get template analytics - simplified query without group by
  const { data: analytics } = await supabase
    .from('template_analytics')
    .select('template_id, impressions, interactions, conversions')
    .eq('tenant_id', tenantId)
    .gt('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

  // Get favorites
  const { data: favorites } = await supabase
    .from('template_favorites')
    .select('template_id')
    .eq('tenant_id', tenantId);

  // Get active experiments
  const { data: experiments } = await supabase
    .from('template_experiments')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'running');

  // Generate CSS for current template
  let generatedCSS = null;
  if (config?.selected_template_id) {
    const selectedTemplate = interventionTemplates.find(t => t.id === config.selected_template_id);
    if (selectedTemplate) {
      generatedCSS = {
        modal: cssEngine.generateTemplateCSS(selectedTemplate, config, 'modal'),
        banner: cssEngine.generateTemplateCSS(selectedTemplate, config, 'banner'),
        toast: cssEngine.generateTemplateCSS(selectedTemplate, config, 'toast'),
        badge: cssEngine.generateTemplateCSS(selectedTemplate, config, 'badge')
      };
    }
  }

  res.status(200).json({
    config,
    tier,
    availableTemplates,
    analytics: analytics || [],
    favorites: favorites?.map((f: any) => f.template_id) || [],
    experiments: experiments || [],
    generatedCSS,
    limits: {
      templates: getTierLimit(tier),
      customCSS: tier === 'enterprise',
      experiments: tier === 'scale' || tier === 'enterprise',
      customTemplates: tier === 'enterprise'
    }
  });
}

/**
 * Update tenant template configuration
 */
async function handleUpdate(tenantId: string, body: any, res: NextApiResponse) {
  const {
    tier,
    selected_template_id,
    brand,
    customCSS,
    customMessages
  } = body;

  // Validate template selection against tier
  if (selected_template_id) {
    const template = interventionTemplates.find(t => t.id === selected_template_id);
    if (!template) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    const tierHierarchy = ['starter', 'growth', 'scale', 'enterprise'];
    const templateTierIndex = tierHierarchy.indexOf(template.tier);
    const tenantTierIndex = tierHierarchy.indexOf(tier || 'starter');

    if (templateTierIndex > tenantTierIndex) {
      return res.status(403).json({
        error: 'Template requires higher tier',
        requiredTier: template.tier,
        currentTier: tier || 'starter'
      });
    }
  }

  // Validate custom CSS (enterprise only)
  if (customCSS && tier !== 'enterprise') {
    return res.status(403).json({
      error: 'Custom CSS requires enterprise tier'
    });
  }

  // Upsert configuration
  const { data, error } = await supabase
    .from('tenant_templates')
    .upsert({
      tenant_id: tenantId,
      tier: tier || 'starter',
      selected_template_id,
      company_name: brand?.companyName,
      logo_url: brand?.logoUrl,
      primary_color: brand?.primaryColor,
      secondary_color: brand?.secondaryColor,
      accent_color: brand?.accentColor,
      font_family: brand?.fontFamily,
      custom_css: customCSS,
      custom_messages: customMessages,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'tenant_id'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log template change
  if (selected_template_id) {
    await supabase
      .from('template_analytics')
      .insert({
        tenant_id: tenantId,
        template_id: selected_template_id,
        impressions: 0,
        interactions: 0,
        conversions: 0,
        timestamp: new Date().toISOString()
      });
  }

  // Generate CSS for new configuration
  let generatedCSS = null;
  if (data.selected_template_id) {
    const selectedTemplate = interventionTemplates.find(t => t.id === data.selected_template_id);
    if (selectedTemplate) {
      generatedCSS = {
        modal: cssEngine.generateTemplateCSS(selectedTemplate, data, 'modal'),
        banner: cssEngine.generateTemplateCSS(selectedTemplate, data, 'banner'),
        toast: cssEngine.generateTemplateCSS(selectedTemplate, data, 'toast'),
        badge: cssEngine.generateTemplateCSS(selectedTemplate, data, 'badge')
      };
    }
  }

  res.status(200).json({
    config: data,
    generatedCSS,
    message: 'Template configuration updated successfully'
  });
}

/**
 * Delete tenant template configuration
 */
async function handleDelete(tenantId: string, res: NextApiResponse) {
  const { error } = await supabase
    .from('tenant_templates')
    .delete()
    .eq('tenant_id', tenantId);

  if (error) {
    throw error;
  }

  res.status(200).json({
    message: 'Template configuration deleted successfully'
  });
}

/**
 * Get tier template limit
 */
function getTierLimit(tier: string): number {
  const limits: Record<string, number> = {
    starter: 1,
    growth: 3,
    scale: 10,
    enterprise: Infinity
  };
  return limits[tier] || 1;
}