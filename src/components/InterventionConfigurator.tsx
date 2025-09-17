/**
 * Intervention Configurator
 * The moment of truth - where trust meets customization
 * After GTM hell, this is where we deliver value
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Type,
  Sparkles,
  Eye,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { getSupabaseClient } from '@/lib/supabase';

interface ComparisonData {
  competitors: string[];
  features: {
    name: string;
    us: boolean;
    competitor1: boolean;
    competitor2: boolean;
    competitor3: boolean;
  }[];
}

interface InterventionConfig {
  // Branding
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'heavy';

  // Content for each intervention type
  interventions: {
    [key: string]: {
      enabled: boolean;
      headline: string;
      body: string;
      ctaText: string;
      discount?: number;
      comparisonData?: ComparisonData;
      timing: {
        delay: number;
        duration: number;
        persistence: 'sticky' | 'timed' | 'until-scroll' | 'until-interaction';
      };
    };
  };

  // Global behavior
  position: 'top' | 'bottom' | 'center' | 'bottom-right' | 'bottom-left';
  animation: 'fade' | 'slide' | 'bounce' | 'scale';
}

// Define intervention types based on orchestrator mapping
const INTERVENTION_TYPES = [
  {
    id: 'discount_offer',
    name: 'Discount Modal',
    emotion: 'price_shock, sticker_shock',
    icon: '💰',
    description: 'Offer discount when price sensitivity detected'
  },
  {
    id: 'trust_signal',
    name: 'Trust Badges',
    emotion: 'skeptical, evaluation',
    icon: '🔒',
    description: 'Show security badges and guarantees'
  },
  {
    id: 'urgency_scarcity',
    name: 'Urgency Banner',
    emotion: 'hesitation, cart_review',
    icon: '⏰',
    description: 'Create urgency with limited time/stock'
  },
  {
    id: 'social_proof',
    name: 'Social Toast',
    emotion: 'evaluation, comparison_shopping',
    icon: '🔥',
    description: 'Show real-time activity and popularity'
  },
  {
    id: 'help_offer',
    name: 'Help Chat',
    emotion: 'confusion, frustration',
    icon: '💬',
    description: 'Proactive chat support offer'
  },
  {
    id: 'value_proposition',
    name: 'Value Highlight',
    emotion: 'cart_hesitation',
    icon: '✨',
    description: 'Reinforce key value propositions'
  },
  {
    id: 'comparison_table',
    name: 'Comparison Modal',
    emotion: 'comparison_shopping, anxiety',
    icon: '📊',
    description: 'Show competitive advantages'
  },
  {
    id: 'exit_rescue',
    name: 'Exit Intent',
    emotion: 'abandonment_intent, exit_risk',
    icon: '🚪',
    description: 'Last-chance offer before leaving'
  }
];

export const InterventionConfigurator: React.FC = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [selectedIntervention, setSelectedIntervention] = useState('discount_offer');

  const [config, setConfig] = useState<InterventionConfig>({
    primaryColor: '#0066ff',
    secondaryColor: '#ffffff',
    fontFamily: 'inherit',
    borderRadius: '8px',
    shadowIntensity: 'medium',
    position: 'bottom-right',
    animation: 'slide',
    interventions: {
      discount_offer: {
        enabled: true,
        headline: 'Wait! Here\'s Something Special',
        body: 'We noticed you\'ve been carefully considering. Here\'s an exclusive 15% off just for you.',
        ctaText: 'Claim My Discount',
        discount: 15,
        timing: { delay: 0, duration: 0, persistence: 'sticky' }
      },
      trust_signal: {
        enabled: true,
        headline: '🔒 Shop with Confidence',
        body: 'SSL Secured • Money-Back Guarantee • 50,000+ Happy Customers',
        ctaText: 'Continue Securely',
        timing: { delay: 1000, duration: 10000, persistence: 'timed' }
      },
      urgency_scarcity: {
        enabled: true,
        headline: '⏰ Limited Time Offer',
        body: 'Only 3 items left at this price! Sale ends in 2 hours.',
        ctaText: 'Secure My Order',
        timing: { delay: 0, duration: 20000, persistence: 'until-interaction' }
      },
      social_proof: {
        enabled: true,
        headline: '🔥 Trending Now',
        body: '12 people are viewing this • 5 purchased in the last hour',
        ctaText: '',
        timing: { delay: 2000, duration: 8000, persistence: 'timed' }
      },
      help_offer: {
        enabled: true,
        headline: 'Need Help Deciding?',
        body: 'Our product experts are here to help you find the perfect fit.',
        ctaText: 'Chat with Expert',
        timing: { delay: 3000, duration: 0, persistence: 'sticky' }
      },
      value_proposition: {
        enabled: true,
        headline: 'Still Considering Your Options?',
        body: 'Here\'s why thousands choose us: ✓ 30-day guarantee ✓ Free shipping ✓ 24/7 support',
        ctaText: 'See Why We\'re Different',
        timing: { delay: 500, duration: 15000, persistence: 'until-scroll' }
      },
      comparison_table: {
        enabled: true,
        headline: 'See How We Compare',
        body: 'We\'ve done the research for you. See why we\'re the #1 choice.',
        ctaText: 'View Comparison',
        comparisonData: {
          competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
          features: [
            { name: '24/7 Support', us: true, competitor1: false, competitor2: true, competitor3: false },
            { name: 'Free Shipping', us: true, competitor1: true, competitor2: false, competitor3: false },
            { name: 'Money-Back Guarantee', us: true, competitor1: false, competitor2: false, competitor3: true },
            { name: 'Same-Day Service', us: true, competitor1: false, competitor2: false, competitor3: false },
            { name: 'Lifetime Warranty', us: true, competitor1: false, competitor2: true, competitor3: false }
          ]
        },
        timing: { delay: 1000, duration: 0, persistence: 'sticky' }
      },
      exit_rescue: {
        enabled: true,
        headline: 'Before You Go...',
        body: 'We\'d hate to see you leave empty-handed. How about 20% off your entire order?',
        ctaText: 'Yes, I\'ll Take It!',
        discount: 20,
        timing: { delay: 0, duration: 0, persistence: 'sticky' }
      }
    }
  });

  const [isLivePreview, setIsLivePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  // Font options that work everywhere
  const fontOptions = [
    { value: 'inherit', label: 'Use My Site Font', preview: 'Matches your website' },
    { value: 'system-ui, -apple-system, sans-serif', label: 'System Default', preview: 'Clean & Native' },
    { value: 'Georgia, serif', label: 'Georgia', preview: 'Classic & Trustworthy' },
    { value: '"Helvetica Neue", Helvetica, Arial, sans-serif', label: 'Helvetica', preview: 'Swiss Precision' },
    { value: '"Segoe UI", Tahoma, Geneva, sans-serif', label: 'Segoe', preview: 'Modern Windows' }
  ];

  // Generate live CSS
  const generateCSS = () => {
    const shadow = {
      none: 'none',
      subtle: '0 2px 8px rgba(0,0,0,0.08)',
      medium: '0 4px 16px rgba(0,0,0,0.12)',
      heavy: '0 8px 32px rgba(0,0,0,0.16)'
    }[config.shadowIntensity];

    return `.sentientiq-intervention {
  /* Your brand, your style */
  --sq-primary: ${config.primaryColor};
  --sq-secondary: ${config.secondaryColor};
  --sq-font: ${config.fontFamily};
  --sq-radius: ${config.borderRadius};
  --sq-shadow: ${shadow};

  /* Applied to all interventions */
  font-family: var(--sq-font);
  background: var(--sq-secondary);
  color: var(--sq-primary);
  border-radius: var(--sq-radius);
  box-shadow: var(--sq-shadow);
}

.sentientiq-intervention__cta {
  background: var(--sq-primary);
  color: var(--sq-secondary);
  border-radius: calc(var(--sq-radius) / 2);
  font-weight: 600;
  transition: all 0.2s ease;
}

.sentientiq-intervention__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}`;
  };

  // Update intervention config
  const updateIntervention = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      interventions: {
        ...prev.interventions,
        [selectedIntervention]: {
          ...prev.interventions[selectedIntervention],
          [field]: value
        }
      }
    }));
  };

  // Live preview component
  const LivePreview = () => {
    const intervention = config.interventions[selectedIntervention];
    const previewStyles = {
      fontFamily: config.fontFamily,
      backgroundColor: config.secondaryColor,
      color: config.primaryColor === '#ffffff' ? '#000000' : config.primaryColor,
      borderRadius: config.borderRadius,
      boxShadow: {
        none: 'none',
        subtle: '0 2px 8px rgba(0,0,0,0.08)',
        medium: '0 4px 16px rgba(0,0,0,0.12)',
        heavy: '0 8px 32px rgba(0,0,0,0.16)'
      }[config.shadowIntensity]
    };

    const buttonStyles = {
      backgroundColor: config.primaryColor,
      color: config.secondaryColor,
      borderRadius: `calc(${config.borderRadius} / 2)`,
      fontWeight: 600
    };

    // Special preview for comparison table
    if (selectedIntervention === 'comparison_table' && intervention.comparisonData) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 w-full max-w-md mx-auto"
          style={previewStyles}
        >
          <h3 className="text-lg font-bold mb-2">{intervention.headline}</h3>
          <p className="text-sm mb-4 opacity-90">{intervention.body}</p>

          {/* Mini Comparison Table */}
          <div className="text-xs">
            <div className="grid grid-cols-4 gap-1 mb-2 font-semibold">
              <div>Features</div>
              <div className="text-center">Us</div>
              {intervention.comparisonData.competitors.slice(0, 2).map((comp, idx) => (
                <div key={idx} className="text-center truncate">{comp}</div>
              ))}
            </div>
            {intervention.comparisonData.features.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="grid grid-cols-4 gap-1 py-1 border-t border-opacity-20">
                <div className="truncate">{feature.name}</div>
                <div className="text-center">{feature.us ? '✓' : '✗'}</div>
                <div className="text-center">{feature.competitor1 ? '✓' : '✗'}</div>
                <div className="text-center">{feature.competitor2 ? '✓' : '✗'}</div>
              </div>
            ))}
          </div>

          {intervention.ctaText && (
            <button
              className="px-6 py-2.5 text-sm font-medium transition-all hover:scale-105 mt-4"
              style={buttonStyles}
            >
              {intervention.ctaText}
            </button>
          )}
        </motion.div>
      );
    }

    // Default preview for other interventions
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 max-w-sm mx-auto"
        style={previewStyles}
      >
        <h3 className="text-lg font-bold mb-2">{intervention.headline}</h3>
        <p className="text-sm mb-4 opacity-90">{intervention.body}</p>
        {intervention.discount && (
          <p className="text-xs mb-4 flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            {intervention.discount}% OFF
          </p>
        )}
        {intervention.ctaText && (
          <button
            className="px-6 py-2.5 text-sm font-medium transition-all hover:scale-105"
            style={buttonStyles}
          >
            {intervention.ctaText}
          </button>
        )}
      </motion.div>
    );
  };

  const saveConfiguration = async () => {
    if (!supabase || !organization) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('intervention_configs')
        .upsert({
          tenant_id: organization.id,  // Use organization ID, not user ID
          config: config,
          css: generateCSS(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) throw error;

      console.log('✅ Intervention configuration saved for tenant:', organization.id);
      // Success - configuration saved
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section - Set the tone */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-white">
          Make It Yours
        </h2>
        <p className="text-white/70">
          Your website is sacred. These interventions will honor that.
        </p>
      </motion.div>

      {/* Main Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Intervention Types */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Intervention Types
            </h3>

            <div className="space-y-3">
              {INTERVENTION_TYPES.map(type => {
                const intervention = config.interventions[type.id];
                return (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedIntervention === type.id
                        ? 'bg-white/20 border-cyan-400'
                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                    }`}
                    onClick={() => setSelectedIntervention(type.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{type.icon}</span>
                          <h4 className="font-medium text-white">{type.name}</h4>
                        </div>
                        <p className="text-xs text-white/60 mb-2">{type.description}</p>
                        <p className="text-xs text-cyan-400">Triggers on: {type.emotion}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={intervention.enabled}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateIntervention('enabled', e.target.checked);
                        }}
                        className="mt-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Right: Preview & Configuration */}
        <div className="space-y-6">
          {/* Live Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-400" />
                Live Preview
              </h3>
              <button
                onClick={() => setIsLivePreview(!isLivePreview)}
                className="text-sm text-white/70 hover:text-white flex items-center gap-2"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            <div
              ref={previewRef}
              className="bg-gray-900/50 rounded-lg p-8 min-h-[200px] flex items-center justify-center"
            >
              <AnimatePresence mode="wait">
                <LivePreview key={JSON.stringify(config)} />
              </AnimatePresence>
            </div>

            {/* Save Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={saveConfiguration}
              disabled={saving}
              className="w-full mt-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Configuration'
              )}
            </motion.button>
          </motion.div>

          {/* Visual Identity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              Visual Identity
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="w-12 h-12 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) => setConfig({ ...config, secondaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Font Family
              </label>
              <select
                value={config.fontFamily}
                onChange={(e) => setConfig({ ...config, fontFamily: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
              >
                {fontOptions.map(font => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-white/50 mt-1">
                {fontOptions.find(f => f.value === config.fontFamily)?.preview}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Corner Radius
                </label>
                <select
                  value={config.borderRadius}
                  onChange={(e) => setConfig({ ...config, borderRadius: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="0px">Square</option>
                  <option value="4px">Subtle</option>
                  <option value="8px">Standard</option>
                  <option value="16px">Rounded</option>
                  <option value="999px">Pill</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Shadow
                </label>
                <select
                  value={config.shadowIntensity}
                  onChange={(e) => setConfig({ ...config, shadowIntensity: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="none">None</option>
                  <option value="subtle">Subtle</option>
                  <option value="medium">Medium</option>
                  <option value="heavy">Heavy</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Content Editor for Selected Intervention */}
          <motion.div
            key={selectedIntervention}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-blue-400" />
              Configure: {INTERVENTION_TYPES.find(t => t.id === selectedIntervention)?.name}
            </h3>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Headline
              </label>
              <input
                type="text"
                value={config.interventions[selectedIntervention].headline}
                onChange={(e) => updateIntervention('headline', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Body Text
              </label>
              <textarea
                value={config.interventions[selectedIntervention].body}
                onChange={(e) => updateIntervention('body', e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white h-20 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={config.interventions[selectedIntervention].ctaText}
                  onChange={(e) => updateIntervention('ctaText', e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="Leave empty for no button"
                />
              </div>

              {(selectedIntervention === 'discount_offer' || selectedIntervention === 'exit_rescue') && (
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={config.interventions[selectedIntervention].discount || 0}
                    onChange={(e) => updateIntervention('discount', parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  />
                </div>
              )}
            </div>

            {/* Comparison Table Editor for comparison_table intervention */}
            {selectedIntervention === 'comparison_table' && (
              <div className="space-y-4 border-t border-white/20 pt-4">
                <h4 className="text-sm font-medium text-white">Comparison Table</h4>

                {/* Competitor Names */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-xs text-white/60">Your Business</div>
                  {config.interventions.comparison_table.comparisonData?.competitors.map((comp, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={comp}
                      onChange={(e) => {
                        const newData = { ...config.interventions.comparison_table.comparisonData! };
                        newData.competitors[idx] = e.target.value;
                        updateIntervention('comparisonData', newData);
                      }}
                      className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                      placeholder={`Competitor ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {config.interventions.comparison_table.comparisonData?.features.map((feature, fIdx) => (
                    <div key={fIdx} className="grid grid-cols-5 gap-2 items-center">
                      <input
                        type="text"
                        value={feature.name}
                        onChange={(e) => {
                          const newData = { ...config.interventions.comparison_table.comparisonData! };
                          newData.features[fIdx].name = e.target.value;
                          updateIntervention('comparisonData', newData);
                        }}
                        className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                        placeholder="Feature name"
                      />
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={feature.us}
                          onChange={(e) => {
                            const newData = { ...config.interventions.comparison_table.comparisonData! };
                            newData.features[fIdx].us = e.target.checked;
                            updateIntervention('comparisonData', newData);
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={feature.competitor1}
                          onChange={(e) => {
                            const newData = { ...config.interventions.comparison_table.comparisonData! };
                            newData.features[fIdx].competitor1 = e.target.checked;
                            updateIntervention('comparisonData', newData);
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={feature.competitor2}
                          onChange={(e) => {
                            const newData = { ...config.interventions.comparison_table.comparisonData! };
                            newData.features[fIdx].competitor2 = e.target.checked;
                            updateIntervention('comparisonData', newData);
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                      <div className="flex justify-center">
                        <input
                          type="checkbox"
                          checked={feature.competitor3}
                          onChange={(e) => {
                            const newData = { ...config.interventions.comparison_table.comparisonData! };
                            newData.features[fIdx].competitor3 = e.target.checked;
                            updateIntervention('comparisonData', newData);
                          }}
                          className="w-4 h-4"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Feature Button */}
                <button
                  onClick={() => {
                    const newData = { ...config.interventions.comparison_table.comparisonData! };
                    newData.features.push({
                      name: '',
                      us: true,
                      competitor1: false,
                      competitor2: false,
                      competitor3: false
                    });
                    updateIntervention('comparisonData', newData);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  + Add Feature
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Delay (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={config.interventions[selectedIntervention].timing.delay}
                  onChange={(e) => updateIntervention('timing', {
                    ...config.interventions[selectedIntervention].timing,
                    delay: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Duration (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60000"
                  value={config.interventions[selectedIntervention].timing.duration}
                  onChange={(e) => updateIntervention('timing', {
                    ...config.interventions[selectedIntervention].timing,
                    duration: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="0 = manual dismiss"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Persistence
                </label>
                <select
                  value={config.interventions[selectedIntervention].timing.persistence}
                  onChange={(e) => updateIntervention('timing', {
                    ...config.interventions[selectedIntervention].timing,
                    persistence: e.target.value as any
                  })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="sticky">Sticky</option>
                  <option value="timed">Timed</option>
                  <option value="until-scroll">Until Scroll</option>
                  <option value="until-interaction">Until Interaction</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trust Builder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center text-white/50 text-sm"
      >
        <p>Your interventions will respect your brand.</p>
        <p>Every pixel. Every interaction. Every time.</p>
      </motion.div>
    </div>
  );
};