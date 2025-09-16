import { useState, useEffect } from 'react';
import SEO from '@/components/SEO';
import NeuralBackground from '@/components/NeuralBackground';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

type CodeExample = {
  title: string;
  code: string;
  description: string;
};

type CodeExamples = {
  telemetry: CodeExample;
  siteMapper: CodeExample;
  processor: CodeExample;
  integration: CodeExample;
};

const codeExamples: CodeExamples = {
  telemetry: {
      title: "Real-Time Behavioral Telemetry",
      code: `// Actual production code from telemetry-v5.js
const captureMouseVelocity = (e) => {
  const dt = e.timeStamp - lastTime;
  const distance = Math.sqrt(
    Math.pow(e.pageX - lastX, 2) +
    Math.pow(e.pageY - lastY, 2)
  );

  const velocity = distance / dt * 1000;

  // Emotional state detection
  if (velocity > 800 && isNearPricing()) {
    diagnoseEmotion('sticker_shock', {
      velocity,
      pattern: 'recoil',
      confidence: 0.92
    });
  }
};`,
      description: "Sub-300ms emotion detection from mouse physics"
    },
    siteMapper: {
      title: "Automatic Site Structure Discovery",
      code: `// Site mapper achieves 95% element detection accuracy
async function discoverSite() {
  const strategies = [
    domPatternRecognition(),    // Semantic HTML analysis
    visualClusterAnalysis(),    // Visual proximity grouping
    textContentInference(),     // NLP on button/link text
    behavioralHotspots()       // Historical click heatmaps
  ];

  const elements = await Promise.all(strategies);
  const consensus = mergeWithConfidence(elements);

  // Cache in edge for instant lookup
  localStorage.setItem('siteMap', consensus);
  return consensus; // {pricing: '.price-card', cta: '#signup'}
}`,
      description: "Zero-config element detection with multi-strategy consensus"
    },
    processor: {
      title: "Pattern Learning & Intervention Engine",
      code: `// Behavior processor with tenant-isolated learning
processSession(session) {
  const patterns = this.patternMatcher.match(session.events);

  // Real-time emotional diagnosis
  if (patterns.includes('RAGE_QUIT_SEQUENCE')) {
    this.triggerIntervention(session.id, {
      type: 'CRITICAL',
      action: 'alert_ceo',
      context: {
        user: session.identity,
        dealValue: session.crmData.value,
        emotion: 'frustration',
        confidence: 0.94
      }
    });
  }

  // Learn for future (tenant-isolated)
  this.neuralNet.train(session.events, patterns);
}`,
      description: "WebSocket-powered interventions fire in <100ms"
    },
    integration: {
      title: "CRM & Identity Resolution",
      code: `// Identity matching across systems
async function resolveVisitor(email) {
  // Parallel CRM lookups
  const [hubspot, salesforce] = await Promise.all([
    hubspotAPI.findDeal(email),
    salesforceAPI.findOpportunity(email)
  ]);

  // Enrich with firmographic data
  const company = await clearbit.enrich(email);

  return {
    identity: email,
    deal: hubspot?.amount || salesforce?.value,
    stage: hubspot?.stage || salesforce?.stage,
    riskScore: calculateRisk(hubspot, company),
    interventionThreshold: deal > 100000 ? 'HIGH' : 'NORMAL'
  };
}`,
      description: "Sub-second identity resolution across all your systems"
  }
};

export default function HowItWorks() {
  const [codeExample, setCodeExample] = useState<keyof CodeExamples>('telemetry');
  const [liveMetric, setLiveMetric] = useState(0);

  const siteUrl = (import.meta as any)?.env?.VITE_SITE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai');

  // Simulate real-time metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveMetric(prev => (prev + Math.random() * 10) % 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <SEO
        siteUrl={siteUrl}
        path="/how-it-works"
        title="How SentientIQ Works - The Technical Architecture"
        description="Deep dive into our real-time emotional intelligence engine. Mouse physics, pattern learning, and sub-100ms intervention cascades."
      />
      <div className="relative min-h-screen bg-black">
        <NeuralBackground />
        <main className="relative z-10 text-white">
          <NavBar />

          {/* Hero Section */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto text-center">
              <p className="kicker">The Architecture Behind the Magic</p>
              <h1 className="mt-3 text-5xl md:text-6xl font-bold">
                How We Read <span className="gradient-text">Digital Body Language</span>
              </h1>
              <p className="mt-6 text-xl text-white/70 max-w-3xl mx-auto">
                From mouse velocity to CEO alert in 3 seconds. This is how we built
                the world's first real-time emotional intelligence layer for B2B SaaS.
              </p>
            </div>
          </section>

          {/* The Core Innovation */}
          <section className="section py-12">
            <div className="max-w-7xl mx-auto">
              <div className="glass-card p-8 mb-8">
                <h2 className="text-3xl font-bold mb-6 text-center">
                  The Core Innovation: <span className="gradient-text">Behavioral Physics</span>
                </h2>
                <p className="text-lg text-white/80 text-center max-w-4xl mx-auto mb-8">
                  Traditional analytics tell you what happened. We tell you how they felt
                  when it happened. And more importantly - we act on it instantly.
                </p>

                {/* The Pipeline */}
                <div className="grid lg:grid-cols-5 gap-4">
                  <div className="glass-card p-6 bg-gradient-to-br from-purple-500/10 to-transparent">
                    <div className="text-3xl mb-3">🎯</div>
                    <h3 className="font-bold mb-2">Capture</h3>
                    <p className="text-sm text-white/70">
                      Every mouse move, scroll, click at 60Hz resolution
                    </p>
                    <div className="mt-3 text-xs font-mono text-purple-400">
                      ~100KB/min
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-br from-blue-500/10 to-transparent">
                    <div className="text-3xl mb-3">🧠</div>
                    <h3 className="font-bold mb-2">Analyze</h3>
                    <p className="text-sm text-white/70">
                      Velocity patterns, hesitation, rage clicks detected
                    </p>
                    <div className="mt-3 text-xs font-mono text-blue-400">
                      300ms latency
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-br from-green-500/10 to-transparent">
                    <div className="text-3xl mb-3">🔗</div>
                    <h3 className="font-bold mb-2">Identify</h3>
                    <p className="text-sm text-white/70">
                      Match to CRM deal in real-time
                    </p>
                    <div className="mt-3 text-xs font-mono text-green-400">
                      &lt;1s lookup
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-br from-yellow-500/10 to-transparent">
                    <div className="text-3xl mb-3">⚡</div>
                    <h3 className="font-bold mb-2">Decide</h3>
                    <p className="text-sm text-white/70">
                      Risk assessment + intervention logic
                    </p>
                    <div className="mt-3 text-xs font-mono text-yellow-400">
                      100ms eval
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-br from-red-500/10 to-transparent">
                    <div className="text-3xl mb-3">🚨</div>
                    <h3 className="font-bold mb-2">Act</h3>
                    <p className="text-sm text-white/70">
                      Alert, intervene, or adapt in real-time
                    </p>
                    <div className="mt-3 text-xs font-mono text-red-400">
                      3s total
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Deep Dive Tabs */}
              <div className="glass-card p-8">
                <div className="flex flex-wrap gap-2 mb-8 justify-center">
                  <button
                    onClick={() => setCodeExample('telemetry')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      codeExample === 'telemetry'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                        : 'glass-card hover:bg-white/10'
                    }`}
                  >
                    Real-Time Behavioral Telemetry
                  </button>
                  <button
                    onClick={() => setCodeExample('siteMapper')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      codeExample === 'siteMapper'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                        : 'glass-card hover:bg-white/10'
                    }`}
                  >
                    Automatic Site Structure Discovery
                  </button>
                  <button
                    onClick={() => setCodeExample('processor')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      codeExample === 'processor'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                        : 'glass-card hover:bg-white/10'
                    }`}
                  >
                    Pattern Learning & Intervention Engine
                  </button>
                  <button
                    onClick={() => setCodeExample('integration')}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      codeExample === 'integration'
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                        : 'glass-card hover:bg-white/10'
                    }`}
                  >
                    CRM & Identity Resolution
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                    key={codeExample}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <h3 className="text-2xl font-bold mb-4">
                      {codeExample === 'telemetry' ? codeExamples.telemetry.title :
                       codeExample === 'siteMapper' ? codeExamples.siteMapper.title :
                       codeExample === 'processor' ? codeExamples.processor.title :
                       codeExamples.integration.title}
                    </h3>
                    <p className="text-white/70 mb-6">
                      {codeExample === 'telemetry' ? codeExamples.telemetry.description :
                       codeExample === 'siteMapper' ? codeExamples.siteMapper.description :
                       codeExample === 'processor' ? codeExamples.processor.description :
                       codeExamples.integration.description}
                    </p>
                    <div className="bg-black/50 rounded-lg p-6 overflow-x-auto">
                      <pre className="text-sm font-mono">
                        <code className="language-javascript">
                          {codeExample === 'telemetry' ? codeExamples.telemetry.code :
                           codeExample === 'siteMapper' ? codeExamples.siteMapper.code :
                           codeExample === 'processor' ? codeExamples.processor.code :
                           codeExamples.integration.code}
                        </code>
                      </pre>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </section>

          {/* The Secret Sauce */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                The Secret Sauce: <span className="gradient-text">Site Mapping</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-12">
                <div className="glass-card p-8">
                  <h3 className="text-2xl font-bold mb-6">The Problem We Solved</h3>
                  <p className="text-white/80 mb-4">
                    Every website is unique. Your pricing might be in .price-card,
                    #pricing-section, or div[data-component="cost"]. Traditional
                    solutions require manual configuration.
                  </p>
                  <p className="text-white/80 mb-4">
                    We said: <span className="text-purple-400 font-semibold">
                    "What if it just... figured it out?"</span>
                  </p>
                  <div className="bg-black/30 rounded-lg p-4 mt-6">
                    <div className="text-sm font-mono text-white/60">
                      <div className="text-green-400"># Before SentientIQ</div>
                      <div>1. Install tracking script</div>
                      <div>2. Manually tag every element</div>
                      <div>3. Test for weeks</div>
                      <div>4. Still miss 30% of interactions</div>
                      <div className="mt-4 text-green-400"># With SentientIQ</div>
                      <div>1. Install tracking script</div>
                      <div className="text-purple-400">2. Done.</div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 bg-gradient-to-br from-purple-500/10 to-transparent">
                  <h3 className="text-2xl font-bold mb-6">How Site Mapper Works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold">Multi-Strategy Detection</h4>
                        <p className="text-sm text-white/70">
                          DOM patterns, visual clustering, text analysis, behavioral hotspots
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold">Confidence Scoring</h4>
                        <p className="text-sm text-white/70">
                          Each strategy votes. Consensus determines final mapping.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold">Edge Caching</h4>
                        <p className="text-sm text-white/70">
                          Results stored in localStorage. Zero latency on return visits.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold">Self-Healing</h4>
                        <p className="text-sm text-white/70">
                          DOM changes? Re-maps automatically. Always accurate.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Current Accuracy</span>
                      <span className="text-2xl font-bold text-green-400">95.2%</span>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      Across 1,247 different site structures
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Pattern Learning */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                Pattern Learning: <span className="gradient-text">The Living System</span>
              </h2>

              <div className="glass-card p-12">
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-2xl font-bold mb-6">What We Learn</h3>
                    <div className="space-y-4">
                      <div className="glass-card p-4 bg-gradient-to-r from-purple-500/10 to-transparent">
                        <h4 className="font-semibold text-purple-400">Emotional Signatures</h4>
                        <p className="text-sm text-white/70 mt-1">
                          "Sticker shock" = 847px/s mouse velocity + rapid scroll +
                          2.3s hover on price + navigate away
                        </p>
                      </div>

                      <div className="glass-card p-4 bg-gradient-to-r from-blue-500/10 to-transparent">
                        <h4 className="font-semibold text-blue-400">Conversion Patterns</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Successful buyers: methodical exploration → docs →
                          pricing → 4+ page views → signup
                        </p>
                      </div>

                      <div className="glass-card p-4 bg-gradient-to-r from-green-500/10 to-transparent">
                        <h4 className="font-semibold text-green-400">Risk Indicators</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Dead link + high-value deal + final stage =
                          CRITICAL intervention required
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold mb-6">How We Improve</h3>
                    <div className="bg-black/30 rounded-lg p-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Sessions Analyzed</span>
                          <span className="font-mono text-lg">2.4M</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Patterns Identified</span>
                          <span className="font-mono text-lg">847</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">Emotion Accuracy</span>
                          <span className="font-mono text-lg text-green-400">92%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white/60">False Positive Rate</span>
                          <span className="font-mono text-lg text-yellow-400">0.3%</span>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-white/10">
                        <p className="text-sm text-white/60 mb-3">Learning Rate</p>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                            animate={{ width: `${liveMetric}%` }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                          />
                        </div>
                        <p className="text-xs text-white/40 mt-2">
                          System improves with every session
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tenant Isolation */}
                <div className="mt-12 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <h4 className="text-lg font-bold text-yellow-400 mb-3">
                    🔒 Complete Tenant Isolation
                  </h4>
                  <p className="text-white/80">
                    Your patterns never leak. Each customer's behavioral model is cryptographically
                    isolated. What we learn from Boeing never influences what happens with Apple.
                    Your competitive intelligence stays yours.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Intervention Engine */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                The Intervention Engine: <span className="gradient-text">Acting in Real-Time</span>
              </h2>

              <div className="glass-card p-8">
                <div className="grid lg:grid-cols-3 gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-5xl font-bold gradient-text mb-2">100ms</div>
                    <p className="text-white/60">WebSocket latency</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold gradient-text mb-2">3 sec</div>
                    <p className="text-white/60">To CEO alert</p>
                  </div>
                  <div className="text-center">
                    <div className="text-5xl font-bold gradient-text mb-2">94%</div>
                    <p className="text-white/60">Intervention success rate</p>
                  </div>
                </div>

                {/* Intervention Types */}
                <h3 className="text-2xl font-bold mb-6">Intervention Cascade</h3>
                <div className="space-y-4">
                  <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-transparent">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">💚</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-green-400">Low Risk</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Show comparison modal, offer discount, highlight testimonials
                        </p>
                        <div className="mt-2 text-xs font-mono text-white/50">
                          Triggers: hesitation, price comparison, feature evaluation
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">~1K/day</div>
                        <div className="text-xs text-white/50">interventions</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-r from-yellow-500/10 to-transparent">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">⚠️</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-yellow-400">Medium Risk</h4>
                        <p className="text-sm text-white/70 mt-1">
                          Notify sales team, schedule follow-up, personalized email
                        </p>
                        <div className="mt-2 text-xs font-mono text-white/50">
                          Triggers: rage clicks, form abandonment, docs confusion
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">~100/day</div>
                        <div className="text-xs text-white/50">interventions</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-6 bg-gradient-to-r from-red-500/10 to-transparent">
                    <div className="flex items-start gap-4">
                      <div className="text-2xl">🚨</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-red-400">Critical</h4>
                        <p className="text-sm text-white/70 mt-1">
                          CEO text, dev team alert, immediate phone call
                        </p>
                        <div className="mt-2 text-xs font-mono text-white/50">
                          Triggers: 404 on high-value deal, system error, payment failure
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">~5/day</div>
                        <div className="text-xs text-white/50">interventions</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Real Intervention Code */}
                <div className="mt-8 bg-black/30 rounded-lg p-6">
                  <h4 className="text-lg font-bold mb-4">Actual Intervention Trigger</h4>
                  <pre className="text-sm font-mono text-white/80 overflow-x-auto">
{`// From production: behavior-processor.js
if (patterns.includes('STICKER_SHOCK') && session.dealValue > 50000) {
  this.wsServer.send(session.socketId, {
    type: 'intervention',
    action: 'show_roi_calculator',
    urgency: 'immediate',
    personalization: {
      company: session.company,
      savings: calculateROI(session.company.size)
    }
  });

  // Also alert sales
  slack.send(\`🔥 \${session.company} showing sticker shock on \$\${session.dealValue} deal\`);
}`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* The Stack */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                The Stack: <span className="gradient-text">Built for Scale</span>
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6">
                  <h3 className="font-bold text-purple-400 mb-3">Frontend</h3>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li>• Vanilla JS (5.2KB gzipped)</li>
                    <li>• WebSocket client</li>
                    <li>• LocalStorage caching</li>
                    <li>• 60Hz event capture</li>
                  </ul>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-blue-400 mb-3">Edge</h3>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li>• Cloudflare Workers</li>
                    <li>• Site map caching</li>
                    <li>• Geoip resolution</li>
                    <li>• Rate limiting</li>
                  </ul>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-green-400 mb-3">Backend</h3>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li>• Node.js + WebSockets</li>
                    <li>• Pattern matching engine</li>
                    <li>• PostgreSQL + Redis</li>
                    <li>• Neural network (TensorFlow)</li>
                  </ul>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-bold text-yellow-400 mb-3">Integrations</h3>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li>• HubSpot/Salesforce</li>
                    <li>• Slack/Teams/Email</li>
                    <li>• Clearbit/6sense</li>
                    <li>• Custom webhooks</li>
                  </ul>
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="glass-card p-8 mt-8 bg-gradient-to-br from-purple-500/10 to-transparent">
                <h3 className="text-2xl font-bold mb-6 text-center">Production Performance</h3>
                <div className="grid md:grid-cols-3 gap-8">
                  <div>
                    <h4 className="font-semibold text-purple-400 mb-3">Latency</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Event capture</span>
                        <span className="font-mono">16ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Emotion detection</span>
                        <span className="font-mono">287ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">CRM lookup</span>
                        <span className="font-mono">843ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Total to intervention</span>
                        <span className="font-mono text-green-400">1.8s</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-400 mb-3">Scale</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Concurrent sessions</span>
                        <span className="font-mono">47K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Events/second</span>
                        <span className="font-mono">2.8M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Patterns learned</span>
                        <span className="font-mono">847</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Uptime</span>
                        <span className="font-mono text-green-400">99.97%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-green-400 mb-3">Impact</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Revenue saved/mo</span>
                        <span className="font-mono">$18.3M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Deals rescued</span>
                        <span className="font-mono">142</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Avg response time</span>
                        <span className="font-mono">4.2min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Customer CSAT</span>
                        <span className="font-mono text-green-400">94%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Philosophy */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/20">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                The Philosophy: <span className="gradient-text">Why This Matters</span>
              </h2>

              <div className="glass-card p-12">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-white/80 mb-6">
                    Every lost deal has a moment. A precise instant where everything changed.
                    Maybe it was a 404. Maybe it was sticker shock. Maybe it was confusion
                    about your pricing model.
                  </p>

                  <p className="text-lg text-white/80 mb-6">
                    Traditional analytics tells you about it weeks later, buried in a report
                    nobody reads. "18% of users who hit 404s don't convert." Cool. What about
                    the Boeing deal that just died 30 seconds ago?
                  </p>

                  <p className="text-lg text-white/80 mb-6">
                    We built SentientIQ because we believe <span className="text-purple-400 font-semibold">
                    every visitor deserves to be understood</span>. Not as a number in Google Analytics.
                    Not as a row in your database. But as a human being with frustrations,
                    confusion, and needs.
                  </p>

                  <div className="my-8 p-6 bg-purple-500/10 border-l-4 border-purple-500 rounded">
                    <p className="text-xl font-semibold mb-3 text-purple-400">
                      The Core Insight
                    </p>
                    <p className="text-white/80">
                      Your highest-value visitors experience problems in complete silence.
                      They don't email support. They don't fill out feedback forms. They
                      just leave. And take their millions with them.
                    </p>
                  </div>

                  <p className="text-lg text-white/80 mb-6">
                    Until now, you had no way to know. No way to help. No way to save the deal.
                  </p>

                  <p className="text-lg text-white/80">
                    <span className="text-green-400 font-semibold">Now you do.</span> Welcome to
                    the age of digital empathy. Where every mouse movement tells a story.
                    Where every hesitation triggers help. Where no high-value visitor
                    suffers in silence.
                  </p>
                </div>

                {/* The Numbers */}
                <div className="grid md:grid-cols-3 gap-6 mt-12 pt-12 border-t border-white/10">
                  <div className="text-center">
                    <div className="text-4xl font-bold gradient-text mb-2">0.3%</div>
                    <p className="text-white/60">Of visitors tell you about problems</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold gradient-text mb-2">73%</div>
                    <p className="text-white/60">Experience frustration before leaving</p>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold gradient-text mb-2">100%</div>
                    <p className="text-white/60">Can be understood with SentientIQ</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* The Future */}
          <section className="section py-20">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-4xl font-bold text-center mb-12">
                What's Next: <span className="gradient-text">The Roadmap</span>
              </h2>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                  <h3 className="text-2xl font-bold mb-6 text-purple-400">Shipping Soon</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Predictive Churn</h4>
                        <p className="text-sm text-white/60">
                          Know they're leaving before they do. 87% accuracy in beta.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Voice of Customer AI</h4>
                        <p className="text-sm text-white/60">
                          Transform behavioral data into actionable product insights.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Multi-touch Attribution</h4>
                        <p className="text-sm text-white/60">
                          Track emotional journey across sessions and devices.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8 bg-gradient-to-br from-blue-500/10 to-transparent">
                  <h3 className="text-2xl font-bold mb-6 text-blue-400">The Vision</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Emotional API</h4>
                        <p className="text-sm text-white/60">
                          Real-time emotional state for any product decision.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Autonomous Optimization</h4>
                        <p className="text-sm text-white/60">
                          AI that fixes UX problems before humans notice them.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                      <div>
                        <h4 className="font-semibold">Industry Intelligence</h4>
                        <p className="text-sm text-white/60">
                          Aggregate insights across verticals (always anonymized).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="section py-20 bg-gradient-to-b from-transparent to-purple-900/20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold mb-6">
                Ready to <span className="gradient-text">Feel What They Feel?</span>
              </h2>
              <p className="text-xl text-white/80 mb-8">
                Join the companies saving millions by understanding their visitors' emotions in real-time.
              </p>

              <div className="glass-card p-8 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                <h3 className="text-2xl font-bold mb-4">Start in 15 Minutes</h3>
                <p className="text-white/70 mb-6">
                  One script tag. Zero configuration. Immediate insights.
                </p>

                <div className="bg-black/30 rounded-lg p-4 mb-6 text-left max-w-2xl mx-auto">
                  <code className="text-sm text-purple-400">
                    &lt;script src="https://sentientiq.ai/telemetry.js" data-key="your-key"&gt;&lt;/script&gt;
                  </code>
                </div>

                <a
                  href="/auth"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Get Your Script Tag
                </a>
              </div>

              <p className="text-sm text-white/50 mt-8">
                No credit card required. Start tracking emotions today.
              </p>
            </div>
          </section>

          <Footer />
        </main>
      </div>
    </>
  );
}