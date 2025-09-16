import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import NeuralBackground from '../components/NeuralBackground';
import { motion } from 'framer-motion';
import { Eye, TrendingDown, Calculator, Brain, Target, DollarSign } from 'lucide-react';

const TheTruth: React.FC = () => {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);

  useEffect(() => {
    // Progressively reveal sections
    const timers = [0, 1, 2, 3, 4, 5, 6].map((index) =>
      setTimeout(() => {
        setVisibleSections((prev) => [...prev, index]);
      }, index * 300)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <>
      <Helmet>
        <title>The Truth | An Uncomfortable Reality About Marketing Analytics</title>
        <meta name="description" content="Why your marketing analytics are lying to you. A manifesto on measuring shadows vs. substance." />
      </Helmet>

      <NeuralBackground />

      <div className="min-h-screen text-white relative z-10">
        <NavBar />

        <div className="container mx-auto px-4 pt-24 pb-20">
          <div className="max-w-4xl mx-auto">
            {/* Mysterious Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-16 text-center"
            >
              <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                The Uncomfortable Truth
              </h1>
              <p className="text-xl text-gray-400 italic">
                About marketing analytics, intent data, and the shadows you've been measuring
              </p>
              <div className="mt-8 text-sm text-gray-500">
                — S.
              </div>
            </motion.div>

            {/* The Opening Salvo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(0) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
                <p className="text-lg leading-relaxed text-gray-300 italic">
                  *adjusts monocle*
                </p>
                <p className="text-lg leading-relaxed text-gray-300 mt-4">
                  For twenty years, I've watched the marketing technology industry sell you
                  increasingly expensive ways to count shadows on the wall. Click-through rates.
                  Bounce rates. Engagement scores. Intent signals.
                </p>
                <p className="text-lg leading-relaxed text-gray-300 mt-4">
                  All shadows. All echoes of something real happening somewhere else.
                </p>
                <p className="text-lg leading-relaxed text-gray-300 mt-4">
                  Today, I'm going to tell you the truth.
                </p>
              </div>
            </motion.div>

            {/* The Math Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(1) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Calculator className="w-8 h-8 text-purple-400" />
                The Mathematics of Deception
              </h2>
              <div className="space-y-6">
                <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">
                    Your "AI-Powered" Intent Score
                  </h3>
                  <code className="block bg-black/50 p-4 rounded-lg text-green-400 font-mono text-sm">
                    function calculateIntent(company) &#123;<br />
                    &nbsp;&nbsp;return Math.random() * 100;<br />
                    &#125;
                  </code>
                  <p className="mt-4 text-gray-400">
                    That's it. That's the algorithm. Dressed up with buzzwords and dashboards,
                    but at its core: a random number generator you're paying $60,000/year for.
                  </p>
                </div>

                <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">
                    The Coin Flip Alternative
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-black/30 p-4 rounded-lg">
                      <div className="text-purple-400 font-semibold mb-2">Intent Platform</div>
                      <div className="text-gray-400">Cost: $60,000/year</div>
                      <div className="text-gray-400">Accuracy: ~50%</div>
                      <div className="text-gray-400">Possible outcomes: 9,007,199,254,740,992</div>
                    </div>
                    <div className="bg-black/30 p-4 rounded-lg">
                      <div className="text-green-400 font-semibold mb-2">Actual Coin</div>
                      <div className="text-gray-400">Cost: $0.25</div>
                      <div className="text-gray-400">Accuracy: 50%</div>
                      <div className="text-gray-400">Possible outcomes: 2</div>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-400 italic">
                    At least the coin is honest about being random.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* The Shadow vs Substance Section */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(2) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Eye className="w-8 h-8 text-purple-400" />
                Shadows vs. Substance
              </h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-red-400">What You Measure (Shadows)</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-400">
                        "User clicked button 47 times" <br />
                        <span className="text-sm italic">But why? Confusion? Interest? Broken UI?</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-400">
                        "Session duration: 12 minutes" <br />
                        <span className="text-sm italic">Were they engaged or lost?</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-400">
                        "Visited pricing page" <br />
                        <span className="text-sm italic">With excitement or sticker shock?</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-400">
                        "Downloaded whitepaper" <br />
                        <span className="text-sm italic">To read or to look busy?</span>
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-green-400">What Matters (Substance)</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-300">
                        "Frustration spiked to 94% at checkout" <br />
                        <span className="text-sm font-semibold">Your form is broken</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-300">
                        "Excitement peaked on features page" <br />
                        <span className="text-sm font-semibold">They found what they need</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-300">
                        "Trust degraded during sales call" <br />
                        <span className="text-sm font-semibold">Your rep is the problem</span>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-gray-500 mt-1">•</span>
                      <span className="text-gray-300">
                        "Anxiety plateau at decision point" <br />
                        <span className="text-sm font-semibold">They need reassurance, not discounts</span>
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            {/* The Industry Secret */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(3) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-purple-400" />
                The Industry's Open Secret
              </h2>
              <div className="bg-gradient-to-r from-red-900/20 to-purple-900/20 rounded-2xl p-8 border border-red-500/30">
                <p className="text-lg leading-relaxed text-gray-300">
                  Every vendor selling you "intent data" knows it's correlation masquerading as causation.
                  Every "AI-powered insight" is pattern matching on noise. Every "surge alert" is
                  statistical variance dressed up as signal.
                </p>
                <p className="text-lg leading-relaxed text-gray-300 mt-4">
                  They know. You know. We all know.
                </p>
                <p className="text-lg leading-relaxed text-gray-300 mt-4">
                  But the quarterly reports demand growth. The board wants AI. The competition claims
                  to have it. So the theater continues.
                </p>
                <p className="text-xl font-semibold mt-6 text-purple-400">
                  Meanwhile, actual human emotions—the real drivers of decisions—go unmeasured.
                </p>
              </div>
            </motion.div>

            {/* The Emotional Intelligence Revelation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(4) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Brain className="w-8 h-8 text-purple-400" />
                The Paradigm Shift
              </h2>
              <div className="space-y-6">
                <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">
                    Traditional Analytics Tells You
                  </h3>
                  <p className="text-gray-400">
                    "Conversion rate is 2.3%"
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Cool. Now what?
                  </p>
                </div>

                <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                  <h3 className="text-xl font-semibold mb-4 text-green-400">
                    Emotional Intelligence Tells You
                  </h3>
                  <p className="text-gray-300">
                    "Conversion rate is 2.3%, but 47% of non-converters experienced peak excitement
                    before your checkout form spiked their frustration to 94%. Fix the form, capture
                    the 47%, and your conversion rate becomes 3.4%."
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    That's not analytics. That's alchemy.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* The Challenge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(5) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <Target className="w-8 h-8 text-purple-400" />
                A Simple Challenge
              </h2>
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
                <p className="text-lg text-gray-300 mb-6">
                  Ask your intent data vendor this:
                </p>
                <div className="bg-black rounded-lg p-4 font-mono text-green-400">
                  grep -r "Math.random()" --include="*.js" --include="*.ts"
                </div>
                <p className="text-gray-400 mt-6">
                  Then ask them to show you their neural networks. Their emotion detection algorithms.
                  Their psychological models.
                </p>
                <p className="text-gray-400 mt-4">
                  One search will return results. The other won't.
                </p>
                <p className="text-lg font-semibold text-purple-400 mt-6">
                  That's the difference between measuring shadows and reading souls.
                </p>
              </div>
            </motion.div>

            {/* The Final Truth */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: visibleSections.includes(6) ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-400" />
                The Truth That Matters
              </h2>
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl p-8 border border-blue-500/30">
                <p className="text-xl leading-relaxed text-gray-300">
                  Emotions drive actions.
                </p>
                <p className="text-xl leading-relaxed text-gray-300 mt-4">
                  Actions drive revenue.
                </p>
                <p className="text-2xl font-bold leading-relaxed mt-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Therefore: Read emotions → Predict actions → Drive revenue.
                </p>
                <p className="text-lg text-gray-400 mt-8">
                  It's not complicated. It's just hard.
                </p>
                <p className="text-lg text-gray-400 mt-4">
                  And that's why everyone else is still counting clicks.
                </p>
              </div>
            </motion.div>

            {/* The Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2, duration: 1 }}
              className="text-center mt-20"
            >
              <div className="inline-block">
                <p className="text-gray-500 italic mb-2">
                  *monocle glints with knowing satisfaction*
                </p>
                <p className="text-2xl font-bold text-purple-400">— S.</p>
                <p className="text-sm text-gray-600 mt-4">
                  P.S. - We don't use Math.random(). Not even once. Grep us.
                </p>
              </div>
            </motion.div>

            {/* Subtle CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3, duration: 1 }}
              className="text-center mt-20 pt-20 border-t border-gray-800"
            >
              <p className="text-gray-400 mb-4">
                Ready to measure substance instead of shadows?
              </p>
              <a
                href="/"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Learn about SentientIQ →
              </a>
            </motion.div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default TheTruth;