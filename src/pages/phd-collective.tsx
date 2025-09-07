import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Brain } from 'lucide-react';
import PageHeader from '../components/PageHeader';
// import { useUser } from '@clerk/clerk-react';
import { useTrackUsage, useSubscription } from '../hooks/useSubscription';
import { ssePost } from '../utils/ssePost';

// The 12 PhD Faculty
const PHD_FACULTY = [
  {
    id: 'cmo',
    name: 'Dr. Strategic',
    title: 'Chief Marketing Officer',
    degree: 'PhD Marketing Strategy, Wharton',
    specialty: 'Market orchestration & resource allocation',
    icon: '👔',
    catchphrase: 'Revenue is a lagging indicator of emotion',
    color: 'from-purple-900 to-indigo-900'
  },
  {
    id: 'psychology',
    name: 'Dr. Emotion',
    title: 'Consumer Psychology',
    degree: 'PhD Behavioral Economics, Stanford',
    specialty: 'Emotional triggers & decision architecture',
    icon: '🧠',
    catchphrase: 'They buy feelings, not features',
    color: 'from-pink-600 to-rose-600'
  },
  {
    id: 'data',
    name: 'Dr. Pattern',
    title: 'Data Science Lead',
    degree: 'PhD Machine Learning, MIT',
    specialty: 'Predictive modeling & anomaly detection',
    icon: '📊',
    catchphrase: 'The data never lies, but it often misleads',
    color: 'from-blue-600 to-cyan-600'
  },
  {
    id: 'identity',
    name: 'Dr. Identity',
    title: 'CDP Architect',
    degree: 'PhD Information Systems, Carnegie Mellon',
    specialty: 'Identity resolution & data unification',
    icon: '🔍',
    catchphrase: 'One customer, infinite signals',
    color: 'from-green-600 to-emerald-600'
  },
  {
    id: 'creative',
    name: 'Dr. Chaos',
    title: 'Creative Mutation',
    degree: 'PhD Cognitive Science, Berkeley',
    specialty: 'Creative optimization & A/B evolution',
    icon: '🎨',
    catchphrase: 'Best practices are where innovation goes to die',
    color: 'from-orange-600 to-yellow-600'
  },
  {
    id: 'budget',
    name: 'Dr. ROI',
    title: 'Budget Optimization',
    degree: 'PhD Financial Engineering, Chicago',
    specialty: 'Resource allocation & efficiency metrics',
    icon: '💰',
    catchphrase: 'Every dollar has an emotion attached',
    color: 'from-yellow-600 to-amber-600'
  },
  {
    id: 'competitive',
    name: 'Dr. Warfare',
    title: 'Competitive Intelligence',
    degree: 'PhD Strategic Management, INSEAD',
    specialty: 'Market dynamics & competitive positioning',
    icon: '⚔️',
    catchphrase: 'Your competition is already using AI wrong',
    color: 'from-red-600 to-red-800'
  },
  {
    id: 'channel',
    name: 'Dr. Omni',
    title: 'Channel Optimizer',
    degree: 'PhD Media Studies, Northwestern',
    specialty: 'Cross-channel orchestration & attribution',
    icon: '📡',
    catchphrase: 'Channels are dead, experiences are forever',
    color: 'from-teal-600 to-blue-600'
  },
  {
    id: 'onboarding',
    name: 'Dr. First',
    title: 'Onboarding Intelligence',
    degree: 'PhD User Experience, Michigan',
    specialty: 'First impressions & activation metrics',
    icon: '🚀',
    catchphrase: 'You have 3 seconds to matter',
    color: 'from-indigo-600 to-purple-600'
  },
  {
    id: 'attribution',
    name: 'Dr. Truth',
    title: 'Attribution Science',
    degree: 'PhD Statistical Analysis, Harvard',
    specialty: 'Multi-touch attribution & causality',
    icon: '🎯',
    catchphrase: 'Last-click attribution is astrology for marketers',
    color: 'from-gray-600 to-gray-800'
  },
  {
    id: 'sage',
    name: 'Dr. Brutal',
    title: 'Sage Intelligence',
    degree: 'PhD Philosophy of Mind, Oxford',
    specialty: 'Uncomfortable truths & reality checks',
    icon: '🔮',
    catchphrase: 'Your KPIs are lying to make you feel better',
    color: 'from-purple-800 to-pink-800'
  },
  {
    id: 'learning',
    name: 'Dr. Context',
    title: 'Learning Engine',
    degree: 'PhD Neural Networks, Toronto',
    specialty: 'Pattern learning & adaptation',
    icon: '🧬',
    catchphrase: 'Every interaction teaches us who you really are',
    color: 'from-emerald-600 to-teal-600'
  }
];

const PhDCollective: React.FC = () => {
  // const user = useUser();
  const { trackQuestion } = useTrackUsage();
  const subscription = useSubscription();
  const [selectedPhDs, setSelectedPhDs] = useState<Set<string>>(new Set()); // Start with none selected
  const [question, setQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debateResults, setDebateResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  // const [freeQuestionsRemaining, setFreeQuestionsRemaining] = useState<number>(() => {
  //   const stored = localStorage.getItem('free_questions_remaining');
  //   return stored ? parseInt(stored, 10) : 20;
  // });
  // Business context removed - can be added back when needed
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Neural Network Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Neural network nodes
    const nodes: { x: number; y: number; vx: number; vy: number; connections: number[] }[] = [];
    const nodeCount = 120; // Many more nodes for depth
    const connectionDistance = 150; // Shorter connections for more intricate web

    // Initialize nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15, // Slower movement for elegance
        vy: (Math.random() - 0.5) * 0.15,
        connections: []
      });
    }

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 20, 0.03)'; // Darker fade for blue theme
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Find connections
        node.connections = [];
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = other.x - node.x;
            const dy = other.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < connectionDistance) {
              node.connections.push(j);
              
              // Draw connection with gradient
              const opacity = (1 - distance / connectionDistance) * 0.3;
              const gradient = ctx.createLinearGradient(node.x, node.y, other.x, other.y);
              gradient.addColorStop(0, `rgba(59, 130, 246, ${opacity})`); // Blue
              gradient.addColorStop(1, `rgba(147, 51, 234, ${opacity})`); // Purple
              ctx.strokeStyle = gradient;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }
        });

        // Draw node with glow
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8);
        glow.addColorStop(0, 'rgba(147, 197, 253, 0.8)');
        glow.addColorStop(1, 'rgba(147, 197, 253, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2); // Much smaller glow
        ctx.fill();
        
        // Core node
        ctx.fillStyle = 'rgba(147, 197, 253, 1)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 0.8, 0, Math.PI * 2); // Tiny core nodes
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const togglePhD = (id: string) => {
    const newSelected = new Set(selectedPhDs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPhDs(newSelected);
  };

  const selectAll = () => {
    console.log('Selecting all PhDs');
    const allIds = PHD_FACULTY.map(phd => phd.id);
    console.log('All IDs:', allIds);
    const newSet = new Set(allIds);
    console.log('New Set size:', newSet.size);
    setSelectedPhDs(newSet);
    // Force a check after state update
    setTimeout(() => {
      console.log('Selected PhDs after update:', selectedPhDs.size);
    }, 100);
  };

  const clearAll = () => {
    console.log('Clearing all selections');
    setSelectedPhDs(new Set());
  };

  const askAdvisors = async () => {
    if (!question.trim() || selectedPhDs.size === 0) return;

    // Check subscription limits (all users must be authenticated)
    if (!subscription.canAsk) {
      if (subscription.tier === 'free') {
        alert('You\'ve used all 20 free questions! Upgrade to Pro for unlimited access.');
      } else {
        alert(`You've reached your monthly limit of ${subscription.questionsLimit} questions. Please upgrade your plan to continue.`);
      }
      window.location.href = '/billing';
      return;
    }

    setIsAnalyzing(true);
    setShowResults(false);
    setDebateResults(null);

    // Track usage (all users are authenticated)
    await trackQuestion();

    // Add to conversation history
    const newQuestion = {
      type: 'question',
      content: question,
      timestamp: new Date().toISOString()
    };
    
    // Clear the input field
    setQuestion('');

    try {
      // Map selected PhD IDs to their persona names for the boardroom
      const personas = Array.from(selectedPhDs).map(id => {
        const phd = PHD_FACULTY.find(p => p.id === id);
        return phd ? phd.name.replace('Dr. ', '') : id;
      });
      
      // Build streaming response
      let synthesis = '';
      const panels: Record<string, string> = {};
      
      await ssePost(`/api/sage/debate`, {
        prompt: question,
        personas: personas.length > 0 ? personas : undefined, // Let server default if none selected
        topK: 4
      }, ({ event, data }) => {
        if (event === 'accepted') {
          console.log('SSE connection accepted');
          return;
        }
        if (event === 'delta') {
          // Append text to the specific persona's panel
          const label = data.label;
          panels[label] = (panels[label] || '') + data.text;
          // Update the display with accumulated text
          synthesis = Object.entries(panels)
            .map(([persona, text]) => `**${persona}:**\n${text}`)
            .join('\n\n---\n\n');
          setDebateResults({ collective_synthesis: synthesis });
          return;
        }
        if (event === 'phase') {
          console.log('Phase update:', data);
          return;
        }
        if (event === 'error') {
          console.error('SSE error:', data);
          return;
        }
        if (event === 'done') {
          console.log('SSE stream complete');
          setShowAnnouncement(true);
          setTimeout(() => {
            setShowAnnouncement(false);
            setShowResults(true);
          }, 2500);
          return;
        }
      });
      
      // Store in Supabase for persistence
      const newResponse = {
        type: 'response',
        content: { collective_synthesis: synthesis },
        timestamp: new Date().toISOString()
      };
      storeConversation(newQuestion, newResponse);
    } catch (error) {
      console.error('Advisory session failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const storeConversation = async (question: any, response: any) => {
    // TODO: Store in Supabase for context persistence
    console.log('Storing conversation for future context:', { question, response });
  };


  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Neural Network Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 opacity-20" // More subtle neural network
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Luxe backlighting effect - INTENSE DEPTH */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Primary INTENSE backlight - behind cards */}
        <div className="absolute top-[30%] left-[15%] w-[400px] h-[400px]">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-purple-400/15 to-transparent rounded-full blur-[60px] animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-transparent to-transparent rounded-full blur-[100px]" />
        </div>
        
        {/* Secondary INTENSE backlight - right side */}
        <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px]">
          <div className="absolute inset-0 bg-gradient-to-tl from-cyan-400/20 via-blue-400/15 to-transparent rounded-full blur-[50px] animate-pulse" style={{animationDelay: '1s'}} />
          <div className="absolute inset-0 bg-gradient-to-tl from-cyan-300/10 via-transparent to-transparent rounded-full blur-[90px]" />
        </div>
        
        {/* Center POWER light - brightest, shines through everything */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px]">
          <div className="absolute inset-0 bg-gradient-radial from-white/8 via-indigo-300/5 to-transparent rounded-full blur-[40px]" />
          <div className="absolute inset-0 bg-gradient-radial from-indigo-400/10 via-transparent to-transparent rounded-full blur-[80px] animate-pulse" style={{animationDuration: '3s'}} />
        </div>
        
        {/* Spotlight effects - smaller, brighter, strategic placement */}
        <div className="absolute top-[25%] left-[40%] w-[200px] h-[200px] bg-gradient-radial from-pink-300/15 to-transparent rounded-full blur-[30px]" />
        <div className="absolute bottom-[30%] right-[35%] w-[250px] h-[250px] bg-gradient-radial from-amber-300/12 to-transparent rounded-full blur-[40px]" />
        <div className="absolute top-[60%] left-[25%] w-[180px] h-[180px] bg-gradient-radial from-emerald-300/10 to-transparent rounded-full blur-[35px]" />
      </div>
      
      <div className="max-w-[1600px] mx-auto w-full px-4 md:px-6 lg:px-8">
        <div className="pt-8">
          <PageHeader 
            title="PhD Collective™" 
            subtitle="The $5.4 Million Payroll You'll Never Have to Pay"
          />
          
        </div>

        <div className="flex pb-8 flex-col lg:flex-row gap-6" style={{ height: 'calc(100vh - 10rem)' }}>
        
        {/* LEFT SIDE - PhD Cards Grid + Input */}
        <div className="lg:w-[720px] flex flex-col gap-4">
          {/* Selection Buttons */}
          <div className="flex gap-3 relative z-50">
            <button
              onClick={() => {
                console.log('BUTTON CLICKED - Summon All');
                selectAll();
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all text-sm"
            >
              Summon Entire Collective
            </button>
            <button
              onClick={() => {
                console.log('BUTTON CLICKED - Clear All');
                clearAll();
              }}
              className="px-3 py-1.5 bg-white/10 backdrop-blur-xl text-white/80 rounded-lg font-medium hover:bg-white/20 transition-all text-sm"
            >
              Clear Selection
            </button>
          </div>
          
          {/* PhD Cards Grid */}
          <div className="grid grid-cols-3 gap-4 overflow-y-auto overflow-x-hidden p-2 flex-1">
          {PHD_FACULTY.map((phd) => {
            const isSelected = selectedPhDs.has(phd.id);
            
            return (
              <motion.div
                key={phd.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => togglePhD(phd.id)}
                className={`relative cursor-pointer rounded-lg transition-all ${
                  isSelected 
                    ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-black/50' 
                    : 'ring-1 ring-white/10'
                }`}
              >
                <div className="backdrop-blur-xl bg-white/5 rounded-lg p-3 relative overflow-hidden h-[150px]">
                  {/* Selection Indicator */}
                  <div className="absolute top-2 right-2 z-20">
                    {isSelected ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <div className="h-5 w-5 border border-white/30 rounded-full" />
                    )}
                  </div>

                  {/* PhD Info - Ultra Compressed */}
                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex items-start gap-1.5">
                      <div className="text-xl leading-none">{phd.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-xs truncate pr-4">{phd.name}</h3>
                        <p className="text-white/50 text-[10px] truncate">{phd.title}</p>
                      </div>
                    </div>
                    
                    {/* Specialty - Bottom */}
                    <div className="mt-auto pt-1 border-t border-white/10">
                      <p className="text-white/60 text-[10px] leading-snug line-clamp-2">{phd.specialty}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
          
          {/* Input Field - Below Grid, Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-xl p-3 relative z-50"
          >
            <textarea
              placeholder="e.g., 'Should we launch before Black Friday?'"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-black/30 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-2"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  console.log('SUBMIT CLICKED!');
                  console.log('Question:', question);
                  console.log('Selected PhDs:', Array.from(selectedPhDs));
                  console.log('Selected PhDs size:', selectedPhDs.size);
                  console.log('Is Analyzing:', isAnalyzing);
                  askAdvisors();
                }}
                disabled={isAnalyzing || selectedPhDs.size === 0 || !question.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={`Analyzing: ${isAnalyzing}, PhDs: ${selectedPhDs.size}, Question: ${question ? question.length : 0} chars`}
              >
                {isAnalyzing ? 'Analyzing...' : 'Start a Debate'}
              </button>
              
              <div className="ml-4 text-xs text-white/40">
                Tip: Cmd + Enter to ask
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE - Full Height Output Area */}
        <div className="flex-1 relative z-20">
          <div className="h-full">
            
            {/* Full Height Output Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full bg-white/5 backdrop-blur-xl rounded-xl p-6 overflow-y-auto"
            >
              {showAnnouncement ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex items-center justify-center h-full"
                >
                  <div className="text-center">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2"
                    >
                      The Collective Has Spoken
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                      className="text-white/60 text-sm"
                    >
                      Preparing wisdom...
                    </motion.div>
                  </div>
                </motion.div>
              ) : showResults && debateResults ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-white/60 text-xs mb-3"
                  >
                    COLLECTIVE SYNTHESIS
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/90 text-sm leading-relaxed"
                  >
                    {debateResults.collective_synthesis || 
                     debateResults.synthesis || 
                     debateResults.message || 
                     JSON.stringify(debateResults, null, 2)}
                  </motion.div>
                  
                  {/* Emotional State Badge */}
                  {(debateResults.debate?.analysis?.emotional_state || 
                    debateResults.debate?.perspectives?.[0]?.analysis?.emotional_state) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 pt-4 border-t border-white/10"
                    >
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 animate-pulse" />
                        <span className="text-xs font-medium text-white/90">
                          {debateResults.debate?.analysis?.emotional_state || 
                           debateResults.debate?.perspectives?.[0]?.analysis?.emotional_state}
                        </span>
                        <span className="text-xs text-white/60">
                          {Math.round((debateResults.debate?.analysis?.emotional_confidence || 
                                      debateResults.debate?.perspectives?.[0]?.analysis?.emotional_confidence || 0.85) * 100)}% confidence
                        </span>
                      </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="text-white/40 text-sm text-center flex flex-col items-center justify-center h-full">
                  {isAnalyzing ? (
                    <>
                      <Brain className="w-12 h-12 text-purple-400/30 mb-4 animate-pulse" />
                      <div className="mb-2">The faculty is deliberating...</div>
                      <div className="text-xs">This may take a moment</div>
                    </>
                  ) : (
                    <>
                      <Brain className="w-16 h-16 text-purple-400/20 mb-4" />
                      <div className="text-white/60 text-sm mb-2">The faculty is ready...</div>
                      <div className="text-white/80 text-lg">Ask a question to begin the debate.</div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default PhDCollective;
