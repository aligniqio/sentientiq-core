import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  Palette,
  Tag,
  Sparkles,
  Copy,
  Check,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp,
  DollarSign,
  Calendar,
  Globe,
  Video,
  FileText,
  Settings
} from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useUser } from '@clerk/clerk-react';

interface ConfigState {
  // Branding
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;

  // Offers
  discountPercent: number;
  discountCode: string;
  freeTrialDays: number;
  roiMultiplier: string;

  // Channels
  supportUrl: string;
  calendarUrl: string;
  demoVideoUrl: string;
  caseStudyUrl: string;

  // Interventions
  enablePriceHoverAssist: boolean;
  enableExitSave: boolean;
  enableConfusionHelp: boolean;

  // Template
  template: 'saas' | 'ecommerce' | 'marketplace' | 'custom';
}

const SystemConfiguration: React.FC = () => {
  const { user } = useUser();
  const [step, setStep] = useState<'brand' | 'offers' | 'channels' | 'interventions' | 'review'>('brand');
  const [config, setConfig] = useState<ConfigState>({
    companyName: '',
    logoUrl: '',
    primaryColor: '#7f5af0',
    accentColor: '#22c55e',
    discountPercent: 20,
    discountCode: 'SAVE20',
    freeTrialDays: 14,
    roiMultiplier: '3.2x',
    supportUrl: 'https://calendly.com/demo',
    calendarUrl: '',
    demoVideoUrl: '',
    caseStudyUrl: '',
    enablePriceHoverAssist: true,
    enableExitSave: true,
    enableConfusionHelp: false,
    template: 'saas'
  });

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [gtmSnippet, setGtmSnippet] = useState('');
  const [copied, setCopied] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [tier, setTier] = useState<'starter' | 'growth' | 'scale' | 'enterprise'>('starter');

  useEffect(() => {
    // Load existing config if available
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Get tenant ID from user context (would come from Clerk in production)
      const tid = localStorage.getItem('tenantId') || 'demo_tenant';
      setTenantId(tid);

      const response = await fetch(`/api/interventions/config/${tid}`);
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          // Map API response to our state
          setConfig(prev => ({
            ...prev,
            companyName: data.config.branding?.companyName || prev.companyName,
            primaryColor: data.config.branding?.primaryColor || prev.primaryColor,
            accentColor: data.config.branding?.accentColor || prev.accentColor,
            // ... map other fields
          }));
          setTier(data.config.tier || 'starter');
        }
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Save configuration
      await fetch(`/api/interventions/config/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branding: {
            companyName: config.companyName,
            logoUrl: config.logoUrl,
            primaryColor: config.primaryColor,
            accentColor: config.accentColor
          },
          offers: {
            discountPercent: config.discountPercent,
            discountCode: config.discountCode,
            freeTrialDays: config.freeTrialDays,
            roiMultiplier: config.roiMultiplier
          },
          channels: {
            supportUrl: config.supportUrl,
            calendarUrl: config.calendarUrl,
            demoVideoUrl: config.demoVideoUrl,
            caseStudyUrl: config.caseStudyUrl
          },
          interventions: [
            { id: 'price_hover_assist', enabled: config.enablePriceHoverAssist },
            { id: 'exit_save', enabled: config.enableExitSave },
            { id: 'confusion_help', enabled: config.enableConfusionHelp }
          ],
          template: config.template
        })
      });

      // Publish to CDN
      const publishResponse = await fetch(`/api/interventions/config/${tenantId}/publish`, {
        method: 'POST'
      });

      if (publishResponse.ok) {
        const data = await publishResponse.json();
        setPublishedUrl(data.cdnUrl);
        setGtmSnippet(data.gtmSnippet);
        setStep('review');
      }
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(gtmSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In production, upload to S3/Cloudinary
      // For now, create a local URL
      const url = URL.createObjectURL(file);
      setConfig(prev => ({ ...prev, logoUrl: url }));
    }
  };

  const getTierFeatures = () => {
    const features = {
      starter: ['UI Interventions', 'Basic Analytics', 'GTM Ready'],
      growth: ['Everything in Starter', 'Email Interventions', 'A/B Testing', 'Advanced Analytics'],
      scale: ['Everything in Growth', 'Slack Integration', 'CRM Sync', 'Custom Webhooks', 'API Access'],
      enterprise: ['Everything in Scale', 'Executive Alerts', 'Dedicated Slack', 'Custom Integrations', 'White Glove Service']
    };
    return features[tier] || features.starter;
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Intervention Configuration"
        subtitle="Set up your behavioral interventions in minutes"
        icon={<Zap className="w-8 h-8" />}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {['brand', 'offers', 'channels', 'interventions', 'review'].map((s, index) => (
            <div key={s} className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === s ? 'border-purple-500 bg-purple-500/20' :
                  index < ['brand', 'offers', 'channels', 'interventions', 'review'].indexOf(step)
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-gray-700 bg-gray-900'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {index < ['brand', 'offers', 'channels', 'interventions', 'review'].indexOf(step) ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <span className={step === s ? 'text-purple-400' : 'text-gray-500'}>{index + 1}</span>
                )}
              </motion.div>
              {index < 4 && (
                <div className={`w-24 h-0.5 ${
                  index < ['brand', 'offers', 'channels', 'interventions', 'review'].indexOf(step)
                    ? 'bg-green-500/50'
                    : 'bg-gray-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800">
          {/* Brand Setup */}
          {step === 'brand' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Brand Your Interventions</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Company Name</label>
                  <input
                    type="text"
                    value={config.companyName}
                    onChange={(e) => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Logo</label>
                  <div className="flex items-center space-x-4">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <label className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 inline mr-2" />
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Primary Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-20 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.primaryColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Accent Color</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="w-20 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={config.accentColor}
                        onChange={(e) => setConfig(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="flex-1 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Template</label>
                  <div className="grid grid-cols-2 gap-4">
                    {['saas', 'ecommerce', 'marketplace', 'custom'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setConfig(prev => ({ ...prev, template: t as any }))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          config.template === t
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium capitalize">{t}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {t === 'saas' && 'B2B Software'}
                          {t === 'ecommerce' && 'Online Store'}
                          {t === 'marketplace' && 'Multi-vendor'}
                          {t === 'custom' && 'Build your own'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => setStep('offers')}
                  className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                >
                  Next: Configure Offers
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Offers Setup */}
          {step === 'offers' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Configure Your Offers</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Discount Percentage
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={config.discountPercent}
                      onChange={(e) => setConfig(prev => ({ ...prev, discountPercent: parseInt(e.target.value) }))}
                      className="flex-1"
                    />
                    <div className="w-20 text-center px-3 py-2 bg-black/50 border border-gray-700 rounded-lg">
                      {config.discountPercent}%
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Discount Code
                  </label>
                  <input
                    type="text"
                    value={config.discountCode}
                    onChange={(e) => setConfig(prev => ({ ...prev, discountCode: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none font-mono"
                    placeholder="SAVE20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Free Trial Days
                  </label>
                  <input
                    type="number"
                    value={config.freeTrialDays}
                    onChange={(e) => setConfig(prev => ({ ...prev, freeTrialDays: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <TrendingUp className="w-4 h-4 inline mr-1" />
                    ROI Multiplier
                  </label>
                  <input
                    type="text"
                    value={config.roiMultiplier}
                    onChange={(e) => setConfig(prev => ({ ...prev, roiMultiplier: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="3.2x"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('brand')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('channels')}
                  className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                >
                  Next: Set Channels
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Channels Setup */}
          {step === 'channels' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Connect Your Channels</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Support/Calendar URL
                  </label>
                  <input
                    type="url"
                    value={config.supportUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, supportUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="https://calendly.com/your-team"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Video className="w-4 h-4 inline mr-1" />
                    Demo Video URL
                  </label>
                  <input
                    type="url"
                    value={config.demoVideoUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, demoVideoUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Case Study URL
                  </label>
                  <input
                    type="url"
                    value={config.caseStudyUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, caseStudyUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                    placeholder="https://yoursite.com/case-studies"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('offers')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('interventions')}
                  className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                >
                  Next: Choose Interventions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Interventions Toggle */}
          {step === 'interventions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Enable Interventions</h2>

              <div className="space-y-4">
                <div className="p-4 bg-black/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Price Hover Assistance</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Help visitors when they hover on pricing
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enablePriceHoverAssist}
                        onChange={(e) => setConfig(prev => ({ ...prev, enablePriceHoverAssist: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-black/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Exit Intent Save</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Offer discount when visitor is leaving
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enableExitSave}
                        onChange={(e) => setConfig(prev => ({ ...prev, enableExitSave: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-black/30 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Confusion Helper</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Assist when users seem confused
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.enableConfusionHelp}
                        onChange={(e) => setConfig(prev => ({ ...prev, enableConfusionHelp: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tier Features */}
              <div className="mt-8 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Your {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Includes:</h3>
                  <Shield className="w-5 h-5 text-purple-400" />
                </div>
                <div className="space-y-2">
                  {getTierFeatures().map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-300">
                      <Check className="w-4 h-4 text-green-400 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('channels')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Publish & Get GTM Code
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Review & GTM Code */}
          {step === 'review' && gtmSnippet && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <Check className="w-8 h-8 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Configuration Published!</h2>
                <p className="text-gray-400">Your interventions are ready to deploy</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">1. Copy Your GTM Code</h3>
                  <div className="relative">
                    <pre className="p-4 bg-black/50 border border-gray-700 rounded-lg overflow-x-auto text-sm">
                      <code className="text-green-400">{gtmSnippet}</code>
                    </pre>
                    <button
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">2. Add to Google Tag Manager</h3>
                  <ol className="space-y-2 text-sm text-gray-400">
                    <li>• Open Google Tag Manager</li>
                    <li>• Create new tag → Custom HTML</li>
                    <li>• Paste the code above</li>
                    <li>• Set trigger to "All Pages"</li>
                    <li>• Save and publish</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-medium mb-3">3. Test Your Installation</h3>
                  <div className="flex items-center space-x-4">
                    <a
                      href={`https://preview.sentientiq.ai/${tenantId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Open Preview
                    </a>
                    <span className="text-sm text-gray-400">
                      Add ?sq_debug=true to your site URL to see debug logs
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setStep('brand')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Make Changes
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Need help? Check out our{' '}
          <a href="/docs/interventions" className="text-purple-400 hover:text-purple-300">
            implementation guide
          </a>
          {' '}or{' '}
          <a href="mailto:support@sentientiq.ai" className="text-purple-400 hover:text-purple-300">
            contact support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;