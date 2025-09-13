/**
 * SentientIQ Setup Wizard
 * 
 * The 15-minute setup that Mike screen-shares with enterprise customers.
 * No technical knowledge required from the customer.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Copy, 
  Phone, 
  Mail, 
  Globe, 
  Zap, 
  AlertCircle,
  ChevronRight,
  Sparkles,
  DollarSign,
  Building,
  User,
  MessageSquare,
  Shield,
  Smartphone,
  Code,
  Play,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'error';
}

const SetupWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [crmConnected, setCrmConnected] = useState(false);
  const [codeInstalled, setCodeInstalled] = useState(false);
  const [emotionsDetected, setEmotionsDetected] = useState(false);
  const [testAlertSent, setTestAlertSent] = useState(false);
  const [liveEmotions, setLiveEmotions] = useState<any[]>([]);
  
  const steps: SetupStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to SentientIQ',
      description: "Let's protect your revenue in 15 minutes",
      icon: <Sparkles className="w-6 h-6" />,
      status: currentStep > 0 ? 'completed' : currentStep === 0 ? 'active' : 'pending'
    },
    {
      id: 'install',
      title: 'Install the Code',
      description: 'One line that changes everything',
      icon: <Code className="w-6 h-6" />,
      status: currentStep > 1 ? 'completed' : currentStep === 1 ? 'active' : 'pending'
    },
    {
      id: 'verify',
      title: 'Verify It Works',
      description: 'See your first emotion',
      icon: <Play className="w-6 h-6" />,
      status: currentStep > 2 ? 'completed' : currentStep === 2 ? 'active' : 'pending'
    },
    {
      id: 'alerts',
      title: 'Setup CEO Alerts',
      description: 'Get texted when revenue is at risk',
      icon: <Phone className="w-6 h-6" />,
      status: currentStep > 3 ? 'completed' : currentStep === 3 ? 'active' : 'pending'
    },
    {
      id: 'connect',
      title: 'Connect Your Tools',
      description: 'Salesforce, HubSpot, Slack, etc.',
      icon: <Zap className="w-6 h-6" />,
      status: currentStep > 4 ? 'completed' : currentStep === 4 ? 'active' : 'pending'
    },
    {
      id: 'success',
      title: "You're Live!",
      description: 'Start saving customers',
      icon: <CheckCircle className="w-6 h-6" />,
      status: currentStep === 5 ? 'active' : 'pending'
    }
  ];

  // Generate API key on mount
  useEffect(() => {
    setApiKey(`sq_live_${Math.random().toString(36).substring(2, 15)}`);
    
    // Simulate live emotions after code installation
    if (codeInstalled) {
      const interval = setInterval(() => {
        const emotions = [
          { company: 'Acme Corp', value: 120000, emotion: 'curiosity', confidence: 75 },
          { company: 'TechCo', value: 85000, emotion: 'confusion', confidence: 82 },
          { company: 'Enterprise Inc', value: 240000, emotion: 'price_evaluation', confidence: 90 }
        ];
        
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        setLiveEmotions(prev => [randomEmotion, ...prev].slice(0, 5));
        
        if (!emotionsDetected) {
          setEmotionsDetected(true);
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [codeInstalled, emotionsDetected]);

  const handleCopyCode = () => {
    const code = `<script src="https://cdn.sentientiq.app/sdk.js" data-api-key="${apiKey}"></script>`;
    navigator.clipboard.writeText(code);
  };

  const handleTestAlert = async () => {
    setTestAlertSent(true);
    // In production, this would actually send an SMS
    setTimeout(() => {
      alert(`📱 SMS Sent to ${phoneNumber}:\n\n🚨 TEST: Acme Corp ($120k/yr) showing RAGE.\n\nDashboard: sentiq.app/test\n\nReply 1 to acknowledge`);
    }, 1000);
  };

  const handleConnectCRM = (crm: string) => {
    // In production, this would open OAuth flow
    setCrmConnected(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-purple-800/30 bg-black/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">SentientIQ Setup</h1>
              <p className="text-sm text-gray-400">15 minutes to revenue protection</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Support: (415) 555-0100
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Mike is here</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                step.status === 'completed' ? 'bg-green-600 border-green-600' :
                step.status === 'active' ? 'bg-purple-600 border-purple-600 animate-pulse' :
                'bg-gray-800 border-gray-700'
              }`}>
                {step.status === 'completed' ? (
                  <Check className="w-6 h-6" />
                ) : (
                  step.icon
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-20 h-1 mx-2 transition-all ${
                  currentStep > index ? 'bg-green-600' : 'bg-gray-800'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-800/30"
          >
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-bold mb-4">Welcome to SentientIQ!</h2>
                  <p className="text-xl text-gray-300">
                    I'm Mike, your setup specialist. I'll have you saving customers in 15 minutes.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Company</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-600/30 rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="Acme Corporation"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Website</label>
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-600/30 rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="https://acme.com"
                    />
                  </div>
                </div>

                <div className="bg-purple-900/20 rounded-lg p-6 border border-purple-600/30">
                  <h3 className="font-semibold mb-3">What happens next:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Install one line of code (2 minutes)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>See emotions appear in real-time (instant)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Setup CEO alerts (3 minutes)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>Connect your CRM (5 minutes)</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Let's Start</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Step 1: Install Code */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Install the Code</h2>
                  <p className="text-gray-400">Copy this one line and paste it before &lt;/head&gt; on your website</p>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-600/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Your unique code:</span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center space-x-2 px-3 py-1 bg-purple-600 rounded hover:bg-purple-700 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </button>
                  </div>
                  <code className="text-sm text-green-400 break-all">
                    {`<script src="https://cdn.sentientiq.app/sdk.js" data-api-key="${apiKey}"></script>`}
                  </code>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                    <h4 className="font-semibold mb-2">WordPress?</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Go to Appearance → Theme Editor → header.php
                    </p>
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                      Show me how →
                    </button>
                  </div>
                  
                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                    <h4 className="font-semibold mb-2">Shopify?</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Go to Themes → Edit Code → theme.liquid
                    </p>
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                      Show me how →
                    </button>
                  </div>
                  
                  <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                    <h4 className="font-semibold mb-2">Custom Site?</h4>
                    <p className="text-sm text-gray-400 mb-3">
                      Email this to your web team
                    </p>
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                      Generate email →
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-900/20 rounded-lg p-4 border border-yellow-600/30">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">Need help?</span> I'm watching your screen. 
                        Just tell me where to click and I'll guide you.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      setCodeInstalled(true);
                      setCurrentStep(2);
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    I've Added the Code
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verify */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Verifying Installation...</h2>
                  <p className="text-gray-400">Checking for emotions on {websiteUrl || 'your website'}</p>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-6 border border-purple-600/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-400">Connection Status</span>
                    {emotionsDetected ? (
                      <div className="flex items-center space-x-2 text-green-500">
                        <CheckCircle className="w-5 h-5" />
                        <span>Connected!</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-yellow-500">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Detecting...</span>
                      </div>
                    )}
                  </div>

                  {emotionsDetected && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-400 mb-2">Live Emotions Detected:</div>
                      {liveEmotions.map((emotion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-black/30 rounded-lg p-3 border border-gray-800"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                emotion.confidence > 80 ? 'bg-red-500' :
                                emotion.confidence > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`} />
                              <span className="font-medium">{emotion.company}</span>
                              <span className="text-sm text-gray-400">
                                ${(emotion.value / 1000).toFixed(0)}k/yr
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-purple-400">{emotion.emotion}</span>
                              <span className="text-xs text-gray-500">{emotion.confidence}%</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {emotionsDetected && (
                  <div className="bg-green-900/20 rounded-lg p-4 border border-green-600/30">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-semibold">Perfect! SentientIQ is tracking emotions.</p>
                        <p className="text-sm text-gray-400">
                          You're already protecting ${((liveEmotions[0]?.value || 0) / 1000).toFixed(0)}k in revenue.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!emotionsDetected}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      emotionsDetected 
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
                        : 'bg-gray-800 cursor-not-allowed'
                    }`}
                  >
                    Setup CEO Alerts
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: CEO Alerts */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Setup CEO Alerts</h2>
                  <p className="text-gray-400">Get texted instantly when high-value customers show rage</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">CEO Mobile Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-purple-600/30 rounded-lg focus:border-purple-500 focus:outline-none"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Alert Threshold</label>
                    <select className="w-full px-4 py-3 bg-gray-900/50 border border-purple-600/30 rounded-lg focus:border-purple-500 focus:outline-none">
                      <option>$100k+ customers only</option>
                      <option>$50k+ customers</option>
                      <option>$25k+ customers</option>
                      <option>All customers</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-900/50 rounded-lg p-6 border border-purple-600/30">
                  <h3 className="font-semibold mb-3">Test Alert</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Let's make sure it works. Click below to send a test alert to your phone.
                  </p>
                  <button
                    onClick={handleTestAlert}
                    disabled={!phoneNumber || testAlertSent}
                    className={`px-6 py-3 rounded-lg font-medium transition-all ${
                      testAlertSent 
                        ? 'bg-green-600 text-white' 
                        : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    {testAlertSent ? (
                      <span className="flex items-center space-x-2">
                        <Check className="w-5 h-5" />
                        <span>Test Alert Sent!</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-2">
                        <Phone className="w-5 h-5" />
                        <span>Send Test Alert</span>
                      </span>
                    )}
                  </button>
                </div>

                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-600/30">
                  <h4 className="font-medium mb-2">What triggers alerts:</h4>
                  <div className="space-y-1 text-sm text-gray-400">
                    <div>• Customer worth $100k+ shows rage (95% confidence)</div>
                    <div>• Customer worth $100k+ shows abandonment risk (90% confidence)</div>
                    <div>• Any enterprise customer shows sticker shock on pricing</div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Connect My Tools
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Connect Tools */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Connect Your Tools</h2>
                  <p className="text-gray-400">Pull customer values from CRM, send alerts to Slack</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { name: 'Salesforce', icon: '☁️', connected: crmConnected },
                    { name: 'HubSpot', icon: '🧡', connected: false },
                    { name: 'Slack', icon: '💬', connected: false },
                    { name: 'Intercom', icon: '💭', connected: false },
                    { name: 'Stripe', icon: '💳', connected: false },
                    { name: 'Zendesk', icon: '🎧', connected: false }
                  ].map((tool) => (
                    <div
                      key={tool.name}
                      className="bg-gray-900/50 rounded-lg p-4 border border-purple-600/30 hover:border-purple-500 transition-colors cursor-pointer"
                      onClick={() => handleConnectCRM(tool.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{tool.icon}</span>
                          <div>
                            <p className="font-medium">{tool.name}</p>
                            <p className="text-xs text-gray-400">
                              {tool.connected ? 'Connected' : 'Click to connect'}
                            </p>
                          </div>
                        </div>
                        {tool.connected ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-600/30">
                  <p className="text-sm">
                    <span className="font-semibold">Not required:</span> SentientIQ works without these integrations. 
                    But connecting them adds customer names, values, and better routing.
                  </p>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Complete Setup
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Success */}
            {currentStep === 5 && (
              <div className="space-y-6 text-center">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold mb-2">You're Live!</h2>
                  <p className="text-xl text-gray-300">
                    SentientIQ is now protecting your revenue 24/7
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-8">
                  <div className="bg-gray-900/50 rounded-lg p-6 border border-purple-600/30">
                    <div className="text-3xl font-bold text-purple-400">
                      {liveEmotions.length}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Emotions Detected</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-6 border border-purple-600/30">
                    <div className="text-3xl font-bold text-green-400">
                      ${((liveEmotions[0]?.value || 0) / 1000).toFixed(0)}k
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Revenue Protected</p>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-6 border border-purple-600/30">
                    <div className="text-3xl font-bold text-blue-400">
                      3 sec
                    </div>
                    <p className="text-sm text-gray-400 mt-1">Alert Speed</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6 border border-purple-600/30">
                  <h3 className="font-semibold mb-3">Your Dashboard</h3>
                  <p className="text-gray-400 mb-4">
                    Monitor emotions, interventions, and savings in real-time
                  </p>
                  <a
                    href="/dashboard"
                    className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    <span>Open Dashboard</span>
                    <ChevronRight className="w-5 h-5" />
                  </a>
                </div>

                <div className="pt-6 border-t border-gray-800">
                  <p className="text-sm text-gray-400 mb-2">Need anything?</p>
                  <div className="flex items-center justify-center space-x-6">
                    <a href="tel:4155550100" className="flex items-center space-x-2 text-purple-400 hover:text-purple-300">
                      <Phone className="w-4 h-4" />
                      <span>(415) 555-0100</span>
                    </a>
                    <a href="mailto:support@sentientiq.app" className="flex items-center space-x-2 text-purple-400 hover:text-purple-300">
                      <Mail className="w-4 h-4" />
                      <span>support@sentientiq.app</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SetupWizard;