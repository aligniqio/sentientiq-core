import { useState, useEffect } from 'react';
import { getEVI } from '@/lib/reddit-evi';

export default function EVIWidget() {
  const [evi, setEvi] = useState<{
    score: number;
    label: string;
    color: string;
    dominantEmotion?: string;
  }>({
    score: 0,
    label: 'Loading',
    color: '#6b7280'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  useEffect(() => {
    const fetchEVI = async () => {
      try {
        setIsLoading(true);
        const data = await getEVI();
        setEvi(data);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch EVI:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Initial fetch
    fetchEVI();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchEVI, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Animate score changes
  const [displayScore, setDisplayScore] = useState(0);
  
  useEffect(() => {
    const diff = evi.score - displayScore;
    const steps = 20;
    const stepSize = diff / steps;
    let step = 0;
    
    const animation = setInterval(() => {
      if (step < steps) {
        setDisplayScore(prev => prev + stepSize);
        step++;
      } else {
        setDisplayScore(evi.score);
        clearInterval(animation);
      }
    }, 30);
    
    return () => clearInterval(animation);
  }, [evi.score]);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-4 min-w-[200px] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-medium text-gray-400">EVI</h3>
            <p className="text-[10px] text-gray-500">Emotional Volatility Index</p>
          </div>
          <div className="relative">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isLoading ? 'bg-gray-500' : 'bg-green-500'}`} />
            {!isLoading && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping" />
            )}
          </div>
        </div>
        
        {/* Score Display */}
        <div className="flex items-baseline gap-2 mb-2">
          <span 
            className="text-3xl font-bold transition-colors duration-500"
            style={{ color: evi.color }}
          >
            {Math.round(displayScore)}
          </span>
          <span className="text-sm font-medium" style={{ color: evi.color }}>
            {evi.label}
          </span>
        </div>
        
        {/* Volatility Bar */}
        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
          <div 
            className="h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${displayScore}%`,
              backgroundColor: evi.color,
              boxShadow: `0 0 10px ${evi.color}40`
            }}
          />
        </div>
        
        {/* Emotion & Update Time */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>
            {evi.dominantEmotion && (
              <>Dominant: <span className="text-gray-400">{evi.dominantEmotion}</span></>
            )}
          </span>
          <span>
            {lastUpdate && (
              <>Updated: {lastUpdate.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit' 
              })}</>
            )}
          </span>
        </div>
        
        {/* Scale Reference */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex justify-between text-[9px] text-gray-600 mb-1">
            <span>Consensus</span>
            <span>Stable</span>
            <span>Mixed</span>
            <span>Volatile</span>
            <span>Extreme</span>
          </div>
          <div className="flex gap-[2px]">
            <div className="flex-1 h-1 bg-green-600/50 rounded-l" />
            <div className="flex-1 h-1 bg-blue-600/50" />
            <div className="flex-1 h-1 bg-amber-600/50" />
            <div className="flex-1 h-1 bg-red-600/50" />
            <div className="flex-1 h-1 bg-red-800/50 rounded-r" />
          </div>
        </div>
        
        {/* Data Source */}
        <div className="mt-2 text-[9px] text-gray-600 text-center">
          Live from Reddit r/all
        </div>
      </div>
    </div>
  );
}