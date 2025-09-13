/**
 * Intervention Management Admin Page
 * 
 * Allows tenant admins to customize intervention rules, messages, and branding
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/clerk-react';
import { 
  AlertCircle, 
  Zap, 
  TestTube, 
  Save, 
  Play,
  Edit3,
  Copy,
  Trash2,
  Plus,
  ChevronRight,
  Check,
  X,
  Eye,
  EyeOff,
  Palette,
  MessageSquare,
  Bell,
  Mail,
  Smartphone,
  Globe,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Sparkles
} from 'lucide-react';

interface InterventionTemplate {
  id: string;
  category: string;
  name: string;
  description: string;
  bestFor: string[];
  expectedImpact: {
    metric: string;
    improvement: string;
  };
  tier?: string;
}

interface InterventionConfig {
  ruleId: string;
  enabled: boolean;
  customizations: {
    name?: string;
    messages?: Record<string, string>;
    cooldownMinutes?: number;
    maxPerDay?: number;
    priority?: number;
    channels?: {
      slack?: { enabled: boolean; channel?: string };
      email?: { enabled: boolean; fromAddress?: string };
      sms?: { enabled: boolean; fromNumber?: string };
      chat?: { enabled: boolean; provider?: string };
    };
  };
  branding: {
    companyName: string;
    primaryColor?: string;
    tone?: string;
  };
  effectiveness?: {
    totalTriggers: number;
    successfulOutcomes: number;
    revenueImpact: number;
  };
}

const InterventionManagement: React.FC = () => {
  const { getToken } = useAuth();
  const [templates, setTemplates] = useState<InterventionTemplate[]>([]);
  const [interventions, setInterventions] = useState<InterventionConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InterventionTemplate | null>(null);
  const [selectedIntervention, setSelectedIntervention] = useState<InterventionConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'active' | 'analytics'>('templates');
  
  // Form state for customization
  const [customization, setCustomization] = useState({
    name: '',
    messages: {
      slack: '',
      email: '',
      chat: '',
      uiModal: ''
    },
    channels: {
      slack: { enabled: false, channel: '#alerts' },
      email: { enabled: false, fromAddress: '' },
      sms: { enabled: false, fromNumber: '' },
      chat: { enabled: false, provider: 'intercom' }
    },
    cooldownMinutes: 30,
    maxPerDay: 5,
    priority: 3
  });

  const [branding, setBranding] = useState({
    companyName: '',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    tone: 'professional' as 'formal' | 'casual' | 'friendly' | 'professional',
    logoUrl: ''
  });

  useEffect(() => {
    fetchTemplates();
    fetchInterventions();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/interventions/templates', {
        headers: {
          'Authorization': `Bearer ${await getToken() || ''}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchInterventions = async () => {
    try {
      const response = await fetch('/api/interventions/interventions', {
        headers: {
          'Authorization': `Bearer ${await getToken() || ''}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setInterventions(data.interventions);
      }
    } catch (error) {
      console.error('Error fetching interventions:', error);
    }
  };

  const createIntervention = async () => {
    if (!selectedTemplate) return;
    
    try {
      const response = await fetch('/api/interventions/interventions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken() || ''}`
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          customization
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setInterventions([...interventions, data.intervention]);
        setSelectedTemplate(null);
        setIsEditing(false);
        // Reset form
        setCustomization({
          name: '',
          messages: { slack: '', email: '', chat: '', uiModal: '' },
          channels: {
            slack: { enabled: false, channel: '#alerts' },
            email: { enabled: false, fromAddress: '' },
            sms: { enabled: false, fromNumber: '' },
            chat: { enabled: false, provider: 'intercom' }
          },
          cooldownMinutes: 30,
          maxPerDay: 5,
          priority: 3
        });
      }
    } catch (error) {
      console.error('Error creating intervention:', error);
    }
  };

  const updateIntervention = async () => {
    if (!selectedIntervention) return;
    
    try {
      const response = await fetch(`/api/interventions/interventions/${selectedIntervention.ruleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken() || ''}`
        },
        body: JSON.stringify({ customization })
      });
      
      const data = await response.json();
      if (data.success) {
        setInterventions(interventions.map(i => 
          i.ruleId === selectedIntervention.ruleId ? data.intervention : i
        ));
        setSelectedIntervention(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating intervention:', error);
    }
  };

  const testIntervention = async (intervention: InterventionConfig) => {
    setIsTesting(true);
    try {
      const testData = {
        sessionId: `test_${Date.now()}`,
        emotion: intervention.ruleId.includes('rage') ? 'rage' : 
                 intervention.ruleId.includes('confusion') ? 'confusion' : 
                 intervention.ruleId.includes('abandonment') ? 'abandonment' : 'hesitation',
        confidence: 85,
        pageUrl: '/test-page',
        userId: 'test_user'
      };
      
      const response = await fetch(`/api/interventions/interventions/${intervention.ruleId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken() || ''}`
        },
        body: JSON.stringify({ testData })
      });
      
      const data = await response.json();
      if (data.success) {
        setTestResults(data.result);
      }
    } catch (error) {
      console.error('Error testing intervention:', error);
    } finally {
      setIsTesting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'rage': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'confusion': return <HelpCircle className="w-5 h-5 text-yellow-500" />;
      case 'abandonment': return <LogOut className="w-5 h-5 text-orange-500" />;
      case 'delight': return <Sparkles className="w-5 h-5 text-green-500" />;
      case 'conversion': return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'retention': return <Users className="w-5 h-5 text-purple-500" />;
      default: return <Zap className="w-5 h-5 text-gray-500" />;
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'slack': return <MessageSquare className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'sms': return <Smartphone className="w-4 h-4" />;
      case 'chat': return <MessageSquare className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      {/* Neural Network Background */}
      <div className="fixed inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Intervention Management
          </h1>
          <p className="text-gray-400">Customize how SentientIQ responds to customer emotions</p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-900/50 backdrop-blur-sm rounded-lg p-1 w-fit">
          {['templates', 'active', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2 rounded-md transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Template List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold mb-4">Available Templates</h2>
                {templates.map((template) => (
                  <motion.div
                    key={template.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-purple-500 bg-purple-900/20'
                        : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedTemplate(template);
                      setCustomization({
                        ...customization,
                        name: template.name
                      });
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getCategoryIcon(template.category)}
                          <h3 className="font-semibold">{template.name}</h3>
                          {template.tier && (
                            <span className="text-xs px-2 py-1 bg-purple-900/50 rounded-full">
                              {template.tier}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{template.description}</p>
                        <div className="flex items-center space-x-4 text-xs">
                          <span className="text-green-400">
                            {template.expectedImpact.improvement}
                          </span>
                          <span className="text-gray-500">
                            {template.bestFor.join(', ')}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Customization Panel */}
              {selectedTemplate && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800"
                >
                  <h2 className="text-xl font-semibold mb-4">Customize Template</h2>
                  
                  {/* Basic Settings */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Intervention Name</label>
                      <input
                        type="text"
                        value={customization.name}
                        onChange={(e) => setCustomization({ ...customization, name: e.target.value })}
                        className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                        placeholder="Enter custom name..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Cooldown (minutes)</label>
                        <input
                          type="number"
                          value={customization.cooldownMinutes}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            cooldownMinutes: parseInt(e.target.value) 
                          })}
                          className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Max per Day</label>
                        <input
                          type="number"
                          value={customization.maxPerDay}
                          onChange={(e) => setCustomization({ 
                            ...customization, 
                            maxPerDay: parseInt(e.target.value) 
                          })}
                          className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Channels */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Notification Channels</h3>
                    <div className="space-y-3">
                      {Object.entries(customization.channels).map(([channel, config]) => (
                        <div key={channel} className="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                          <div className="flex items-center space-x-3">
                            {getChannelIcon(channel)}
                            <span className="capitalize">{channel}</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.enabled}
                              onChange={(e) => setCustomization({
                                ...customization,
                                channels: {
                                  ...customization.channels,
                                  [channel]: { ...config, enabled: e.target.checked }
                                }
                              })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3">Custom Messages</h3>
                    <div className="space-y-3">
                      {Object.entries(customization.channels).filter(([_, config]) => config.enabled).map(([channel]) => (
                        <div key={channel}>
                          <label className="block text-sm font-medium mb-2 capitalize">
                            {channel} Message
                          </label>
                          <textarea
                            value={customization.messages[channel as keyof typeof customization.messages] || ''}
                            onChange={(e) => setCustomization({
                              ...customization,
                              messages: {
                                ...customization.messages,
                                [channel]: e.target.value
                              }
                            })}
                            className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg focus:border-purple-500 focus:outline-none"
                            rows={3}
                            placeholder={`Enter ${channel} message...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <button
                      onClick={createIntervention}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Create Intervention</span>
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {interventions.map((intervention) => (
                  <motion.div
                    key={intervention.ruleId}
                    whileHover={{ scale: 1.02 }}
                    className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-semibold">{intervention.customizations.name}</h3>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => testIntervention(intervention)}
                          className="p-1 hover:bg-gray-800 rounded transition-colors"
                          disabled={isTesting}
                        >
                          <TestTube className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedIntervention(intervention);
                            setIsEditing(true);
                          }}
                          className="p-1 hover:bg-gray-800 rounded transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button className="p-1 hover:bg-gray-800 rounded transition-colors">
                          {intervention.enabled ? 
                            <Eye className="w-4 h-4 text-green-400" /> : 
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    {intervention.effectiveness && (
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-black/30 rounded p-2">
                          <div className="text-2xl font-bold text-purple-400">
                            {intervention.effectiveness.totalTriggers}
                          </div>
                          <div className="text-xs text-gray-500">Triggers</div>
                        </div>
                        <div className="bg-black/30 rounded p-2">
                          <div className="text-2xl font-bold text-green-400">
                            {((intervention.effectiveness.successfulOutcomes / intervention.effectiveness.totalTriggers) * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">Success Rate</div>
                        </div>
                      </div>
                    )}

                    {/* Active Channels */}
                    <div className="flex space-x-2">
                      {Object.entries(intervention.customizations.channels || {})
                        .filter(([_, config]) => config.enabled)
                        .map(([channel]) => (
                          <span key={channel} className="text-xs px-2 py-1 bg-gray-800 rounded-full">
                            {channel}
                          </span>
                        ))
                      }
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Performance Overview */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800">
                <h3 className="text-xl font-semibold mb-4">Performance Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Interventions</span>
                    <span className="text-2xl font-bold">{interventions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Interventions</span>
                    <span className="text-2xl font-bold text-green-400">
                      {interventions.filter(i => i.enabled).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Revenue Saved</span>
                    <span className="text-2xl font-bold text-purple-400">
                      ${interventions.reduce((sum, i) => sum + (i.effectiveness?.revenueImpact || 0), 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Performers */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-800">
                <h3 className="text-xl font-semibold mb-4">Top Performing Interventions</h3>
                <div className="space-y-3">
                  {interventions
                    .sort((a, b) => (b.effectiveness?.successfulOutcomes || 0) - (a.effectiveness?.successfulOutcomes || 0))
                    .slice(0, 5)
                    .map((intervention) => (
                      <div key={intervention.ruleId} className="flex justify-between items-center">
                        <span className="text-sm">{intervention.customizations.name}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {intervention.effectiveness?.successfulOutcomes || 0} saves
                          </span>
                          <span className="text-xs px-2 py-1 bg-green-900/50 text-green-400 rounded-full">
                            ${(intervention.effectiveness?.revenueImpact || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Test Results Modal */}
        <AnimatePresence>
          {testResults && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setTestResults(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-800"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-xl font-semibold mb-4">Test Results</h3>
                <div className="space-y-4">
                  <div className="bg-black/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Test Data</h4>
                    <pre className="text-xs text-gray-400">
                      {JSON.stringify(testResults.testData, null, 2)}
                    </pre>
                  </div>
                  <div className="bg-black/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Intervention Response</h4>
                    <pre className="text-xs text-gray-400">
                      {JSON.stringify(testResults.result, null, 2)}
                    </pre>
                  </div>
                  {testResults.preview && (
                    <div className="bg-black/50 rounded-lg p-4">
                      <h4 className="font-medium mb-2">Message Preview</h4>
                      <div className="space-y-2">
                        {Object.entries(testResults.preview.messages).map(([key, message]) => (
                          <div key={key}>
                            <span className="text-xs text-gray-500 capitalize">{key}:</span>
                            <p className="text-sm">{message as string}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setTestResults(null)}
                  className="mt-4 w-full px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Import required icons that were missing
const HelpCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
    <path strokeWidth="2" d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <circle cx="12" cy="17" r="0.5" fill="currentColor"/>
  </svg>
);

const LogOut = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeWidth="2" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline strokeWidth="2" points="16 17 21 12 16 7"/>
    <line strokeWidth="2" x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

export default InterventionManagement;