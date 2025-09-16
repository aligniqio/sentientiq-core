/**
 * Template Configuration Page
 * The crown jewel of the onboarding experience
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Head = ({ children }: { children: React.ReactNode }) => null;
import { motion } from 'framer-motion';
import { TemplateGallery } from '@/components/TemplateGallery';
import { InterventionTemplate } from '@/types/intervention-templates';
import { Sparkles, ArrowRight, Check, Zap, TrendingUp, DollarSign, Users } from 'lucide-react';
const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(' ');

export default function TemplateConfigPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const tenantId = params.get('tenantId');
  const tier = params.get('tier') || 'starter';
  const step = params.get('step') || '1';
  const [currentStep, setCurrentStep] = useState(parseInt(step as string) || 1);
  const [selectedTemplate, setSelectedTemplate] = useState<InterventionTemplate | null>(null);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    {
      id: 1,
      title: 'Welcome to SentientIQ',
      icon: Sparkles,
      description: 'Configure your emotional intelligence engine'
    },
    {
      id: 2,
      title: 'Choose Your Style',
      icon: Zap,
      description: 'Select intervention templates that match your brand'
    },
    {
      id: 3,
      title: 'Customize & Launch',
      icon: TrendingUp,
      description: 'Fine-tune your settings and go live'
    }
  ];

  const handleTemplateSelect = (template: InterventionTemplate) => {
    setSelectedTemplate(template);
    if (!completedSteps.includes(2)) {
      setCompletedSteps([...completedSteps, 2]);
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      navigate(`/dashboard?tenantId=${tenantId}&onboarded=true`);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <>
      <Head>
        <title>Configure Your Templates - SentientIQ</title>
        <meta name="description" content="Choose and customize your intervention templates" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <h1 className="text-2xl font-bold">Template Configuration</h1>

                {/* Steps */}
                <nav className="hidden md:flex items-center gap-2">
                  {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => completedSteps.includes(step.id) && setCurrentStep(step.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg transition-all',
                          currentStep === step.id
                            ? 'bg-black text-white'
                            : completedSteps.includes(step.id)
                            ? 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                        disabled={!completedSteps.includes(step.id) && currentStep !== step.id}
                      >
                        {completedSteps.includes(step.id) ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <step.icon className="w-4 h-4" />
                        )}
                        <span className="font-medium">{step.title}</span>
                      </button>
                      {index < steps.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </React.Fragment>
                  ))}
                </nav>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium',
                  tier === 'starter' && 'bg-gray-200 text-gray-700',
                  tier === 'growth' && 'bg-blue-100 text-blue-700',
                  tier === 'scale' && 'bg-purple-100 text-purple-700',
                  tier === 'enterprise' && 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white'
                )}>
                  {(tier as string).toUpperCase()} TIER
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Welcome Section */}
              <div className="text-center max-w-3xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Sparkles className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-4xl font-bold mb-4">
                  Welcome to the Future of
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Emotional Intelligence</span>
                </h2>

                <p className="text-xl text-gray-600 mb-12">
                  Your visitors aren't just metrics. They're humans with emotions, desires, and frustrations.
                  SentientIQ sees what others miss.
                </p>
              </div>

              {/* Value Props */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
                >
                  <DollarSign className="w-10 h-10 text-green-500 mb-4" />
                  <h3 className="text-lg font-bold mb-2">Increase Revenue</h3>
                  <p className="text-gray-600">
                    Convert 23% more visitors by responding to their emotional state in real-time
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
                >
                  <Users className="w-10 h-10 text-blue-500 mb-4" />
                  <h3 className="text-lg font-bold mb-2">Reduce Cart Abandonment</h3>
                  <p className="text-gray-600">
                    Detect frustration and anxiety before they leave, intervene with perfect timing
                  </p>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
                >
                  <TrendingUp className="w-10 h-10 text-purple-500 mb-4" />
                  <h3 className="text-lg font-bold mb-2">Predictive Analytics</h3>
                  <p className="text-gray-600">
                    Our AI learns from every interaction, continuously improving intervention effectiveness
                  </p>
                </motion.div>
              </div>

              {/* CTA */}
              <div className="text-center">
                <button
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
                >
                  Let's Configure Your Templates
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="mb-8">
                <h2 className="text-3xl font-bold mb-2">Choose Your Intervention Style</h2>
                <p className="text-lg text-gray-600">
                  Select templates that match your brand personality. You can change these anytime.
                </p>
              </div>

              <TemplateGallery
                tenantId={tenantId as string}
                currentTier={tier as any}
                onTemplateSelect={handleTemplateSelect}
              />

              <div className="mt-12 flex items-center justify-between">
                <button
                  onClick={handlePreviousStep}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                >
                  Back
                </button>

                <button
                  onClick={handleNextStep}
                  disabled={!selectedTemplate}
                  className={cn(
                    'inline-flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all',
                    selectedTemplate
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:opacity-90'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Continue to Customization
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="text-center max-w-3xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                  className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-10 h-10 text-white" />
                </motion.div>

                <h2 className="text-4xl font-bold mb-4">You're All Set!</h2>
                <p className="text-xl text-gray-600 mb-8">
                  Your emotional intelligence engine is configured and ready to transform your visitor experience.
                </p>
              </div>

              {/* Implementation Code */}
              <div className="bg-gray-900 rounded-xl p-8 text-white">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Your Implementation Code
                </h3>

                <p className="text-gray-400 mb-4">
                  Add this script to your website's {'<head>'} tag:
                </p>

                <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto">
                  <code className="text-sm font-mono text-green-400">{`<script>
  window.SentientIQ = {
    tenantId: '${tenantId}',
    apiEndpoint: 'https://api.sentientiq.app'
  };
  var script = document.createElement('script');
  script.src = 'https://sentientiq.ai/telemetry-v5.js';
  script.setAttribute('data-tenant-id', '${tenantId}');
  document.head.appendChild(script);
</script>`}</code>
                </pre>
              </div>

              {/* Next Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                  <h4 className="font-bold mb-2">1. Install the Script</h4>
                  <p className="text-gray-600 text-sm">
                    Add our tracking code to your website. It takes less than 2 minutes.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                  <h4 className="font-bold mb-2">2. Watch the Magic</h4>
                  <p className="text-gray-600 text-sm">
                    Our AI starts learning your visitors' emotional patterns immediately.
                  </p>
                </div>

                <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                  <h4 className="font-bold mb-2">3. See Results</h4>
                  <p className="text-gray-600 text-sm">
                    Most clients see conversion improvements within the first 48 hours.
                  </p>
                </div>
              </div>

              {/* Final CTA */}
              <div className="text-center">
                <button
                  onClick={() => navigate(`/dashboard?tenantId=${tenantId}&onboarded=true`)}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity shadow-lg"
                >
                  Go to Dashboard
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </>
  );
}