import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, AlertTriangle, TrendingUp, Shield, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSignUp } from '@clerk/clerk-react';

interface InstantInsights {
  domain: string;
  performance_score: number;
  emotional_impact: {
    overall_emotional_score: number;
    problems: Array<{
      type: string;
      issue: string;
      emotional_impact: string;
    }>;
    opportunities: Array<{
      type: string;
      strength: string;
      emotional_impact: string;
    }>;
    summary: string;
  };
  top_issues: any[];
  phd_recommendation: string;
}

export default function Onboarding() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<InstantInsights | null>(null);
  const [step, setStep] = useState<'email' | 'analyzing' | 'results'>('email');
  const navigate = useNavigate();
  const { signUp } = useSignUp();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.includes('@')) {
      alert('Please enter a valid work email');
      return;
    }

    setLoading(true);
    setStep('analyzing');

    try {
      const response = await fetch('/api/onboard/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      
      if (data.success) {
        setInsights(data.instant_insights);
        
        // Store in localStorage for sticky persistence
        localStorage.setItem('onboarding_email', email);
        localStorage.setItem('onboarding_insights', JSON.stringify(data.instant_insights));
        localStorage.setItem('free_questions_remaining', '20');
        
        setTimeout(() => setStep('results'), 2000);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      alert('Analysis failed. Please try again.');
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-6 py-20">
        
        <AnimatePresence mode="wait">
          {step === 'email' && (
            <motion.div
              key="email"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto text-center"
            >
              <h1 className="text-5xl font-bold text-white mb-4">
                See Your Site's Emotional Impact
              </h1>
              <p className="text-xl text-white/80 mb-12">
                Enter your work email. Get instant insights. No signup required.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full px-6 py-4 text-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:border-blue-400"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105"
                >
                  <Zap className="w-5 h-5" />
                  Get Instant Analysis
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <p className="mt-8 text-sm text-white/60">
                Free analysis • No credit card • 30-second results
              </p>
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="max-w-2xl mx-auto text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 animate-pulse" />
                <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20">
                  <Brain className="w-20 h-20 text-blue-400 mx-auto mb-6 animate-pulse" />
                  <h2 className="text-3xl font-bold text-white mb-4">
                    PhD Collective Analyzing...
                  </h2>
                  <div className="space-y-2 text-white/70">
                    <p>✓ Fetching your website data</p>
                    <p>✓ Running emotional impact analysis</p>
                    <p>✓ Detecting friction points</p>
                    <p>✓ Checking for suspicious patterns...</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'results' && insights && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-white mb-4">
                  Instant Analysis for {insights.domain}
                </h1>
                <p className="text-xl text-white/80">
                  Here's what we found in 30 seconds
                </p>
              </div>

              {/* Emotional Score Card */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Emotional Impact Score
                  </h2>
                  <div className="text-4xl font-bold text-white">
                    {insights.emotional_impact.overall_emotional_score}
                    <span className="text-xl text-white/60">/100</span>
                  </div>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-4 mb-6">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    style={{ width: `${insights.emotional_impact.overall_emotional_score}%` }}
                  />
                </div>

                <p className="text-white/80">
                  {insights.emotional_impact.summary}
                </p>
              </div>

              {/* Problems Detected */}
              {insights.emotional_impact.problems.length > 0 && (
                <div className="bg-red-500/10 backdrop-blur-xl rounded-2xl p-8 border border-red-500/20 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                    <h2 className="text-2xl font-bold text-white">
                      Emotional Friction Points
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {insights.emotional_impact.problems.map((problem, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">
                          {problem.issue}
                        </h3>
                        <p className="text-white/70 text-sm">
                          {problem.emotional_impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Opportunities */}
              {insights.emotional_impact.opportunities.length > 0 && (
                <div className="bg-green-500/10 backdrop-blur-xl rounded-2xl p-8 border border-green-500/20 mb-8">
                  <div className="flex items-center gap-3 mb-6">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                    <h2 className="text-2xl font-bold text-white">
                      Strengths Detected
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    {insights.emotional_impact.opportunities.map((opp, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-4">
                        <h3 className="text-white font-semibold mb-2">
                          {opp.strength}
                        </h3>
                        <p className="text-white/70 text-sm">
                          {opp.emotional_impact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PhD Recommendation */}
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-xl rounded-2xl p-8 border border-white/20 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-white">
                    PhD Collective Says
                  </h2>
                </div>
                <p className="text-white/90 text-lg leading-relaxed">
                  {insights.phd_recommendation}
                </p>
              </div>

              {/* CTA */}
              <div className="text-center">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Want the Full Analysis?
                </h3>
                <p className="text-white/70 mb-4">
                  Connect your MarTech stack to see how your tools compare to reality
                </p>
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 backdrop-blur-xl rounded-xl p-4 mb-8 inline-block">
                  <p className="text-xl font-bold text-white">
                    🎯 Get 20 Free Questions with PhD Collective
                  </p>
                  <p className="text-sm text-white/70 mt-1">
                    No credit card required • Cancel anytime
                  </p>
                </div>
                <div>
                  <button 
                    onClick={async () => {
                      // Pre-fill Clerk signup with email
                      if (signUp) {
                        try {
                          await signUp.create({
                            emailAddress: email,
                          });
                          // Navigate to sign-up page with email pre-filled
                          navigate('/sign-up?email=' + encodeURIComponent(email));
                        } catch (err) {
                          // If error, still navigate with email as param
                          navigate('/sign-up?email=' + encodeURIComponent(email));
                        }
                      } else {
                        navigate('/sign-up?email=' + encodeURIComponent(email));
                      }
                    }}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-lg font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105"
                  >
                    <Shield className="w-5 h-5" />
                    Continue with Free Account
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}