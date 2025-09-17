import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Copy, Check, Code, Settings, Zap, MessageCircle, Send } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useUser, useOrganization } from '@clerk/clerk-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function SystemImplementation() {
  const { user } = useUser();
  const { organization } = useOrganization();
  const [debugMode, setDebugMode] = useState(true);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpSent, setHelpSent] = useState(false);
  const supabase = getSupabaseClient();

  // Use organization ID as tenant ID
  const tenantId = organization?.id || '';

  const copyToClipboard = async (text: string, scriptName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptName);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateSentientIQScript = () => {
    const id = tenantId || '{{TENANT_ID}}';

    return `<script>
  (function() {
    'use strict';

    // SentientIQ Configuration
    window.SENTIENTIQ_TENANT_ID = '${id}';
    window.SENTIENTIQ_DEBUG = ${debugMode};
    window.SENTIENTIQ_ENABLE_INTERVENTIONS = true;

    // Store tenant ID for persistence
    localStorage.setItem('tenantId', '${id}');

    // Load SentientIQ Bundle (telemetry + interventions)
    var script = document.createElement('script');
    script.src = 'https://sentientiq.ai/sentientiq-v5.js';
    script.async = true;
    document.head.appendChild(script);
  })();
</script>`;
  };

  const sentientIQScript = generateSentientIQScript();

  const sendHelpRequest = async () => {
    if (!supabase || !helpMessage.trim()) return;

    try {
      // Capture context for Sage
      const context = {
        page: 'implementation',
        step: copiedScript || 'viewing_instructions',
        tenant_id: tenantId,
        user_email: user?.primaryEmailAddress?.emailAddress,
        organization_name: organization?.name,
        debug_mode: debugMode,
        scripts_copied: {
          telemetry: copiedScript === 'telemetry',
          intervention: copiedScript === 'intervention'
        },
        timestamp: new Date().toISOString()
      };

      await supabase
        .from('sage_support')
        .insert({
          user_id: user?.id,
          organization_id: organization?.id,
          message: helpMessage,
          context: context,
          source: 'gtm_implementation',
          priority: helpMessage.toLowerCase().includes('urgent') || helpMessage.toLowerCase().includes('broken')
            ? 'high'
            : 'normal'
        });

      setHelpSent(true);
      setTimeout(() => {
        setShowHelp(false);
        setHelpMessage('');
        setHelpSent(false);
      }, 3000);
    } catch (error) {
      console.error('Error sending help request:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="GTM Implementation Guide"
        subtitle="Follow these steps to integrate SentientIQ into your website using Google Tag Manager"
      />

      <div className="pb-20">
        {/* Configuration Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-400" />
            Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tenant ID
              </label>
              <div className="px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg">
                <code className="text-green-400">{tenantId || 'Loading organization ID...'}</code>
              </div>
              {tenantId && (
                <p className="text-sm text-green-400 mt-2">
                  ✓ Using your organization ID as Tenant ID
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="debugMode"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="debugMode" className="text-gray-300">
                Enable Debug Mode (recommended during setup)
              </label>
            </div>
          </div>
        </motion.div>

        {/* ONE SCRIPT TO RULE THEM ALL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-purple-500/30"
        >
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Zap className="w-8 h-8 text-purple-400" />
            ONE Script. That's It. You're Done.
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">GTM Configuration:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-blue-400" />
                  <span>Tag Type: Custom HTML</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-blue-400" />
                  <span>Tag Name: SentientIQ Bundle (Everything)</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-blue-400" />
                  <span>Trigger: All Pages</span>
                </li>
              </ul>
            </div>

            {
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Script to Copy:</h3>
                  <button
                    onClick={() => copyToClipboard(sentientIQScript, 'sentientiq')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {copiedScript === 'sentientiq' ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Script
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm text-gray-300">
                  <code>{sentientIQScript}</code>
                </pre>
              </div>
            }
          </div>
        </motion.div>

        {/* What You Get */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-green-500/30"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Check className="w-6 h-6 text-green-400" />
            What This ONE Script Does
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-green-400 mb-3">✅ Real-Time Tracking</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-green-400" />
                  <span>Every click, hover, and scroll</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-green-400" />
                  <span>Text selection detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-green-400" />
                  <span>Rage click detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-green-400" />
                  <span>Exit intent tracking</span>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-purple-400 mb-3">🎯 Automatic Interventions</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-purple-400" />
                  <span>Sticker shock → Price reassurance</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-purple-400" />
                  <span>Hesitation → Urgency messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-purple-400" />
                  <span>Comparison → Competitive advantage</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-purple-400" />
                  <span>Frustration → Help offers</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl border border-purple-500/20">
            <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-3">
              🚀 That's It. Seriously.
            </h3>
            <p className="text-gray-300">
              Copy the script below. Paste it in GTM or directly on your site. Watch real-time emotions flow in.
              No complex setup. No multiple scripts. No waiting for initialization. Just instant behavioral intelligence.
            </p>
          </div>
        </motion.div>

        {/* Final Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30 relative z-10"
        >
          <h2 className="text-2xl font-semibold mb-4">Final Steps</h2>
          <ol className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Copy both scripts above (after entering your Tenant ID)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Add them as Custom HTML tags in your GTM container</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>Configure the triggers as specified for each tag</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Preview and test your container</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <span>Publish your container when ready</span>
            </li>
          </ol>
        </motion.div>

        {/* Support Section with Sage Integration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          {!showHelp ? (
            <div className="text-center">
              <p className="text-gray-400 mb-4">
                Stuck with GTM? Our AI assistant Sage knows exactly where you are.
              </p>
              <button
                onClick={() => setShowHelp(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5" />
                Get Help from Sage
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700"
              >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-purple-400" />
                  Ask Sage for Help
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Sage knows you're on the GTM implementation page and what step you're on. Just describe what's happening.
                </p>
                <textarea
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  placeholder="e.g., 'I can't find where to create a Custom HTML tag' or 'The preview mode isn't showing anything'"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none h-24"
                  disabled={helpSent}
                />
                <div className="flex items-center justify-between mt-4">
                  <button
                    onClick={() => {
                      setShowHelp(false);
                      setHelpMessage('');
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                    disabled={helpSent}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendHelpRequest}
                    disabled={!helpMessage.trim() || helpSent}
                    className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {helpSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Sent to Sage!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send to Sage
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}