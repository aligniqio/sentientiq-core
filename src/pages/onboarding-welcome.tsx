import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useOrganization, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { ArrowRight, Building2, Sparkles, Zap } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { getSupabaseClient } from '@/lib/supabase';

export default function OnboardingWelcome() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoaded: userLoaded } = useUser();
  const { organization } = useOrganization();
  const { getToken } = useAuth();
  const [step, setStep] = useState<'loading' | 'create-org' | 'ready'>('loading');
  const [orgName, setOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  const supabase = getSupabaseClient();

  // Get session ID from Stripe redirect
  const sessionId = searchParams.get('session_id');
  const fromStripe = searchParams.get('from') === 'stripe';

  useEffect(() => {
    if (!userLoaded) return;

    if (organization) {
      // Already has org, mark as new and go to implementation
      markAsNewUser();
      setStep('ready');
      setTimeout(() => {
        navigate('/system/implementation');
      }, 2000);
    } else {
      // Need to create organization
      setStep('create-org');
    }
  }, [userLoaded, organization]);

  const markAsNewUser = async () => {
    if (!supabase || !organization || !user) return;

    try {
      // Ensure organization member record exists with onboarding flag
      await supabase
        .from('organization_members')
        .upsert({
          organization_id: organization.id,
          user_id: user.id,
          is_onboarded: false,
          stripe_session_id: sessionId,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'organization_id,user_id'
        });
    } catch (error) {
      console.error('Error marking user as new:', error);
    }
  };

  const createOrganization = async () => {
    if (!user || !orgName.trim()) return;

    setCreating(true);
    try {
      // Create Clerk organization
      const response = await fetch('https://api.clerk.com/v1/organizations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: orgName,
          created_by: user.id,
          public_metadata: {
            stripe_session_id: sessionId,
            onboarding_status: 'started'
          }
        })
      });

      if (response.ok) {
        const newOrg = await response.json();

        // Add user to organization
        await fetch(`https://api.clerk.com/v1/organizations/${newOrg.id}/memberships`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: user.id,
            role: 'admin'
          })
        });

        // Refresh and navigate
        window.location.href = '/system/implementation';
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      setCreating(false);
    }
  };

  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (step === 'ready') {
    return (
      <div className="min-h-screen">
        <PageHeader
          title="Welcome to SentientIQ!"
          subtitle="Your emotional intelligence engine is ready to deploy"
        />
        <div className="max-w-2xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-2xl p-8 border border-green-500/30"
          >
            <Zap className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4 text-center">Let's Weaponize Your Website!</h2>

            <div className="my-8 space-y-2">
              <p className="text-xl text-center text-white">Next 10 minutes:</p>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <span className="px-3 py-1 bg-blue-600/30 rounded-full text-sm">2 min: Copy scripts</span>
                <ArrowRight className="w-4 h-4" />
                <span className="px-3 py-1 bg-purple-600/30 rounded-full text-sm">5 min: Configure interventions</span>
                <ArrowRight className="w-4 h-4" />
                <span className="px-3 py-1 bg-green-600/30 rounded-full text-sm">3 min: Go live</span>
              </div>
            </div>

            <p className="text-center text-gray-300 mb-6">
              While your competitors are still A/B testing button colors,<br/>
              you'll be reading minds and rescuing sales in real-time.
            </p>

            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Redirecting to setup...</p>
              <div className="animate-pulse">
                <ArrowRight className="w-8 h-8 text-green-400 mx-auto" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Welcome to SentientIQ!"
        subtitle="Let's get your emotional intelligence engine running"
      />

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
        >
          {fromStripe && (
            <div className="mb-8 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-green-400 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Payment successful! Let's set up your account.
              </p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-400" />
                Create Your Organization
              </h2>
              <p className="text-gray-400 mb-6">
                This will be your workspace for managing emotional intelligence across your sites.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g., Acme Motors or My Company"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                You can change this later in settings.
              </p>
            </div>

            <button
              onClick={createOrganization}
              disabled={!orgName.trim() || creating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Organization...
                </>
              ) : (
                <>
                  Continue to Setup
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="pt-6 border-t border-gray-700">
              <h3 className="text-lg font-bold text-center mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Your 10-Minute Setup Journey
              </h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <div>
                    <p className="font-semibold text-white">Copy 2 Scripts (2 min)</p>
                    <p className="text-sm text-gray-400">We auto-populate everything. Just copy & paste into GTM.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <div>
                    <p className="font-semibold text-white">Configure Your Interventions (5 min)</p>
                    <p className="text-sm text-gray-400">Choose what happens when visitors feel frustrated, confused, or ready to leave.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-pink-600 to-red-600 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <div>
                    <p className="font-semibold text-white">Go Live (3 min)</p>
                    <p className="text-sm text-gray-400">Publish in GTM. Watch emotions flow. Intervene automatically.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-lg text-center">
                <p className="text-green-400 font-bold">
                  ⚡ You're literally 10 minutes away from weaponizing emotional intelligence
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  While competitors guess, you'll know exactly who needs what, when.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}