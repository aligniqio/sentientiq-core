import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Copy, Check, Code, Settings, Zap } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { useUser } from '@clerk/clerk-react';

export default function SystemImplementation() {
  const { user } = useUser();
  const [tenantId, setTenantId] = useState('');
  const [debugMode, setDebugMode] = useState(true);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  useEffect(() => {
    // Try to get tenant ID from localStorage or URL params
    const storedTenantId = localStorage.getItem('tenantId');
    const params = new URLSearchParams(window.location.search);
    const urlTenantId = params.get('tenant_id');

    if (urlTenantId) {
      setTenantId(urlTenantId);
    } else if (storedTenantId) {
      setTenantId(storedTenantId);
    }
  }, []);

  const copyToClipboard = async (text: string, scriptName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(scriptName);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateTelemetryScript = () => {
    if (!tenantId) return '';

    return `<script>
  (function() {
    'use strict';

    // Set config for telemetry script
    window.SentientIQ = {
      tenantId: '${tenantId}',
      apiEndpoint: 'https://api.sentientiq.app'
    };

    // Load telemetry
    var script = document.createElement('script');
    script.src = 'https://sentientiq.ai/telemetry-v5.js';
    script.setAttribute('data-tenant-id', '${tenantId}');
    script.setAttribute('data-debug', '${debugMode}');
    document.head.appendChild(script);
  })();
</script>`;
  };

  const generateInterventionScript = () => {
    if (!tenantId) return '';

    return `<script>
  (function() {
    'use strict';

    console.log('[GTM] Intervention tag fired at DOM Ready!');

    // Set config
    window.SentientIQ = window.SentientIQ || {
      tenantId: '${tenantId}',
      apiEndpoint: 'https://api.sentientiq.app'
    };

    // Wait a bit for telemetry to set session
    setTimeout(function() {
      console.log('[GTM] Loading intervention after delay...');
      console.log('[GTM] Session:', sessionStorage.getItem('sq_session_id'));

      var script = document.createElement('script');
      script.src = 'https://sentientiq.ai/intervention-receiver.js';
      script.onload = function() {
        console.log('[GTM] ✅ Intervention script loaded!');
      };
      script.onerror = function() {
        console.log('[GTM] ❌ Failed to load intervention script');
      };
      document.head.appendChild(script);
    }, 2000); // 2 second delay to ensure telemetry has initialized
  })();
</script>`;
  };

  const telemetryScript = generateTelemetryScript();
  const interventionScript = generateInterventionScript();

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
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="Enter your Tenant ID"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              {!tenantId && (
                <p className="text-sm text-yellow-400 mt-2">
                  ⚠️ Please enter your Tenant ID to generate the scripts
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

        {/* Step 1: Telemetry Script */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Code className="w-6 h-6 text-green-400" />
            Step 1: Add Telemetry Script
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
                  <span>Tag Name: SentientIQ Telemetry</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-blue-400" />
                  <span>Trigger: All Pages</span>
                </li>
              </ul>
            </div>

            {tenantId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Script to Copy:</h3>
                  <button
                    onClick={() => copyToClipboard(telemetryScript, 'telemetry')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {copiedScript === 'telemetry' ? (
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
                  <code>{telemetryScript}</code>
                </pre>
              </div>
            )}
          </div>
        </motion.div>

        {/* Step 2: Intervention Script */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-700"
        >
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Zap className="w-6 h-6 text-purple-400" />
            Step 2: Add Intervention Script
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
                  <span>Tag Name: SentientIQ Interventions</span>
                </li>
                <li className="flex items-start gap-2">
                  <ChevronRight className="w-4 h-4 mt-1 text-blue-400" />
                  <span>Trigger: All Pages - DOM Ready</span>
                </li>
              </ul>
            </div>

            {tenantId && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Script to Copy:</h3>
                  <button
                    onClick={() => copyToClipboard(interventionScript, 'intervention')}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  >
                    {copiedScript === 'intervention' ? (
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
                  <code>{interventionScript}</code>
                </pre>
              </div>
            )}
          </div>
        </motion.div>

        {/* Final Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl p-8 border border-blue-500/30"
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

        {/* Support Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-400 mb-4">
            Need help with implementation?
          </p>
          <a
            href="mailto:support@sentientiq.app"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            Contact Support
            <ChevronRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </div>
  );
}