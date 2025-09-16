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
  Code,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertCircle
} from 'lucide-react';
import { useUser } from '@clerk/clerk-react';
import { getSupabaseClient } from '@/lib/supabase';

interface InterventionConfig {
  // Branding
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: string;
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'heavy';

  // Content
  headline: string;
  subtext: string;
  ctaText: string;
  urgencyText: string;

  // Behavior
  timing: number; // seconds
  position: 'top' | 'bottom' | 'center' | 'bottom-right' | 'bottom-left';
  animation: 'fade' | 'slide' | 'bounce' | 'scale';
  persistence: 'until-dismiss' | 'timed' | 'until-scroll';
}

export const InterventionConfigurator: React.FC = () => {
  const { user } = useUser();
  const [config, setConfig] = useState<InterventionConfig>({
    primaryColor: '#0066ff',
    secondaryColor: '#ffffff',
    fontFamily: 'inherit',
    borderRadius: '8px',
    shadowIntensity: 'medium',
    headline: 'Wait! Special offer for you',
    subtext: 'Get 15% off your first order',
    ctaText: 'Claim Discount',
    urgencyText: 'Offer expires in 24 hours',
    timing: 3,
    position: 'bottom-right',
    animation: 'slide',
    persistence: 'until-dismiss'
  });

  const [isLivePreview, setIsLivePreview] = useState(false);
  const [copiedCSS, setCopiedCSS] = useState(false);
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

  // Live preview component
  const LivePreview = () => {
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

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 max-w-sm mx-auto"
        style={previewStyles}
      >
        <h3 className="text-lg font-bold mb-2">{config.headline}</h3>
        <p className="text-sm mb-4 opacity-90">{config.subtext}</p>
        {config.urgencyText && (
          <p className="text-xs mb-4 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            {config.urgencyText}
          </p>
        )}
        <button
          className="px-6 py-2.5 text-sm font-medium transition-all hover:scale-105"
          style={buttonStyles}
        >
          {config.ctaText}
        </button>
      </motion.div>
    );
  };

  const saveConfiguration = async () => {
    if (!supabase || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('intervention_config')
        .upsert({
          tenant_id: user.id,
          config: config,
          css: generateCSS(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'tenant_id'
        });

      if (error) throw error;

      // Flash success
      setCopiedCSS(true);
      setTimeout(() => setCopiedCSS(false), 2000);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyCSS = async () => {
    await navigator.clipboard.writeText(generateCSS());
    setCopiedCSS(true);
    setTimeout(() => setCopiedCSS(false), 2000);
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
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
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

          {/* Content Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-blue-400" />
              Your Message
            </h3>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Headline
              </label>
              <input
                type="text"
                value={config.headline}
                onChange={(e) => setConfig({ ...config, headline: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                placeholder="Grab their attention..."
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                Supporting Text
              </label>
              <input
                type="text"
                value={config.subtext}
                onChange={(e) => setConfig({ ...config, subtext: e.target.value })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                placeholder="Make it compelling..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={config.ctaText}
                  onChange={(e) => setConfig({ ...config, ctaText: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Urgency (Optional)
                </label>
                <input
                  type="text"
                  value={config.urgencyText}
                  onChange={(e) => setConfig({ ...config, urgencyText: e.target.value })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                  placeholder="Limited time..."
                />
              </div>
            </div>
          </motion.div>

          {/* Behavior Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6 space-y-4"
          >
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              Behavior
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Show After (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={config.timing}
                  onChange={(e) => setConfig({ ...config, timing: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Position
                </label>
                <select
                  value={config.position}
                  onChange={(e) => setConfig({ ...config, position: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top">Top Bar</option>
                  <option value="bottom">Bottom Bar</option>
                  <option value="center">Center Modal</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Animation
                </label>
                <select
                  value={config.animation}
                  onChange={(e) => setConfig({ ...config, animation: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="fade">Fade In</option>
                  <option value="slide">Slide In</option>
                  <option value="bounce">Bounce</option>
                  <option value="scale">Scale Up</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Persistence
                </label>
                <select
                  value={config.persistence}
                  onChange={(e) => setConfig({ ...config, persistence: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded text-white"
                >
                  <option value="until-dismiss">Until Dismissed</option>
                  <option value="timed">Auto-hide (10s)</option>
                  <option value="until-scroll">Until Scroll</option>
                </select>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Preview & Export */}
        <div className="space-y-6">
          {/* Live Preview */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6 sticky top-6"
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

            {/* CSS Output */}
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-white/70">
                  Generated CSS
                </h4>
                <button
                  onClick={copyCSS}
                  className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  {copiedCSS ? (
                    <>
                      <Check className="w-3 h-3" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy CSS
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-black/50 border border-white/10 rounded p-4 text-xs text-white/70 overflow-x-auto">
                <code>{generateCSS()}</code>
              </pre>
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