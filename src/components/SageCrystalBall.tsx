import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Sparkles, Eye } from 'lucide-react';
import { SageService } from '@/services/sage';
import { sageContext } from '@/services/sage-context';
import { useUser } from '@clerk/clerk-react';

// Typewriter effect component
const TypewriterText = ({ text, speed = 30 }: { text: string; speed?: number }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  // Split text into paragraphs for better formatting
  const paragraphs = displayedText.split('\n\n').filter(p => p.trim());

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className="text-white text-sm leading-relaxed">
          {paragraph}
        </p>
      ))}
      {currentIndex < text.length && (
        <span className="inline-block w-1 h-4 bg-purple-400 animate-pulse ml-1" />
      )}
    </div>
  );
};

export default function SageCrystalBall() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [message, setMessage] = useState('');
  const [sageResponse, setSageResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [isWatching, setIsWatching] = useState(false);
  const [pageContext, setPageContext] = useState<any>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const sage = SageService.getInstance();
  const { user } = useUser();

  // Detect page context for Sage
  useEffect(() => {
    const currentPath = window.location.pathname;
    const pageTitle = document.title;

    // Build context based on current page
    const context: any = {
      page: currentPath,
      title: pageTitle,
      timestamp: new Date().toISOString()
    };

    // Special context for implementation page
    if (currentPath.includes('/system/implementation')) {
      context.isImplementationPage = true;
      context.implementationSteps = [
        'Open Google Tag Manager',
        'Search for SentientIQ Detect in Gallery',
        'Add template to workspace',
        'Create new tag from template',
        'Configure with API key',
        'Publish changes'
      ];
      context.commonIssues = [
        'Finding the template gallery',
        'Understanding what GTM is',
        'Where to paste the API key',
        'Which trigger to use (All Pages)',
        'How to test if it\'s working'
      ];
    }

    setPageContext(context);
  }, []);

  // Sage's mood affects the orb's glow
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseIntensity(Math.random() * 0.5 + 0.5);
      
      // Check if Sage is watching current debate
      if (user?.id) {
        const context = sageContext.getUserContext(user.id);
        setIsWatching(context.isWatching);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsThinking(true);
    setSageResponse('');

    try {
      // Build message with context for implementation page
      let enhancedMessage = message;
      let contextNote = '';

      if (pageContext.isImplementationPage) {
        // Check for common GTM questions
        const lowerMessage = message.toLowerCase();

        if (lowerMessage.includes('gtm') || lowerMessage.includes('tag manager') || lowerMessage.includes('what is')) {
          contextNote = '\n\n[Context: User is on the GTM Implementation page and may need help understanding Google Tag Manager]';
        } else if (lowerMessage.includes('api key') || lowerMessage.includes('key')) {
          contextNote = '\n\n[Context: User is asking about API keys on the implementation page]';
        } else if (lowerMessage.includes('work') || lowerMessage.includes('test') || lowerMessage.includes('verify')) {
          contextNote = '\n\n[Context: User wants to verify their GTM implementation is working]';
        } else if (lowerMessage.includes('trigger') || lowerMessage.includes('pages')) {
          contextNote = '\n\n[Context: User is asking about GTM triggers on the implementation page]';
        }

        enhancedMessage = `${message}${contextNote}\n\nPage Context: ${JSON.stringify(pageContext)}`;
      }

      // Check if Sage has already seen this content
      const seenCheck = await sageContext.hasSeenContent(message, user?.id);

      if (seenCheck.seen && seenCheck.sassyResponse) {
        // Sage recognizes this content
        setSageResponse(seenCheck.sassyResponse);

        // Still provide analysis but with context
        setTimeout(async () => {
          const memories = await sage.findSimilarMemories(enhancedMessage, 0.7, 3);
          const response = await sage.generateResponse(
            enhancedMessage,
            `already_seen_${seenCheck.debateId}`,
            memories
          );
          setSageResponse(prev => `${prev}\n\n${response}`);
        }, 1500);
      } else {
        // New content - normal analysis
        const memories = await sage.findSimilarMemories(enhancedMessage, 0.7, 3);
        const response = await sage.generateResponse(
          enhancedMessage,
          pageContext.isImplementationPage ? 'implementation_help' : 'crystal_ball_consultation',
          memories
        );
        setSageResponse(response);
      }
    } catch (error) {
      setSageResponse("Even I'm speechless. That's a first.");
    } finally {
      setIsThinking(false);
      setMessage('');
    }
  };

  return (
    <>
      {/* Crystal Ball - Always Visible */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
          isExpanded ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <button
          onClick={() => setIsExpanded(true)}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="relative group"
        >
          {/* Outer glow */}
          <div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 blur-xl"
            style={{
              opacity: pulseIntensity * 0.6,
              transform: `scale(${1 + pulseIntensity * 0.2})`,
              transition: 'all 2s ease-in-out'
            }}
          />
          
          {/* Crystal ball */}
          <div className="relative w-20 h-20 rounded-full overflow-hidden">
            {/* Glass effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-white/20" />
            
            {/* Inner swirl animation */}
            <div className="absolute inset-0 opacity-60">
              <div className="absolute inset-0 bg-gradient-conic from-purple-600 via-blue-600 to-purple-600 animate-spin-slow" />
            </div>
            
            {/* Center eye */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Eye className={`w-8 h-8 transition-all duration-300 ${
                isWatching ? 'text-red-400 scale-110 animate-pulse' : 'text-white'
              } ${isHovering ? 'scale-110' : 'scale-100'}`} />
            </div>
            
            {/* Watching indicator */}
            {isWatching && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
            
            {/* Mystical particles */}
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-float"
                style={{
                  left: `${20 + i * 10}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${3 + i}s`
                }}
              />
            ))}
          </div>
          
          {/* Hover tooltip */}
          <div className={`absolute bottom-full right-0 mb-2 px-3 py-1 bg-black/80 text-white text-sm rounded-lg whitespace-nowrap transition-opacity ${
            isHovering ? 'opacity-100' : 'opacity-0'
          }`}>
            Ask Sage for the truth
            <div className="absolute bottom-0 right-6 translate-y-1/2 rotate-45 w-2 h-2 bg-black/80" />
          </div>
        </button>
      </div>

      {/* Expanded Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-500 ${
          isExpanded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
        }`}
      >
        <div className="w-[550px] h-[650px] rounded-2xl overflow-hidden shadow-2xl">
          {/* Glassmorphic container */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-black/20 backdrop-blur-xl border border-white/10" />
          
          {/* Content */}
          <div className="relative h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-pulse" />
                  <div className="absolute inset-0 blur-md bg-purple-400/50" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Sage</h3>
                  <p className="text-xs text-white/60">Crystal Palace of Marketing Truth</p>
                </div>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!sageResponse && !isThinking && (
                <div className="text-center py-8">
                  <div className="inline-block p-4 bg-white/5 rounded-xl">
                    <p className="text-white/60 text-sm mb-2">
                      Show me your marketing copy.
                    </p>
                    <p className="text-white/40 text-xs">
                      I'll tell you why it won't work.
                    </p>
                  </div>
                </div>
              )}

              {isThinking && (
                <div className="flex items-center gap-2 text-white/60">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm">Analyzing the BS level...</span>
                </div>
              )}

              {sageResponse && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-white/10">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <TypewriterText text={sageResponse} speed={25} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Paste your marketing copy..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                  disabled={isThinking}
                />
                <button
                  type="submit"
                  disabled={isThinking || !message.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); opacity: 0.3; }
          50% { transform: translateY(-20px); opacity: 1; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .bg-gradient-conic {
          background: conic-gradient(from 0deg, #9333ea, #3b82f6, #9333ea);
        }
      `}</style>
    </>
  );
}