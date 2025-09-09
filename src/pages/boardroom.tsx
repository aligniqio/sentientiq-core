import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { track } from '../lib/track';
import { ssePost } from '../utils/ssePost';
import { AgentCard } from '../components/AgentCard';
import { PERSONA_META } from '../personas/meta';
import { StreamingText } from '../components/StreamingText';

interface DebateLine {
  id: string;
  speaker: string;
  text: string;
  completed?: boolean;
  visible?: boolean;
  isInterruption?: boolean;
  interrupted?: string;
}

// Get persona IDs from metadata
const PERSONA_IDS = Object.keys(PERSONA_META);

// Unique colors for each persona
const PERSONA_COLORS: Record<string, string> = {
  // Old persona names (for compatibility)
  'ROI Analyst': 'text-green-400',
  'Emotion Scientist': 'text-blue-400', 
  'CRO Specialist': 'text-orange-400',
  'Copy Chief': 'text-pink-400',
  // Dr. personas with colors
  'Strategic': 'text-purple-400',
  'Emotion': 'text-pink-400',
  'Pattern': 'text-blue-400',
  'Identity': 'text-emerald-400',
  'Chaos': 'text-orange-400',
  'ROI': 'text-amber-400',
  'Warfare': 'text-red-400',
  'Omni': 'text-teal-400',
  'First': 'text-indigo-400',
  'Truth': 'text-gray-400',
  'Brutal': 'text-violet-400',
  'Context': 'text-green-400',
  // System personas
  'Moderator': 'text-gray-300',
  'Synthesis': 'text-white',
  'Answer': 'text-white'
};

const Boardroom = () => {
  // const { user } = useUser(); // Not needed with hardcoded tenant ID
  // const subscription = useSubscription();
  const [selectedPhDs, setSelectedPhDs] = useState<Set<string>>(new Set()); // Start with none selected
  const [question, setQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debateResults, setDebateResults] = useState<any>(null);
  const [debateLines, setDebateLines] = useState<DebateLine[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [flashAll, setFlashAll] = useState(false);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(0);
  const [debateMode, setDebateMode] = useState<'answer' | 'debate'>('answer');
  // const [freeQuestionsRemaining, setFreeQuestionsRemaining] = useState<number>(() => {
  //   const stored = localStorage.getItem('free_questions_remaining');
  //   return stored ? parseInt(stored, 10) : 20;
  // });
  // Business context removed - can be added back when needed
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keyboard shortcut for Get Answer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isAnalyzing && question.trim()) {
        e.preventDefault();
        runAnswer();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [question, isAnalyzing]);

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
    const allIds = PERSONA_IDS;
    console.log('All IDs:', allIds);
    const newSet = new Set(allIds);
    console.log('New Set size:', newSet.size);
    setSelectedPhDs(newSet);
    // Trigger flash animation
    setFlashAll(true);
    setTimeout(() => setFlashAll(false), 900);
    // Force a check after state update
    setTimeout(() => {
      console.log('Selected PhDs after update:', selectedPhDs.size);
    }, 100);
  };

  const clearAll = () => {
    console.log('Clearing all selections');
    setSelectedPhDs(new Set());
  };

  const runAnswer = async () => {
    if (!question.trim()) return;
    
    setIsAnalyzing(true);
    setShowResults(true); // Show results immediately to see streaming
    setDebateResults(null);
    setDebateLines([]); // Clear previous lines for new answer
    setCurrentTypingIndex(0); // Reset typing index
    setDebateMode('answer'); // Set to answer mode
    
    // Track usage (don't block on this)
    track('question_submitted', { personas: selectedPhDs.size, mode: 'answer' });
    
    const newQuestion = {
      type: 'question',
      content: question,
      timestamp: new Date().toISOString()
    };
    
    // Clear input
    setQuestion('');
    
    try {
      await ssePost(`/api/v1/debate`, {
        prompt: question,
        mode: 'answer',
        topK: 3,
        personas: Array.from(selectedPhDs), // Send selected personas for answer mode too
        tenantId: '7a6c61c4-95e4-4b15-94b8-02995f81c291' // Your enterprise tenant ID
      }, ({ event, data }) => {
        console.log('SSE Event:', event, data); // Debug all events
        if (event === 'meta') {
          console.log('Answer mode meta:', data);
        }
        if (event === 'delta') {
          console.log('Delta event received:', data);
          // Stream answers line by line just like debates
          const speaker = data.speaker || data.label || 'Answer';
          const text = data.text || '';
          if (text.trim()) {
            setDebateLines(prev => {
              // Check if last line is from same speaker
              const lastLine = prev[prev.length - 1];
              if (lastLine && lastLine.speaker === speaker) {
                // Append to existing speaker's text
                return prev.map((line, i) => 
                  i === prev.length - 1 
                    ? { ...line, text: line.text + ' ' + text }
                    : line
                );
              } else {
                // New speaker, create new line
                const newLine = {
                  id: `${Date.now()}-${Math.random()}`,
                  speaker: speaker,
                  text: text,
                  completed: false
                };
                return [...prev, newLine];
              }
            });
          }
        }
        if (event === 'synth') {
          // Handle synthesis if provided
          setDebateResults(data);
        }
        if (event === 'done') {
          setShowResults(true);
        }
      });
      
      // Store the streamed lines as conversation
      const fullDebate = debateLines.map(line => `${line.speaker}: ${line.text}`).join('\n');
      storeConversation(newQuestion, { type: 'response', content: { collective_synthesis: fullDebate }});
    } catch (error) {
      console.error('Answer failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runDebate = async () => {
    if (!question.trim() || selectedPhDs.size < 2) {
      console.log('Debate validation failed:', { question: question.trim(), selectedCount: selectedPhDs.size });
      
      // Easter egg for single agent "debates"
      if (selectedPhDs.size === 1 && question.trim()) {
        setDebateResults({ 
          collective_synthesis: `That's not really a debate, is it? More of a monologue. \n\nTry selecting at least 2 agents so they can actually disagree about something. The whole point is watching them argue - one PhD just agrees with themselves.` 
        });
        setShowResults(true);
      }
      return;
    }
    
    console.log('Starting debate with:', { question, selectedPhDs: Array.from(selectedPhDs) });
    
    setIsAnalyzing(true);
    setShowResults(false);
    setDebateResults(null);
    
    // Track usage (don't block on this)
    track('question_submitted', { personas: selectedPhDs.size, mode: 'answer' });
    
    const newQuestion = {
      type: 'question',
      content: question,
      timestamp: new Date().toISOString()
    };
    
    // Store question before clearing
    const questionToSend = question;
    
    // Clear input
    setQuestion('');
    
    try {
      // No longer buffering - streaming directly to UI
      
      // Map selected PhD IDs to persona names
      const personas = Array.from(selectedPhDs).map(id => {
        const persona = PERSONA_META[id];
        return persona ? persona.name.replace('Dr. ', '') : id;
      });
      
      console.log('Sending SSE request with:', { prompt: questionToSend, personas, mode: 'debate' });
      
      // Clear previous debate lines
      setDebateLines([]);
      setCurrentTypingIndex(0); // Reset typing index
      setDebateMode('debate'); // Set to debate mode
        setShowResults(true); // Show results immediately to see streaming
      
      await ssePost(`/api/v1/debate`, {
        prompt: questionToSend,
        personas: personas,
        mode: 'debate',
        topK: 3,
        tenantId: '7a6c61c4-95e4-4b15-94b8-02995f81c291' // Your enterprise tenant ID
      }, ({ event, data }) => {
        console.log('SSE event:', event, data);
        if (event === 'delta') {
          // Add each sentence as a new line immediately
          const speaker = data.speaker || data.label || 'System';
          const text = data.text || '';
          if (text.trim()) {
            setDebateLines(prev => {
              // Check if last line is from same speaker
              const lastLine = prev[prev.length - 1];
              if (lastLine && lastLine.speaker === speaker) {
                // Append to existing speaker's text
                return prev.map((line, i) => 
                  i === prev.length - 1 
                    ? { ...line, text: line.text + ' ' + text }
                    : line
                );
              } else {
                // New speaker, create new line
                const newLine = {
                  id: `${Date.now()}-${Math.random()}`,
                  speaker: speaker,
                  text: text,
                  completed: false
                };
                return [...prev, newLine];
              }
            });
          }
        }
        if (event === 'synth') {
          // Handle synthesis separately if needed
          setDebateResults(data);
        }
        if (event === 'done') {
          // Debate complete
          console.log('Debate complete');
        }
      });
      
      // Store the streamed lines as conversation
      const fullDebate = debateLines.map(line => `${line.speaker}: ${line.text}`).join('\n');
      storeConversation(newQuestion, { type: 'response', content: { collective_synthesis: fullDebate }});
    } catch (error) {
      console.error('Debate failed:', error);
      alert('Debate failed to start. Please try again.');
      setDebateResults({ collective_synthesis: 'Error: Could not start debate. Please try again.' });
      setShowResults(true);
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
      
      <div className="max-w-[1500px] mx-auto w-full px-4 md:px-6 lg:px-8">
        <div className="pt-8">
          <PageHeader 
            title="Boardroom" 
            subtitle="12 expert personas. One decisive answer."
          />
          
        </div>

        <div className="flex pb-8 flex-col lg:flex-row gap-6" style={{ height: 'calc(100vh - 10rem)' }}>
        
        {/* LEFT SIDE - PhD Cards Grid + Input */}
        <div className="lg:w-[800px] flex flex-col gap-4">
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
            {PERSONA_IDS.map((id) => (
              <AgentCard
                key={id}
                id={id}
                selected={selectedPhDs.has(id)}
                disabled={false}
                onToggle={(personaId) => togglePhD(personaId)}
                flashAll={flashAll}
              />
            ))}
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => runAnswer()}
                disabled={isAnalyzing || !question.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Get a focused plan in under 60s (⌘/Ctrl+Enter)"
              >
                {isAnalyzing ? 'Analyzing...' : 'Get Answer'}
              </button>
              
              <button
                onClick={() => runDebate()}
                disabled={isAnalyzing || selectedPhDs.size === 0 || !question.trim()}
                className="px-4 py-2 bg-white/10 backdrop-blur-xl text-green-400 rounded-lg font-medium hover:bg-white/20 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title={selectedPhDs.size === 0 ? "Select at least 1 agent" : selectedPhDs.size === 1 ? "This won't be much of a debate..." : "Watch specialists argue it out live"}
              >
                Start Debate
              </button>
              
              <div className="text-xs text-white/40">
                ⌘+Enter
              </div>
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE - Full Height Output Area */}
        <div className="lg:w-[600px] relative z-20">
          <div className="h-full">
            
            {/* Full Height Output Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="h-full bg-white/5 backdrop-blur-xl rounded-xl p-4 overflow-y-auto"
            >
              {isAnalyzing && debateLines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Brain className="w-12 h-12 text-purple-400/30 mb-4 animate-pulse" />
                  <div className="text-white/60 text-sm">The experts are thinking...</div>
                </div>
              ) : showResults ? (
                <>
                  {selectedPhDs.size === 12 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-white/60 text-xs mb-3"
                    >
                      COLLECTIVE SYNTHESIS
                    </motion.div>
                  )}
                  
                  {/* Stream debate lines as they arrive */}
                  <div className="space-y-4">
                    {debateLines.map((line, index) => (
                      <div
                        key={line.id}
                        className="text-white/90 text-xs"
                        style={{ 
                          opacity: index <= currentTypingIndex ? 1 : 0,
                          transition: 'opacity 0.3s ease-in'
                        }}
                      >
                        {index <= currentTypingIndex && (
                          <div className="flex">
                            <span className={`font-semibold mr-2 ${PERSONA_COLORS[line.speaker] || 'text-purple-400'}`}>
                              {line.speaker.charAt(0).toUpperCase() + line.speaker.slice(1)}:
                            </span>
                            {line.isInterruption && (
                              <span className="mr-2 text-xs text-red-400 italic">
                                (interrupting {line.interrupted})
                              </span>
                            )}
                            <div className={`flex-1 ${line.isInterruption ? 'pl-2 border-l-2 border-red-400/40' : ''}`}>
                              {index === currentTypingIndex ? (
                                <StreamingText 
                                  text={line.text}
                                  speed={line.isInterruption ? 12 : 15} // Faster for interruptions
                                  className={`leading-relaxed block ${line.isInterruption ? 'text-white/90 font-medium' : 'text-white/80'}`}
                                  onComplete={() => {
                                    // Move to next speaker after current completes
                                    if (index < debateLines.length - 1) {
                                      const delay = debateMode === 'debate' 
                                        ? Math.random() * 600 + 200  // 200-800ms for debates
                                        : 400; // Consistent 400ms for answers
                                      setTimeout(() => {
                                        setCurrentTypingIndex(prev => prev + 1);
                                      }, delay);
                                    }
                                  }}
                                />
                              ) : (
                                <span className="leading-relaxed text-white/80 block">
                                  {line.text}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Show final synthesis if available */}
                  {debateResults && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 pt-6 border-t border-white/10"
                    >
                      {debateResults.collective_synthesis || 
                       debateResults.synthesis || 
                       debateResults.message || 
                       (debateResults.title && debateResults.bullets && (
                         <div>
                           <h3 className="text-purple-400 font-semibold mb-2">{debateResults.title}</h3>
                           <ul className="list-disc list-inside space-y-1">
                             {debateResults.bullets.map((bullet: string, i: number) => (
                               <li key={i} className="text-white/80">{bullet}</li>
                             ))}
                           </ul>
                         </div>
                       ))}
                    </motion.div>
                  )}
                  
                  {/* Emotional State Badge */}
                  {debateResults && (debateResults.debate?.analysis?.emotional_state || 
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
                      <div className="text-white/80 text-lg">Ask a question or start a debate.</div>
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

export default Boardroom;
