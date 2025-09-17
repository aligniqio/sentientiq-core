import { motion } from 'framer-motion';
import { CreditCard, AlertCircle, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUser, useOrganization } from '@clerk/clerk-react';
import PageHeader from '../components/PageHeader';

export default function PaymentRequired() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { organization } = useOrganization();

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Payment Required"
        subtitle="Complete your subscription to access SentientIQ"
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-2xl p-8 border border-red-500/30"
        >
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-red-500/20 rounded-full mb-4">
              <Lock className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Subscription Required</h2>
            <p className="text-gray-300 text-lg">
              SentientIQ requires an active subscription to track emotions and deploy interventions.
            </p>
          </div>

          <div className="bg-black/30 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-1" />
              <div>
                <p className="text-yellow-400 font-semibold mb-2">
                  No active subscription found
                </p>
                <p className="text-gray-400 text-sm">
                  {organization
                    ? `Organization "${organization.name}" needs a subscription to continue.`
                    : 'Please select a plan to get started with emotional intelligence.'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg transition-all transform hover:scale-105"
            >
              <CreditCard className="w-5 h-5" />
              View Pricing Plans
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="text-center">
              <p className="text-gray-500 text-sm">
                Questions? Contact{' '}
                <a href="mailto:hello@sentientiq.ai" className="text-blue-400 hover:text-blue-300">
                  hello@sentientiq.ai
                </a>
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-4">What you'll get with a subscription:</h3>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Real-time emotion detection (12 emotions, 95% accuracy)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Identity resolution (know WHO is feeling WHAT)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Automated interventions before abandonment
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Weekly accountability scorecard
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                Sage AI support assistant
              </li>
            </ul>
          </div>

          {user && (
            <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-500">
                Signed in as: {user.primaryEmailAddress?.emailAddress}
                <br />
                User ID: {user.id}
                {organization && (
                  <>
                    <br />
                    Organization: {organization.name}
                  </>
                )}
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}