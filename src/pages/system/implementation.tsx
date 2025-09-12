import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Download, Code, CheckCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';

export default function SystemImplementation() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const scriptTag = '<script src="https://cdn.sentientiq.ai/v1/detect.js" data-api-key="YOUR_KEY"></script>';
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Neural Cathedral Background */}
      <div className="neural-bg" />
      
      <div className="relative z-10">
        <div className="mx-auto max-w-6xl px-6 pt-12">
          {/* Back Button */}
          <button
            onClick={() => navigate('/super-admin')}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Super Admin
          </button>
          
          <PageHeader 
            title="Implementation Guide"
            subtitle="One-line emotional intelligence for any website"
          />
          
          {/* Quick Start Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Code className="w-6 h-6 text-purple-400" />
              Quick Start
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-4">1. Add the Script</h3>
                <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-purple-500/20">
                  <code className="text-green-400">
                    &lt;script src="https://cdn.sentientiq.ai/v1/detect.js"<br/>
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;data-api-key="YOUR_KEY"&gt;&lt;/script&gt;
                  </code>
                </div>
                <p className="text-sm text-white/60 mt-3">Add before the closing &lt;/body&gt; tag</p>
                
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleCopy(scriptTag)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-all border border-purple-500/30"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy Script'}
                  </button>
                  <a 
                    href="/detect.js" 
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-4">2. What Gets Detected</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🤬</span>
                    <div>
                      <strong className="text-white">Rage Clicks</strong>
                      <div className="text-sm text-white/60">3+ clicks in under 300ms</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🤔</span>
                    <div>
                      <strong className="text-white">Hesitation</strong>
                      <div className="text-sm text-white/60">2+ second hovers on elements</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">😵</span>
                    <div>
                      <strong className="text-white">Confusion</strong>
                      <div className="text-sm text-white/60">Erratic scrolling patterns</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">💸</span>
                    <div>
                      <strong className="text-white">Sticker Shock</strong>
                      <div className="text-sm text-white/60">Mouse deceleration near prices</div>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-xl">🚪</span>
                    <div>
                      <strong className="text-white">Abandonment Intent</strong>
                      <div className="text-sm text-white/60">60+ seconds of inactivity</div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
          
          {/* Event Listener Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">3. Listen for Emotions</h2>
            <div className="bg-black/50 rounded-xl p-6 font-mono text-sm border border-blue-500/20">
              <code className="text-blue-400">
                window.addEventListener('sentientiq:emotion', (e) =&gt; {'{'}<br/>
                &nbsp;&nbsp;<span className="text-gray-400">// Emotion detected!</span><br/>
                &nbsp;&nbsp;console.log('Emotion:', e.detail.emotion);<br/>
                &nbsp;&nbsp;console.log('Confidence:', e.detail.confidence + '%');<br/>
                &nbsp;&nbsp;console.log('Element:', e.detail.element);<br/>
                &nbsp;&nbsp;<br/>
                &nbsp;&nbsp;<span className="text-gray-400">// Deploy your intervention</span><br/>
                &nbsp;&nbsp;if (e.detail.emotion === 'rage' && e.detail.confidence &gt; 80) {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;showSupportChat();<br/>
                &nbsp;&nbsp;{'}'}<br/>
                {'}'});
              </code>
            </div>
          </motion.div>
          
          {/* Configuration Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-8 mb-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Advanced Configuration</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Custom Thresholds</h3>
                <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-green-500/20">
                  <code className="text-green-400">
                    &lt;script<br/>
                    &nbsp;&nbsp;src="https://cdn.sentientiq.ai/v1/detect.js"<br/>
                    &nbsp;&nbsp;data-api-key="YOUR_KEY"<br/>
                    &nbsp;&nbsp;data-rage-threshold="5"<br/>
                    &nbsp;&nbsp;data-hesitation-ms="3000"<br/>
                    &nbsp;&nbsp;data-abandonment-ms="90000"&gt;<br/>
                    &lt;/script&gt;
                  </code>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-3">Disable Specific Detections</h3>
                <div className="bg-black/50 rounded-xl p-4 font-mono text-sm border border-orange-500/20">
                  <code className="text-orange-400">
                    window.SentientIQ = {'{'}<br/>
                    &nbsp;&nbsp;disable: ['abandonment', 'confusion'],<br/>
                    &nbsp;&nbsp;debug: true, <span className="text-gray-400">// Console logs</span><br/>
                    &nbsp;&nbsp;endpoint: 'https://your-api.com/events'<br/>
                    {'}'};
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* API Reference */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-8"
          >
            <h2 className="text-2xl font-bold text-white mb-6">API Reference</h2>
            <div className="space-y-4">
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-white mb-2">Event: sentientiq:emotion</h3>
                <p className="text-white/60 text-sm mb-3">Fired when an emotion is detected with high confidence</p>
                <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
                  <div className="text-purple-400">e.detail.emotion</div>
                  <div className="text-white/60 ml-4">string - The detected emotion</div>
                  <div className="text-purple-400 mt-2">e.detail.confidence</div>
                  <div className="text-white/60 ml-4">number - Confidence percentage (0-100)</div>
                  <div className="text-purple-400 mt-2">e.detail.element</div>
                  <div className="text-white/60 ml-4">Element - The DOM element involved</div>
                  <div className="text-purple-400 mt-2">e.detail.metadata</div>
                  <div className="text-white/60 ml-4">object - Additional context data</div>
                </div>
              </div>
              
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-white mb-2">Method: window.SentientIQ.track()</h3>
                <p className="text-white/60 text-sm mb-3">Manually track custom events</p>
                <div className="bg-black/30 rounded-lg p-3 font-mono text-xs">
                  <code className="text-blue-400">
                    window.SentientIQ.track('custom_event', {'{'}<br/>
                    &nbsp;&nbsp;emotion: 'frustration',<br/>
                    &nbsp;&nbsp;context: 'checkout_form',<br/>
                    &nbsp;&nbsp;value: 42<br/>
                    {'}'});
                  </code>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}