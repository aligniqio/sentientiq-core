import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, CheckCircle, Copy, Zap, Shield, BarChart3, Clock, Key, RefreshCw, HelpCircle, X } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useUser } from '@clerk/clerk-react';
import { useSageHint } from '../../hooks/useTenant';

export default function SystemImplementation() {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState<Array<{id: string, name: string, key: string, created: string}>>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatingKey, setGeneratingKey] = useState(false);

  // Sage hint management
  const { shouldShow, trackShown, trackDismissed, dismissPermanently } = useSageHint('/system/implementation');
  const [hintShown, setHintShown] = useState(false);

  // Track when hint is shown
  useEffect(() => {
    if (shouldShow && !hintShown) {
      trackShown();
      setHintShown(true);
    }
  }, [shouldShow, hintShown, trackShown]);

  // Load existing API keys
  useEffect(() => {
    const storedKeys = localStorage.getItem(`sentientiq_keys_${user?.id}`);
    if (storedKeys) {
      setApiKeys(JSON.parse(storedKeys));
    }
  }, [user]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateApiKey = () => {
    if (!newKeyName.trim()) return;

    setGeneratingKey(true);

    // Generate a production-like API key
    const prefix = 'sq_live_';
    const randomString = Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const newKey = {
      id: Date.now().toString(),
      name: newKeyName,
      key: `${prefix}${randomString}`,
      created: new Date().toISOString()
    };

    const updatedKeys = [...apiKeys, newKey];
    setApiKeys(updatedKeys);
    localStorage.setItem(`sentientiq_keys_${user?.id}`, JSON.stringify(updatedKeys));
    setNewKeyName('');
    setGeneratingKey(false);
  };

  const deleteApiKey = (id: string) => {
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem(`sentientiq_keys_${user?.id}`, JSON.stringify(updatedKeys));
  };

  // Use first API key or user ID as fallback
  const primaryApiKey = apiKeys[0]?.key || `sq_demo_${user?.id}` || 'sq_demo_YOUR_API_KEY';

  return (
    <>
      <PageHeader
        title="GTM Implementation"
        subtitle="Install SentientIQ via Google Tag Manager in minutes"
      />

      {/* Sage Helper Hint - Only shows for new users */}
      <AnimatePresence>
        {shouldShow && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-24 right-6 max-w-xs glass-card p-4 bg-purple-900/20 border-purple-500/30 z-40 transition-all"
          >
            {/* Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                trackDismissed();
              }}
              className="absolute top-2 right-2 p-1 hover:bg-white/10 rounded-full transition-colors"
              aria-label="Dismiss hint"
            >
              <X className="w-4 h-4 text-white/40 hover:text-white/60" />
            </button>

            <div
              className="cursor-pointer"
              onClick={() => {
                // Find and click the Sage crystal ball
                const sageBall = document.querySelector('[data-sage-crystal-ball]');
                if (sageBall) {
                  (sageBall as HTMLElement).click();
                  trackDismissed(); // Hide after opening Sage
                }
              }}
            >
              <div className="flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="text-sm text-white/80 mb-2">
                    Need help? <strong>Sage</strong> is watching this page and can help with:
                  </p>
                  <ul className="text-xs text-white/60 space-y-1">
                    <li>• "What is Google Tag Manager?"</li>
                    <li>• "Where do I find the template gallery?"</li>
                    <li>• "Which trigger should I use?"</li>
                    <li>• "How do I test if it's working?"</li>
                  </ul>
                  <p className="text-xs text-purple-400 mt-3">
                    Click here or the purple orb → bottom right
                  </p>
                </div>
              </div>
            </div>

            {/* Don't show again option */}
            <button
              onClick={() => dismissPermanently()}
              className="mt-3 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Don't show hints anymore
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 mb-8 bg-gradient-to-br from-purple-900/10 to-blue-900/10 border-purple-500/20"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Google Tag Manager Template
            </h2>
            <p className="text-white/70 mb-4 max-w-2xl">
              SentientIQ is now available in Google's Community Template Gallery.
              Deploy behavioral analytics to any website without touching code.
            </p>
            <div className="flex gap-4">
              <a
                href="https://tagmanager.google.com/gallery/#/owners/sentientiq/templates/sentientiq-detect"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open in GTM Gallery
              </a>
              <button
                onClick={() => handleCopy(primaryApiKey)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Primary Key'}
              </button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-white/50 mb-1">Version</div>
            <div className="text-2xl font-bold text-purple-400">v2.0.0</div>
          </div>
        </div>
      </motion.div>

      {/* API Key Management */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" />
            API Keys
          </h3>
          <span className="text-sm text-white/50">
            {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''} active
          </span>
        </div>

        {/* Key Generator */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter key name (e.g., Production, Staging)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateApiKey()}
              className="flex-1 px-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
            />
            <button
              onClick={generateApiKey}
              disabled={!newKeyName.trim() || generatingKey}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {generatingKey ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              Generate Key
            </button>
          </div>
        </div>

        {/* Existing Keys */}
        {apiKeys.length > 0 ? (
          <div className="space-y-3">
            {apiKeys.map((key, index) => (
              <div key={key.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-white font-medium">{key.name}</span>
                    {index === 0 && (
                      <span className="ml-2 text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">Primary</span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <code className="text-purple-400 text-sm font-mono">{key.key}</code>
                  <button
                    onClick={() => handleCopy(key.key)}
                    className="ml-4 p-2 hover:bg-white/10 rounded transition-colors"
                  >
                    <Copy className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Created: {new Date(key.created).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-black/30 rounded-lg p-6 border border-white/10 text-center">
            <Key className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60 mb-2">No API keys yet</p>
            <p className="text-sm text-white/40">Generate your first key above to get started</p>
          </div>
        )}

        {apiKeys.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400">
              💡 For testing, you can use the demo key: <code className="text-yellow-300">sq_demo_{user?.id || 'test'}</code>
            </p>
          </div>
        )}
      </motion.div>

      {/* Installation Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-8 mb-8"
      >
        <h3 className="text-xl font-bold text-white mb-6">Installation Steps</h3>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Open Google Tag Manager</h4>
              <p className="text-white/60 mb-3">
                Go to your GTM container and navigate to Templates → Tag Templates
              </p>
              <a
                href="https://tagmanager.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
              >
                Open GTM <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Search Gallery</h4>
              <p className="text-white/60 mb-3">
                Click "Search Gallery" and search for "SentientIQ Detect"
              </p>
              <div className="bg-black/30 rounded-lg p-3 border border-white/10">
                <code className="text-green-400 text-sm">Template Name: SentientIQ Detect - Behavioral Analytics</code>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Add to Workspace</h4>
              <p className="text-white/60 mb-3">
                Click "Add to Workspace" and confirm the template import
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
              4
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Create New Tag</h4>
              <p className="text-white/60 mb-3">
                Go to Tags → New → Choose "SentientIQ Detect" from Custom templates
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
              5
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Configure Tag</h4>
              <p className="text-white/60 mb-3">
                Enter your API key and select your trigger (typically "All Pages")
              </p>
              <div className="bg-black/30 rounded-lg p-4 border border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-sm">API Key:</span>
                  <code className="text-purple-400 text-sm">{primaryApiKey}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-sm">Trigger:</span>
                  <code className="text-green-400 text-sm">All Pages</code>
                </div>
              </div>
            </div>
          </div>

          {/* Step 6 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">
              ✓
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-white mb-2">Publish</h4>
              <p className="text-white/60 mb-3">
                Save your tag, submit changes, and publish to start tracking emotions
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <Shield className="w-8 h-8 text-purple-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Privacy First</h3>
          <p className="text-white/60 text-sm">
            No cookies, no PII collection. GDPR & CCPA compliant by design.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <Zap className="w-8 h-8 text-yellow-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Real-Time Detection</h3>
          <p className="text-white/60 text-sm">
            Detect 15+ emotions instantly with behavioral physics engine.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <BarChart3 className="w-8 h-8 text-green-400 mb-4" />
          <h3 className="font-semibold text-white mb-2">Proven ROI</h3>
          <p className="text-white/60 text-sm">
            38% reduction in cart abandonment. 24% increase in conversions.
          </p>
        </motion.div>
      </div>

      {/* Alternative Installation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6 border-yellow-500/20"
      >
        <div className="flex items-start gap-4">
          <Clock className="w-5 h-5 text-yellow-400 mt-1" />
          <div>
            <h3 className="font-semibold text-white mb-2">Manual Installation (Without Template)</h3>
            <p className="text-white/60 text-sm mb-3">
              If you can't use the template gallery, create a Custom HTML tag with:
            </p>
            <div className="bg-black/50 rounded-lg p-4 font-mono text-xs border border-yellow-500/20">
              <code className="text-yellow-400">
                {'<script>'}<br/>
                {'  (function() {'}<br/>
                {'    var s = document.createElement("script");'}<br/>
                {'    s.src = "https://cdn.sentientiq.ai/v2/detect.js";'}<br/>
                {'    s.setAttribute("data-api-key", "'}{primaryApiKey}{'");'}<br/>
                {'    document.body.appendChild(s);'}<br/>
                {'  })();'}<br/>
                {'</script>'}
              </code>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Support Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="text-center mt-12 mb-8"
      >
        <p className="text-white/60 mb-4">
          Need help? Check our documentation or contact support.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="https://docs.sentientiq.ai/gtm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300"
          >
            Documentation →
          </a>
          <a
            href="mailto:api@sentientiq.app"
            className="text-purple-400 hover:text-purple-300"
          >
            Email Support →
          </a>
        </div>
      </motion.div>
    </>
  );
}