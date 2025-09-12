import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Lock, 
  Zap, 
  Target,
  ArrowRight,
  Download,
  Share2,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useUser } from '@clerk/clerk-react';
import { useSubscription } from '../hooks/useSubscription';

interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  metrics?: {
    current: string;
    target: string;
  };
  locked?: boolean;
}

const DynamicRecommendations: React.FC = () => {
  const { user } = useUser();
  const subscription = useSubscription();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  // Neural Network Background (same as PhD Collective)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const nodes: any[] = [];
    const nodeCount = 120;

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += 0.02;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        nodes.forEach((otherNode, j) => {
          if (i < j) {
            const dx = otherNode.x - node.x;
            const dy = otherNode.y - node.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 150) {
              const opacity = (1 - distance / 150) * 0.15;
              ctx.strokeStyle = `rgba(147, 51, 234, ${opacity})`;
              ctx.lineWidth = 0.3;
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(otherNode.x, otherNode.y);
              ctx.stroke();
            }
          }
        });

        const pulseFactor = 1 + Math.sin(node.pulsePhase) * 0.2;
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2 * pulseFactor);
        gradient.addColorStop(0, `rgba(147, 51, 234, ${node.opacity * 1.5})`);
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${node.opacity})`);
        gradient.addColorStop(1, 'rgba(147, 51, 234, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * pulseFactor, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Load recommendations based on user's analysis
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return;
      
      try {
        // DEAD: const response = await fetch(`http://localhost:8004/api/recommendations/${user.id}`);
        // DEAD: const data = await response.json();
        // NO MORE LOCALHOST CALLS - Show placeholder message
        setRecommendations([{
          id: 'no-analysis',
          priority: 'high',
          category: 'Get Started',
          title: 'Run Your First Analysis',
          description: 'No site analysis found. Visit the onboarding page to analyze your site.',
          impact: 'Unlock personalized recommendations',
          effort: 'low',
          locked: false
        }]);
        return;
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
        // On error, show message to run analysis
        setRecommendations([{
          id: 'error-analysis',
          priority: 'high',
          category: 'Connection Issue',
          title: 'Unable to Load Recommendations',
          description: 'Check your connection or run a new site analysis.',
          impact: 'Get real-time insights',
          effort: 'low',
          locked: false
        }]);
      }
    };

    fetchRecommendations();
  }, [user, subscription.tier]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'from-red-500 to-orange-500';
      case 'high': return 'from-yellow-500 to-amber-500';
      case 'medium': return 'from-blue-500 to-indigo-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'high': return <AlertCircle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  return (
    <>
      <PageHeader 
        title="Dynamic Recommendations" 
        subtitle="AI-Powered Actions Tailored to Your Site"
      />
        
        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Total Issues</p>
                <p className="text-2xl font-bold text-white">
                  {recommendations.filter(r => !r.locked).length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Potential Impact</p>
                <p className="text-2xl font-bold text-white">+68%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm">Quick Wins</p>
                <p className="text-2xl font-bold text-white">
                  {recommendations.filter(r => r.effort === 'low' && !r.locked).length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Recommendations Grid */}
        <div className="space-y-4">
          {['critical', 'high', 'medium', 'low'].map(priority => {
            const priorityRecs = recommendations.filter(r => r.priority === priority);
            if (priorityRecs.length === 0) return null;

            return (
              <div key={priority}>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  {getPriorityIcon(priority)}
                  {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                </h3>
                
                <div className="grid gap-4">
                  {priorityRecs.map((rec) => (
                    <motion.div
                      key={rec.id}
                      whileHover={!rec.locked ? { scale: 1.02 } : {}}
                      onClick={() => !rec.locked && console.log('Selected:', rec.id)}
                      className={`
                        relative group cursor-pointer
                        ${rec.locked ? 'opacity-50' : ''}
                      `}
                    >
                      <div className={`
                        bg-white/5 backdrop-blur-xl rounded-xl p-6 
                        border ${rec.locked ? 'border-white/5' : 'border-white/10 hover:border-white/20'}
                        transition-all duration-300
                      `}>
                        {/* Priority Badge */}
                        <div className={`
                          absolute -top-2 -right-2 px-3 py-1 rounded-full
                          bg-gradient-to-r ${getPriorityColor(rec.priority)}
                          text-white text-xs font-bold
                        `}>
                          {rec.priority.toUpperCase()}
                        </div>

                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white/60 text-sm">{rec.category}</span>
                              {rec.effort && (
                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60">
                                  {rec.effort} effort
                                </span>
                              )}
                            </div>
                            
                            <h4 className="text-xl font-bold text-white mb-2">
                              {rec.locked && <Lock className="inline w-4 h-4 mr-2" />}
                              {rec.title}
                            </h4>
                            
                            <p className="text-white/70 mb-3">{rec.description}</p>
                            
                            {rec.metrics && !rec.locked && (
                              <div className="flex items-center gap-4 mb-3">
                                <div className="bg-red-500/20 px-3 py-1 rounded">
                                  <span className="text-red-400 text-sm">Now: {rec.metrics.current}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-white/40" />
                                <div className="bg-green-500/20 px-3 py-1 rounded">
                                  <span className="text-green-400 text-sm">Target: {rec.metrics.target}</span>
                                </div>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-purple-400" />
                              <span className="text-purple-400 font-semibold">
                                {rec.locked ? 'Unlock with Pro' : rec.impact}
                              </span>
                            </div>
                          </div>
                          
                          {!rec.locked && (
                            <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white/60 transition-colors" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upgrade CTA for Free Users */}
        {subscription.tier === 'free' && (
          <div className="mt-12 bg-gradient-to-r from-purple-600/20 to-blue-600/20 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-4">
                🔒 Unlock {recommendations.filter(r => r.locked).length} More Recommendations
              </h3>
              <p className="text-white/70 mb-6">
                Get detailed implementation guides, priority scoring, and weekly updates
              </p>
              <button className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all">
                Upgrade to Pro
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons for Paid Users */}
        {subscription.tier !== 'free' && (
          <div className="mt-8 flex gap-4 justify-center">
            <button className="px-6 py-3 bg-white/10 backdrop-blur-xl text-white rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Report
            </button>
            <button className="px-6 py-3 bg-white/10 backdrop-blur-xl text-white rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Share with Team
            </button>
          </div>
        )}
    </>
  );
};

export default DynamicRecommendations;