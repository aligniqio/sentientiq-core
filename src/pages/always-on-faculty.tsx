import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Mic, MicOff, Volume2, VolumeX, Zap, AlertCircle, Trophy, Coffee } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

// The 12 PhD Faculty - Each with REAL credentials
const PHD_FACULTY = [
  {
    id: 'cmo',
    name: 'Dr. Strategic',
    title: 'Chief Marketing Officer',
    degree: 'PhD Marketing Strategy, Wharton',
    specialty: 'Market orchestration & resource allocation',
    personality: 'decisive',
    color: 'from-purple-900 to-indigo-900',
    icon: '👔',
    catchphrase: 'Revenue is a lagging indicator of emotion',
    debateStyle: 'authoritative',
    position: { x: 50, y: 10 }
  },
  {
    id: 'psychology',
    name: 'Dr. Emotion',
    title: 'Consumer Psychology',
    degree: 'PhD Behavioral Economics, Stanford',
    specialty: 'Emotional triggers & decision architecture',
    personality: 'empathetic',
    color: 'from-pink-600 to-rose-600',
    icon: '🧠',
    catchphrase: 'They buy feelings, not features',
    debateStyle: 'analytical',
    position: { x: 20, y: 30 }
  },
  {
    id: 'data',
    name: 'Dr. Pattern',
    title: 'Data Science Lead',
    degree: 'PhD Machine Learning, MIT',
    specialty: 'Predictive modeling & anomaly detection',
    personality: 'precise',
    color: 'from-blue-600 to-cyan-600',
    icon: '📊',
    catchphrase: 'The data never lies, but it often misleads',
    debateStyle: 'evidence-based',
    position: { x: 80, y: 30 }
  },
  {
    id: 'identity',
    name: 'Dr. Identity',
    title: 'CDP Architect',
    degree: 'PhD Information Systems, Carnegie Mellon',
    specialty: 'Identity resolution & data unification',
    personality: 'methodical',
    color: 'from-green-600 to-emerald-600',
    icon: '🔍',
    catchphrase: 'One customer, infinite signals',
    debateStyle: 'systematic',
    position: { x: 15, y: 60 }
  },
  {
    id: 'creative',
    name: 'Dr. Chaos',
    title: 'Creative Mutation',
    degree: 'PhD Cognitive Science, Berkeley',
    specialty: 'Creative optimization & A/B evolution',
    personality: 'innovative',
    color: 'from-orange-600 to-yellow-600',
    icon: '🎨',
    catchphrase: 'Best practices are where innovation goes to die',
    debateStyle: 'provocative',
    position: { x: 85, y: 60 }
  },
  {
    id: 'budget',
    name: 'Dr. ROI',
    title: 'Budget Optimization',
    degree: 'PhD Financial Engineering, Chicago',
    specialty: 'Resource allocation & efficiency metrics',
    personality: 'pragmatic',
    color: 'from-yellow-600 to-amber-600',
    icon: '💰',
    catchphrase: 'Every dollar has an emotion attached',
    debateStyle: 'quantitative',
    position: { x: 50, y: 40 }
  },
  {
    id: 'competitive',
    name: 'Dr. Warfare',
    title: 'Competitive Intelligence',
    degree: 'PhD Strategic Management, INSEAD',
    specialty: 'Market dynamics & competitive positioning',
    personality: 'strategic',
    color: 'from-red-600 to-red-800',
    icon: '⚔️',
    catchphrase: 'Your competition is already using AI wrong',
    debateStyle: 'aggressive',
    position: { x: 30, y: 45 }
  },
  {
    id: 'channel',
    name: 'Dr. Omni',
    title: 'Channel Optimizer',
    degree: 'PhD Media Studies, Northwestern',
    specialty: 'Cross-channel orchestration & attribution',
    personality: 'holistic',
    color: 'from-teal-600 to-blue-600',
    icon: '📡',
    catchphrase: 'Channels are dead, experiences are forever',
    debateStyle: 'integrative',
    position: { x: 70, y: 45 }
  },
  {
    id: 'onboarding',
    name: 'Dr. First',
    title: 'Onboarding Intelligence',
    degree: 'PhD User Experience, Michigan',
    specialty: 'First impressions & activation metrics',
    personality: 'welcoming',
    color: 'from-indigo-600 to-purple-600',
    icon: '🚀',
    catchphrase: 'You have 3 seconds to matter',
    debateStyle: 'user-centric',
    position: { x: 25, y: 75 }
  },
  {
    id: 'attribution',
    name: 'Dr. Truth',
    title: 'Attribution Science',
    degree: 'PhD Statistical Analysis, Harvard',
    specialty: 'Multi-touch attribution & causality',
    personality: 'skeptical',
    color: 'from-gray-600 to-gray-800',
    icon: '🎯',
    catchphrase: 'Last-click attribution is astrology for marketers',
    debateStyle: 'critical',
    position: { x: 75, y: 75 }
  },
  {
    id: 'sage',
    name: 'Dr. Brutal',
    title: 'Sage Intelligence',
    degree: 'PhD Philosophy of Mind, Oxford',
    specialty: 'Uncomfortable truths & reality checks',
    personality: 'brutally honest',
    color: 'from-purple-800 to-pink-800',
    icon: '🔮',
    catchphrase: 'Your KPIs are lying to make you feel better',
    debateStyle: 'philosophical',
    position: { x: 50, y: 70 }
  },
  {
    id: 'business',
    name: 'Dr. Context',
    title: 'Business Intelligence',
    degree: 'PhD Business Administration, London',
    specialty: 'Market context & strategic alignment',
    personality: 'analytical',
    color: 'from-slate-600 to-zinc-600',
    icon: '📈',
    catchphrase: 'Context without action is just expensive trivia',
    debateStyle: 'contextual',
    position: { x: 50, y: 85 }
  }
];

interface Dialogue {
  speaker: string;
  message: string;
  timestamp: Date;
  type: 'statement' | 'question' | 'disagreement' | 'agreement' | 'insight';
  intensity: number;
}

const AlwaysOnFaculty: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const [debateTopic, setDebateTopic] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [consensus, setConsensus] = useState<number>(0);
  const dialogueRef = useRef<HTMLDivElement>(null);

  // Connect to backend for real PhD debates
  useEffect(() => {
    const socketInstance = io(API_CONFIG.WS_URL || 'ws://localhost:3001', {
      transports: ['websocket'],
      path: '/phd-collective'
    });

    socketInstance.on('connect', () => {
      console.log('PhD Collective: Faculty assembled');
      setIsLive(true);
    });

    socketInstance.on('debate', (data: any) => {
      const newDialogue: Dialogue = {
        speaker: data.agent,
        message: data.message,
        timestamp: new Date(),
        type: data.type || 'statement',
        intensity: data.intensity || 0.5
      };
      
      setDialogues(prev => [...prev.slice(-50), newDialogue]);
      setActiveSpeaker(data.agent);
      
      // Clear active speaker after speaking
      setTimeout(() => setActiveSpeaker(null), 2000);
    });

    socketInstance.on('consensus', (data: any) => {
      setConsensus(data.level);
    });

    socketInstance.on('topic', (data: any) => {
      setDebateTopic(data.topic);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Auto-scroll dialogue
  useEffect(() => {
    if (dialogueRef.current) {
      dialogueRef.current.scrollTop = dialogueRef.current.scrollHeight;
    }
  }, [dialogues]);

  const startDebate = (topic: string) => {
    if (socket) {
      socket.emit('start_debate', { topic });
    }
  };

  const getPhDById = (id: string) => PHD_FACULTY.find(phd => phd.id === id);

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="relative border-b border-purple-900">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-5xl font-black mb-2">YOUR ALWAYS-ON FACULTY</h1>
              <p className="text-xl text-gray-400">
                12 PhDs. $5.4M in credentials. Working for you 24/7.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm">{isLive ? 'LIVE' : 'OFFLINE'}</span>
              </div>
            </div>
          </div>

          {/* Current Debate Topic */}
          {debateTopic && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-purple-900/20 border border-purple-500 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-400">CURRENT DEBATE:</span>
                <span className="font-bold">{debateTopic}</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-200px)]">
        {/* PhD Visualization */}
        <div className="flex-1 relative p-8">
          <div className="relative w-full h-full">
            {PHD_FACULTY.map((phd) => (
              <motion.div
                key={phd.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: 1, 
                  scale: activeSpeaker === phd.id ? 1.2 : 1,
                  filter: activeSpeaker === phd.id ? 'brightness(1.5)' : 'brightness(1)'
                }}
                transition={{ duration: 0.3 }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ 
                  left: `${phd.position.x}%`, 
                  top: `${phd.position.y}%` 
                }}
              >
                <div className="relative group cursor-pointer">
                  <div className={`
                    w-24 h-24 rounded-full bg-gradient-to-br ${phd.color}
                    flex items-center justify-center text-4xl
                    ${activeSpeaker === phd.id ? 'ring-4 ring-white animate-pulse' : ''}
                    transition-all duration-300 hover:scale-110
                  `}>
                    {phd.icon}
                  </div>
                  
                  {/* Hover Card */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 
                                  opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                  bg-gray-900 rounded-lg p-3 w-64 pointer-events-none z-50">
                    <div className="text-sm">
                      <div className="font-bold">{phd.name}</div>
                      <div className="text-gray-400">{phd.degree}</div>
                      <div className="text-xs text-purple-400 mt-1">"{phd.catchphrase}"</div>
                    </div>
                  </div>
                  
                  <div className="text-center mt-2">
                    <div className="text-xs font-bold">{phd.name}</div>
                    <div className="text-xs text-gray-500">{phd.title}</div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Connection Lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              {PHD_FACULTY.map((phd1, i) => 
                PHD_FACULTY.slice(i + 1).map(phd2 => (
                  <line
                    key={`${phd1.id}-${phd2.id}`}
                    x1={`${phd1.position.x}%`}
                    y1={`${phd1.position.y}%`}
                    x2={`${phd2.position.x}%`}
                    y2={`${phd2.position.y}%`}
                    stroke="white"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                  />
                ))
              )}
            </svg>
          </div>
        </div>

        {/* Dialogue Panel */}
        <div className="w-1/3 bg-gray-950 border-l border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h3 className="font-bold text-lg mb-2">PhD COLLECTIVE DIALOGUE</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Consensus Level</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                    animate={{ width: `${consensus}%` }}
                  />
                </div>
                <span className="text-sm font-bold">{consensus}%</span>
              </div>
            </div>
          </div>
          
          <div ref={dialogueRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence>
              {dialogues.map((dialogue, index) => {
                const phd = getPhDById(dialogue.speaker);
                if (!phd) return null;
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-lg bg-gradient-to-r ${phd.color} bg-opacity-20`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{phd.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm">{phd.name}</span>
                          <span className="text-xs text-gray-500">
                            {dialogue.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{dialogue.message}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {dialogues.length === 0 && (
              <div className="text-center text-gray-600 py-12">
                <Brain className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>The faculty is thinking...</p>
                <p className="text-xs mt-2">Debates begin when you present a challenge</p>
              </div>
            )}
          </div>

          {/* Quick Debate Starters */}
          <div className="p-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-3">START A DEBATE:</p>
            <div className="space-y-2">
              <button
                onClick={() => startDebate("Our CAC is too high")}
                className="w-full text-left p-2 bg-gray-900 rounded hover:bg-gray-800 text-sm"
              >
                "Our CAC is too high"
              </button>
              <button
                onClick={() => startDebate("Competitors are eating our lunch")}
                className="w-full text-left p-2 bg-gray-900 rounded hover:bg-gray-800 text-sm"
              >
                "Competitors are eating our lunch"
              </button>
              <button
                onClick={() => startDebate("Our messaging isn't resonating")}
                className="w-full text-left p-2 bg-gray-900 rounded hover:bg-gray-800 text-sm"
              >
                "Our messaging isn't resonating"
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-950 border-t border-gray-800">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-green-500">$5.4M</div>
            <div className="text-xs text-gray-500">Combined Education Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-500">600K+</div>
            <div className="text-xs text-gray-500">Documents Analyzed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-500">24/7</div>
            <div className="text-xs text-gray-500">Always Thinking</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-500">0</div>
            <div className="text-xs text-gray-500">Dashboards Required</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlwaysOnFaculty;