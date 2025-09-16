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
  Settings,
  Info
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

  // Automotive-specific offers
  cashBackAmount?: string;
  aprOffer?: string;
  testDriveIncentive?: string;
  tradeInBonus?: string;
  leaseSpecial?: string;

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
  template: 'saas' | 'ecommerce' | 'automotive' | 'custom';

  // Custom template fields
  customOffer1Title?: string;
  customOffer1Value?: string;
  customOffer2Title?: string;
  customCTA?: string;
  customUrgency?: string;

  // CRM Integration (no OAuth required)
  crmProvider?: 'none' | 'hubspot' | 'salesforce' | 'webhook';
  crmApiKey?: string;
  crmWebhookUrl?: string;
}

const SystemConfiguration: React.FC = () => {
  const { user } = useUser();
  const [step, setStep] = useState<'brand' | 'offers' | 'channels' | 'crm' | 'interventions' | 'review'>('brand');
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
    // Get tenant ID from localStorage or generate one
    const tid = localStorage.getItem('tenantId') || `tenant_${user?.id || Date.now()}`;
    setTenantId(tid);

    // Load saved config from localStorage (no API needed)
    const savedConfig = localStorage.getItem(`intervention_config_${tid}`);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.log('No saved config yet');
      }
    }

    // Determine tier from user metadata or default
    const savedTier = localStorage.getItem('user_tier') || 'starter';
    setTier(savedTier as any);
  };

  const handlePublish = async () => {
    setIsPublishing(true);

    // Save config to localStorage
    localStorage.setItem(`intervention_config_${tenantId}`, JSON.stringify(config));

    // Generate GTM snippet with actual working code
    const snippet = `<script>
(function() {
  'use strict';

  // Configuration
  window.SentientIQ = {
    tenantId: '${tenantId}',
    apiEndpoint: 'https://api.sentientiq.app',
    config: ${JSON.stringify({
      companyName: config.companyName,
      template: config.template,
      offers: {
        discount: config.discountPercent,
        code: config.discountCode,
        trial: config.freeTrialDays
      }
    }, null, 2)}
  };

  // Load telemetry
  var telemetry = document.createElement('script');
  telemetry.src = 'https://sentientiq.ai/telemetry-v5.js';
  telemetry.setAttribute('data-tenant-id', '${tenantId}');
  document.head.appendChild(telemetry);

  // Load interventions after 2 seconds
  setTimeout(function() {
    var interventions = document.createElement('script');
    interventions.src = 'https://sentientiq.ai/intervention-receiver.js';
    document.head.appendChild(interventions);
  }, 2000);
})();
</script>`;

    setGtmSnippet(snippet);
    setPublishedUrl(`https://sentientiq.ai/preview/${tenantId}`);

    // Simulate publish delay
    setTimeout(() => {
      setIsPublishing(false);
      setStep('review');
    }, 1500);
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
      />

      <div className="px-4 sm:px-6 lg:px-8 py-8">

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-12">
          {['brand', 'offers', 'channels', 'crm', 'interventions', 'review'].map((s, index) => (
            <div key={s} className="flex items-center">
              <motion.div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === s ? 'border-blue-500 bg-blue-500/20' :
                  index < ['brand', 'offers', 'channels', 'interventions', 'review'].indexOf(step)
                    ? 'border-green-500 bg-green-500/20'
                    : 'border-gray-700 bg-gray-900'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {index < ['brand', 'offers', 'channels', 'interventions', 'review'].indexOf(step) ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <span className={step === s ? 'text-blue-400' : 'text-gray-500'}>{index + 1}</span>
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
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Logo</label>
                  <div className="flex items-center space-x-4">
                    {config.logoUrl && (
                      <img src={config.logoUrl} alt="Logo" className="w-16 h-16 rounded-lg object-cover" />
                    )}
                    <label className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
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
                    {['saas', 'ecommerce', 'automotive', 'custom'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setConfig(prev => ({ ...prev, template: t as any }))}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          config.template === t
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="font-medium capitalize">{t}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {t === 'saas' && 'B2B Software'}
                          {t === 'ecommerce' && 'Online Store'}
                          {t === 'automotive' && 'Retail Auto'}
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
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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
                {/* Template-specific offers */}
                {config.template === 'custom' ? (
                  /* Custom template - let them define everything */
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        Primary Offer Title
                      </label>
                      <input
                        type="text"
                        value={config.customOffer1Title || 'Your Main Offer'}
                        onChange={(e) => setConfig(prev => ({ ...prev, customOffer1Title: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., Free Consultation, 50% Off First Month"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Primary Offer Value
                      </label>
                      <input
                        type="text"
                        value={config.customOffer1Value || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, customOffer1Value: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., $500 value, 2 hours free, Save $1,000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Secondary Offer Title
                      </label>
                      <input
                        type="text"
                        value={config.customOffer2Title || 'Your Secondary Offer'}
                        onChange={(e) => setConfig(prev => ({ ...prev, customOffer2Title: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., Money-Back Guarantee, Free Shipping"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        Call-to-Action Text
                      </label>
                      <input
                        type="text"
                        value={config.customCTA || 'Get Started'}
                        onChange={(e) => setConfig(prev => ({ ...prev, customCTA: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., Book Now, Start Free, Get Quote"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Info className="w-4 h-4 inline mr-1" />
                        Urgency Message (Optional)
                      </label>
                      <input
                        type="text"
                        value={config.customUrgency || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, customUrgency: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="e.g., Limited spots available, Offer ends Friday"
                      />
                    </div>
                  </>
                ) : config.template === 'automotive' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Cash Back / Rebate Amount
                      </label>
                      <input
                        type="text"
                        value={config.cashBackAmount || '$1,000'}
                        onChange={(e) => setConfig(prev => ({ ...prev, cashBackAmount: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="$1,000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Tag className="w-4 h-4 inline mr-1" />
                        APR Financing Offer
                      </label>
                      <input
                        type="text"
                        value={config.aprOffer || '0% APR for 60 months'}
                        onChange={(e) => setConfig(prev => ({ ...prev, aprOffer: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="0% APR for 60 months"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Test Drive Incentive
                      </label>
                      <input
                        type="text"
                        value={config.testDriveIncentive || '$50 Gift Card for Test Drive'}
                        onChange={(e) => setConfig(prev => ({ ...prev, testDriveIncentive: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="$50 Gift Card for Test Drive"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        Trade-In Bonus
                      </label>
                      <input
                        type="text"
                        value={config.tradeInBonus || '$2,000 above KBB value'}
                        onChange={(e) => setConfig(prev => ({ ...prev, tradeInBonus: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="$2,000 above KBB value"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Lease Special
                      </label>
                      <input
                        type="text"
                        value={config.leaseSpecial || '$299/month, $0 down'}
                        onChange={(e) => setConfig(prev => ({ ...prev, leaseSpecial: e.target.value }))}
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="$299/month, $0 down"
                      />
                    </div>
                  </>
                ) : (
                  /* Default offers for other templates */
                  <>
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
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none font-mono"
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
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
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
                        className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                        placeholder="3.2x"
                      />
                    </div>
                  </>
                )}
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
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
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
                    {config.template === 'automotive' ? 'Test Drive Scheduler' : 'Support/Calendar URL'}
                  </label>
                  <input
                    type="url"
                    value={config.supportUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, supportUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder={config.template === 'automotive' ? "https://calendly.com/test-drive" : "https://calendly.com/your-team"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <Video className="w-4 h-4 inline mr-1" />
                    {config.template === 'automotive' ? 'Vehicle Walkaround Video' : 'Demo Video URL'}
                  </label>
                  <input
                    type="url"
                    value={config.demoVideoUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, demoVideoUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder={config.template === 'automotive' ? "https://youtube.com/vehicle-tour" : "https://youtube.com/watch?v=..."}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    {config.template === 'automotive' ? 'Customer Reviews/Testimonials' : 'Case Study URL'}
                  </label>
                  <input
                    type="url"
                    value={config.caseStudyUrl}
                    onChange={(e) => setConfig(prev => ({ ...prev, caseStudyUrl: e.target.value }))}
                    className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder={config.template === 'automotive' ? "https://dealership.com/reviews" : "https://yoursite.com/case-studies"}
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
                  onClick={() => setStep('crm')}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Next: Choose Interventions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* CRM Connection - The WHO */}
          {step === 'crm' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Connect Your CRM (Optional)</h2>
              <p className="text-gray-400 mb-8">
                Link emotional insights to real customers. No OAuth required.
              </p>

              <div className="space-y-6">
                {/* CRM Provider Selection */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'none', name: 'Skip for Now', desc: 'Anonymous tracking only' },
                    { id: 'hubspot', name: 'HubSpot', desc: 'Private App API Key' },
                    { id: 'salesforce', name: 'Salesforce', desc: 'Connected App JWT' },
                    { id: 'webhook', name: 'Webhook/Zapier', desc: 'Any CRM via webhooks' }
                  ].map((crm) => (
                    <button
                      key={crm.id}
                      onClick={() => setConfig(prev => ({ ...prev, crmProvider: crm.id as any }))}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        config.crmProvider === crm.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="font-medium">{crm.name}</div>
                      <div className="text-xs text-gray-400 mt-1">{crm.desc}</div>
                    </button>
                  ))}
                </div>

                {/* API Key Input */}
                {(config.crmProvider === 'hubspot' || config.crmProvider === 'salesforce') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {config.crmProvider === 'hubspot' ? 'HubSpot Private App Key' : 'Salesforce Connected App Key'}
                    </label>
                    <input
                      type="password"
                      value={config.crmApiKey || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, crmApiKey: e.target.value }))}
                      className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg focus:border-blue-500 focus:outline-none"
                      placeholder={config.crmProvider === 'hubspot'
                        ? 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                        : 'Your Salesforce JWT or API Key'
                      }
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      {config.crmProvider === 'hubspot'
                        ? 'Create at: HubSpot → Settings → Integrations → Private Apps'
                        : 'Get from your Salesforce Connected App settings'
                      }
                    </p>
                  </div>
                )}

                {/* Webhook URL for Zapier/Make */}
                {config.crmProvider === 'webhook' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Webhook URL</label>
                    <div className="p-4 bg-black/50 border border-gray-700 rounded-lg">
                      <code className="text-green-400 text-sm break-all">
                        https://api.sentientiq.app/webhooks/crm/{tenantId}
                      </code>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Add this URL to Zapier/Make to send customer data from any CRM
                    </p>
                  </div>
                )}

                {/* What Gets Synced */}
                {config.crmProvider !== 'none' && (
                  <div className="p-4 bg-gradient-to-r from-blue-900/20 to-blue-900/20 rounded-lg border border-blue-500/30">
                    <h3 className="font-medium mb-3">What Gets Synced:</h3>
                    <ul className="space-y-2 text-sm text-gray-300">
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-400 mr-2" />
                        Emotional state → Contact custom fields
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-400 mr-2" />
                        Confusion events → Support tickets
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-400 mr-2" />
                        High intent → Deal score increase
                      </li>
                      <li className="flex items-center">
                        <Check className="w-4 h-4 text-green-400 mr-2" />
                        Exit intent → At-risk flag
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => setStep('channels')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('interventions')}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Next: Configure Interventions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Interventions Toggle - Updated with Real Intervention Types */}
          {step === 'interventions' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-6">Choose Your Interventions</h2>
              <p className="text-gray-400 mb-8">These interventions will trigger based on visitor emotions</p>

              <div className="grid gap-4">
                {/* Sticker Shock Interventions */}
                <div className="p-4 bg-gradient-to-r from-red-900/20 to-orange-900/20 rounded-lg border border-red-500/30">
                  <h3 className="font-medium text-red-400 mb-3">💸 Sticker Shock Response</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">ROI Calculator</div>
                        <div className="text-xs text-gray-400">Shows value when price causes hesitation</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enablePriceHoverAssist}
                        onChange={(e) => setConfig(prev => ({ ...prev, enablePriceHoverAssist: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Payment Plans</div>
                        <div className="text-xs text-gray-400">Offer installments on high-velocity recoil</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Exit Intent Interventions */}
                <div className="p-4 bg-gradient-to-r from-yellow-900/20 to-amber-900/20 rounded-lg border border-yellow-500/30">
                  <h3 className="font-medium text-yellow-400 mb-3">🚪 Exit Intent Saves</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Discount Modal</div>
                        <div className="text-xs text-gray-400">Last-chance offer before they leave</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enableExitSave}
                        onChange={(e) => setConfig(prev => ({ ...prev, enableExitSave: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Free Trial Offer</div>
                        <div className="text-xs text-gray-400">Remove risk for hesitant visitors</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Confusion Interventions */}
                <div className="p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-lg border border-blue-500/30">
                  <h3 className="font-medium text-blue-400 mb-3">😕 Confusion Helpers</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Live Chat Prompt</div>
                        <div className="text-xs text-gray-400">Offer help during erratic behavior</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.enableConfusionHelp}
                        onChange={(e) => setConfig(prev => ({ ...prev, enableConfusionHelp: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Comparison Chart</div>
                        <div className="text-xs text-gray-400">Show value props for comparison shoppers</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Rage Click Response */}
                <div className="p-4 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 rounded-lg border border-blue-500/30">
                  <h3 className="font-medium text-blue-400 mb-3">😤 Rage Click Response</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Success Stories</div>
                        <div className="text-xs text-gray-400">Social proof when frustration detected</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-black/40 cursor-pointer">
                      <div>
                        <div className="font-medium">Guarantee Badge</div>
                        <div className="text-xs text-gray-400">Build trust during high stress</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Tier Features */}
              <div className="mt-8 p-4 bg-gradient-to-r from-blue-900/20 to-blue-900/20 rounded-lg border border-blue-500/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Your {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan Includes:</h3>
                  <Shield className="w-5 h-5 text-blue-400" />
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
                  onClick={() => setStep('crm')}
                  className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-600 rounded-lg hover:from-blue-700 hover:to-blue-700 transition-all flex items-center disabled:opacity-50"
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
                    <li>✓ Open Google Tag Manager</li>
                    <li>✓ Create new tag → Custom HTML</li>
                    <li>✓ Paste the code above (WITH the &lt;script&gt; tags!)</li>
                    <li>✓ Set trigger to "All Pages" or "DOM Ready"</li>
                    <li>✓ Save and PUBLISH (not just save)</li>
                  </ol>
                  <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400">
                      ⚠️ Remember: Must include &lt;script&gt; tags or GTM won't execute the code!
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">3. Test Your Installation</h3>
                  <div className="flex items-center space-x-4">
                    <a
                      href={`https://preview.sentientiq.ai/${tenantId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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
          <a href="/docs/interventions" className="text-blue-400 hover:text-blue-300">
            implementation guide
          </a>
          , ask Sage{' '}
          or{' '}
          <a href="mailto:support@sentientiq.ai" className="text-blue-400 hover:text-blue-300">
            contact support
          </a>
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;