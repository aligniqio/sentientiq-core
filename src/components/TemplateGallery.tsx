/**
 * Template Gallery Component
 * Where interventions become irresistible
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabaseClient } from '@/lib/supabase';
import { interventionTemplates } from '@/data/intervention-templates';
import { InterventionTemplate, TenantBranding } from '@/types/intervention-templates';
import { Lock, Sparkles, Check, Eye, Palette, Code, TrendingUp } from 'lucide-react';

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(' ');

interface TemplateGalleryProps {
  tenantId: string;
  currentTier: 'starter' | 'growth' | 'scale' | 'enterprise';
  onTemplateSelect?: (template: InterventionTemplate) => void;
}

export const TemplateGallery: React.FC<TemplateGalleryProps> = ({
  tenantId,
  currentTier,
  onTemplateSelect
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'modal' | 'banner' | 'toast' | 'badge'>('modal');
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [customizing, setCustomizing] = useState(false);
  const supabase = getSupabaseClient();

  const toast = (options: { title: string; description?: string; variant?: string }) => {
    console.log('Toast:', options);
    // In production, use a real toast library
  };

  // Tier limits
  const tierLimits = {
    starter: 1,
    growth: 3,
    scale: 10,
    enterprise: Infinity
  };

  // Filter templates by tier
  const availableTemplates = interventionTemplates.filter(template => {
    const tierHierarchy = ['starter', 'growth', 'scale', 'enterprise'];
    const templateTierIndex = tierHierarchy.indexOf(template.tier);
    const userTierIndex = tierHierarchy.indexOf(currentTier);
    return templateTierIndex <= userTierIndex;
  });

  useEffect(() => {
    loadTenantConfiguration();
    loadTemplateAnalytics();
  }, [tenantId]);

  const loadTenantConfiguration = async () => {
    if (!supabase) {
      console.error('Supabase client not initialized');
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('tenant_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (data) {
        setBranding(data);
        setSelectedTemplate(data.selected_template_id);
      }
    } catch (error) {
      console.error('Error loading tenant configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateAnalytics = async () => {
    if (!supabase) return;

    try {
      const { data } = await supabase
        .from('template_analytics')
        .select('template_id, sum(impressions), sum(interactions), sum(conversions)')
        .eq('tenant_id', tenantId)
        .group('template_id');

      if (data) {
        const analyticsMap = data.reduce((acc: Record<string, any>, item: any) => {
          acc[item.template_id] = {
            impressions: item.sum_impressions || 0,
            interactions: item.sum_interactions || 0,
            conversions: item.sum_conversions || 0,
            conversionRate: item.sum_impressions > 0
              ? ((item.sum_conversions / item.sum_impressions) * 100).toFixed(2)
              : 0
          };
          return acc;
        }, {});
        setAnalytics(analyticsMap);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const selectTemplate = async (template: InterventionTemplate) => {
    setSelectedTemplate(template.id);

    if (!supabase) {
      console.error('Supabase client not initialized');
      return;
    }

    try {
      const { error } = await supabase
        .from('tenant_templates')
        .upsert({
          tenant_id: tenantId,
          tier: currentTier,
          selected_template_id: template.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) throw error;

      toast({
        title: 'Template Selected',
        description: `${template.name} is now your active template`,
      });

      if (onTemplateSelect) {
        onTemplateSelect(template);
      }
    } catch (error) {
      console.error('Error selecting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to update template selection',
        variant: 'destructive'
      });
    }
  };

  const renderTemplatePreview = (template: InterventionTemplate) => {
    const styles = template.styles[previewMode];
    const primaryColor = branding?.brand?.primaryColor || '#0066ff';

    // Helper function to parse CSS string into style object
    const parseCSS = (cssString: string): React.CSSProperties => {
      const styleObj: any = {};
      cssString.split(';').forEach(rule => {
        const [property, value] = rule.split(':').map(s => s?.trim());
        if (property && value) {
          const camelCase = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          styleObj[camelCase] = value;
        }
      });
      return styleObj;
    };

    // Generate preview CSS with branding
    const previewCSS = styles.container
      .replace(/{primary}/g, primaryColor)
      .replace(/{secondary}/g, branding?.brand?.secondaryColor || '#ffffff')
      .replace(/{accent}/g, branding?.brand?.accentColor || primaryColor);

    const buttonCSS = styles.button?.replace(/{primary}/g, primaryColor) || '';

    return (
      <div
        className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
        style={{ background: 'url(/grid-pattern.svg)' }}
      >
        {previewMode === 'modal' && (
          <div
            className="w-72 p-6 shadow-xl rounded-lg"
            style={parseCSS(previewCSS)}
          >
            <h3 className="text-lg font-bold mb-2">Special Offer!</h3>
            <p className="text-sm mb-4">Get 10% off your first order</p>
            <button
              className="px-4 py-2 rounded"
              style={parseCSS(buttonCSS)}
            >
              Claim Now
            </button>
          </div>
        )}

        {previewMode === 'banner' && (
          <div
            className="w-full px-6 py-3"
            style={parseCSS(previewCSS)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Limited Time: Free Shipping on Orders Over $50</span>
              <button className="text-sm underline">Shop Now</button>
            </div>
          </div>
        )}

        {previewMode === 'toast' && (
          <div
            className="px-4 py-3 rounded-lg shadow-lg"
            style={parseCSS(previewCSS)}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm">3 people just bought this!</span>
            </div>
          </div>
        )}

        {previewMode === 'badge' && (
          <div
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={parseCSS(previewCSS)}
          >
            Sale - 25% Off
          </div>
        )}
      </div>
    );
  };

  const isTemplateLocked = (template: InterventionTemplate) => {
    const tierHierarchy = ['starter', 'growth', 'scale', 'enterprise'];
    const templateTierIndex = tierHierarchy.indexOf(template.tier);
    const userTierIndex = tierHierarchy.indexOf(currentTier);
    return templateTierIndex > userTierIndex;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Preview Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['modal', 'banner', 'toast', 'badge'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setPreviewMode(mode)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                previewMode === mode
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              )}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCustomizing(!customizing)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Palette className="w-4 h-4" />
          Customize Branding
        </button>
      </div>

      {/* Branding Customizer */}
      <AnimatePresence>
        {customizing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-bold">Brand Customization</h3>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Primary Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={branding?.brand?.primaryColor || '#0066ff'}
                      onChange={(e) => setBranding({
                        ...branding!,
                        brand: { ...branding?.brand!, primaryColor: e.target.value }
                      })}
                      className="w-12 h-12 rounded border-2 border-gray-300"
                    />
                    <input
                      type="text"
                      value={branding?.brand?.primaryColor || '#0066ff'}
                      readOnly
                      className="flex-1 px-3 py-2 border rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Font Family</label>
                  <select
                    value={branding?.brand?.fontFamily || 'system-ui'}
                    onChange={(e) => setBranding({
                      ...branding!,
                      brand: { ...branding?.brand!, fontFamily: e.target.value }
                    })}
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  >
                    <option value="system-ui">System UI</option>
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Poppins, sans-serif">Poppins</option>
                    <option value="Playfair Display, serif">Playfair Display</option>
                    <option value="Space Mono, monospace">Space Mono</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={branding?.brand?.logoUrl || ''}
                    onChange={(e) => setBranding({
                      ...branding!,
                      brand: { ...branding?.brand!, logoUrl: e.target.value }
                    })}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border rounded-lg bg-white"
                  />
                </div>
              </div>

              {currentTier === 'enterprise' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Custom CSS</label>
                  <textarea
                    value={branding?.customCSS || ''}
                    onChange={(e) => setBranding({ ...branding!, customCSS: e.target.value })}
                    placeholder="/* Your custom styles */"
                    className="w-full h-32 px-3 py-2 border rounded-lg bg-white font-mono text-sm"
                  />
                </div>
              )}

              <button
                onClick={async () => {
                  // Save branding changes
                  const { error } = await supabase
                    .from('tenant_templates')
                    .update({
                      ...branding,
                      updated_at: new Date().toISOString()
                    })
                    .eq('tenant_id', tenantId);

                  if (!error) {
                    toast({ title: 'Branding Updated', description: 'Your brand settings have been saved' });
                    setCustomizing(false);
                  }
                }}
                className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800"
              >
                Save Branding
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableTemplates.map((template) => {
          const isLocked = isTemplateLocked(template);
          const isSelected = selectedTemplate === template.id;
          const stats = analytics[template.id];

          return (
            <motion.div
              key={template.id}
              whileHover={{ scale: isLocked ? 1 : 1.02 }}
              className={cn(
                'relative rounded-xl overflow-hidden transition-all',
                isSelected && 'ring-4 ring-blue-500 ring-offset-2',
                isLocked && 'opacity-60'
              )}
            >
              <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
                {/* Template Header */}
                <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{template.name}</h3>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-gray-400" />
                    ) : isSelected ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      template.tier === 'starter' && 'bg-gray-200 text-gray-700',
                      template.tier === 'growth' && 'bg-blue-100 text-blue-700',
                      template.tier === 'scale' && 'bg-purple-100 text-purple-700',
                      template.tier === 'enterprise' && 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                    )}>
                      {template.tier.toUpperCase()}
                    </span>

                    {template.industry.slice(0, 2).map(ind => (
                      <span key={ind.type} className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                        {ind.type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Template Preview */}
                <div className="p-4">
                  {renderTemplatePreview(template)}
                </div>

                {/* Template Stats */}
                {stats && (
                  <div className="px-4 pb-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{stats.impressions}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-medium">{stats.conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => !isLocked && selectTemplate(template)}
                      disabled={isLocked}
                      className={cn(
                        'flex-1 px-4 py-2 rounded-lg font-medium transition-colors',
                        isLocked
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : isSelected
                          ? 'bg-green-500 text-white'
                          : 'bg-black text-white hover:bg-gray-800'
                      )}
                    >
                      {isLocked ? 'Upgrade Required' : isSelected ? 'Active' : 'Select'}
                    </button>

                    {!isLocked && (
                      <button
                        onClick={() => {
                          // Open live preview
                          window.open(`/preview/${template.id}?tenant=${tenantId}`, '_blank');
                        }}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Enterprise Custom Template Card */}
        {currentTier === 'enterprise' && (
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative rounded-xl overflow-hidden bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-2 border-orange-200"
          >
            <div className="p-6 h-full flex flex-col items-center justify-center text-center">
              <Code className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="font-bold text-lg mb-2">Create Custom Template</h3>
              <p className="text-sm text-gray-600 mb-6">
                Build your own template from scratch with full control over HTML, CSS, and animations
              </p>
              <button
                onClick={() => {
                  // Open custom template builder
                  window.location.href = '/system/template-builder';
                }}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90"
              >
                Open Builder
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tier Upgrade Prompt */}
      {tierLimits[currentTier] < interventionTemplates.length && (
        <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Unlock More Templates</h3>
              <p className="text-white/80">
                Upgrade to access {interventionTemplates.length - availableTemplates.length} more premium templates
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/pricing'}
              className="px-6 py-3 bg-white text-purple-600 rounded-lg font-bold hover:bg-gray-100"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};