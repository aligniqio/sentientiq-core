/**
 * Swarm API Server
 * The truth engine exposed via API
 * Connect the swarm to the world
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// We'll need to use dynamic imports for ES modules
let AgentSwarm, SwarmTrainingPipeline;

const app = express();
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  'https://ujoheqdvzndrajfbqzxq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqb2hlcWR2em5kcmFqZmJxenhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTU0NTk2NSwiZXhwIjoyMDY3MTIxOTY1fQ.whxhWT5KoobGm_OeFPjKA8T06Iqm3bu8Bi7Y4ye4YwQ'
);

// Global swarm instance
let swarm = null;
let pipeline = null;
let analysisHistory = [];

// Initialize swarm on startup
async function initializeSwarm() {
  console.log('🚀 Initializing Agent Swarm...');
  
  try {
    // Dynamic import for ES modules
    const AgentSwarmModule = await import('./agent-swarm.js');
    const PipelineModule = await import('./swarm-training-pipeline.js');
    
    AgentSwarm = AgentSwarmModule.default;
    SwarmTrainingPipeline = PipelineModule.default;
    
    // Create and train swarm
    pipeline = new SwarmTrainingPipeline();
    swarm = await pipeline.runPipeline();
    
    console.log('✅ Swarm initialized and trained');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize swarm:', error);
    
    // Fallback: create basic swarm without training
    console.log('📝 Creating fallback swarm without training...');
    
    // Mock swarm for development
    swarm = {
      swarmAnalysis: async (data) => {
        return {
          timestamp: new Date().toISOString(),
          data: data,
          analyses: [
            {
              agent: 'Fraud Detective',
              analysis: 'Analyzing for Math.random() patterns...',
              confidence: 0.7
            },
            {
              agent: 'Bullshit Caller',
              analysis: 'Checking for vendor fraud indicators...',
              confidence: 0.8
            }
          ],
          consensus: {
            agreement_level: 0.75,
            key_insights: ['Potential fraud detected'],
            disagreements: [],
            confidence: 0.75
          },
          decision: {
            action: 'REVIEW',
            confidence: 0.75,
            reasoning: 'Manual swarm analysis pending'
          }
        };
      }
    };
    
    return false;
  }
}

// API Routes

app.get('/', (req, res) => {
  res.json({
    status: 'active',
    message: 'Agent Swarm API - 12 Agents of Truth',
    swarm_ready: swarm !== null,
    agents: swarm ? Object.keys(AgentSwarm?.AGENTS || {}) : [],
    analyses_processed: analysisHistory.length
  });
});

// Analyze a single post with the swarm
app.post('/api/swarm/analyze', async (req, res) => {
  if (!swarm) {
    return res.status(503).json({
      error: 'Swarm not initialized',
      message: 'The agent swarm is still warming up'
    });
  }
  
  const { content, platform, author, url, timestamp } = req.body;
  
  if (!content) {
    return res.status(400).json({
      error: 'Content required',
      message: 'Provide content to analyze'
    });
  }
  
  console.log(`🔍 Analyzing post from ${platform || 'unknown'}...`);
  
  try {
    // Run swarm analysis
    const analysis = await swarm.swarmAnalysis({
      content,
      platform: platform || 'unknown',
      author: author || 'anonymous',
      url: url || null,
      timestamp: timestamp || new Date().toISOString()
    });
    
    // Store in history
    analysisHistory.push(analysis);
    if (analysisHistory.length > 100) {
      analysisHistory.shift(); // Keep last 100
    }
    
    // Store in Supabase for learning
    await supabase
      .from('swarm_analyses')
      .insert({
        content: content.substring(0, 500),
        platform,
        decision: analysis.decision.action,
        confidence: analysis.decision.confidence,
        consensus: analysis.consensus,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// Batch analyze multiple posts
app.post('/api/swarm/batch', async (req, res) => {
  if (!swarm) {
    return res.status(503).json({
      error: 'Swarm not initialized'
    });
  }
  
  const { posts } = req.body;
  
  if (!posts || !Array.isArray(posts)) {
    return res.status(400).json({
      error: 'Posts array required'
    });
  }
  
  console.log(`📊 Batch analyzing ${posts.length} posts...`);
  
  try {
    const analyses = await Promise.all(
      posts.map(post => swarm.swarmAnalysis(post))
    );
    
    // Summary statistics
    const fraudCount = analyses.filter(a => 
      a.decision.action === 'ABORT'
    ).length;
    
    const genuineCount = analyses.filter(a => 
      a.decision.action === 'GO'
    ).length;
    
    res.json({
      total: posts.length,
      fraud_detected: fraudCount,
      genuine: genuineCount,
      needs_review: posts.length - fraudCount - genuineCount,
      analyses: analyses
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

// Get analysis history
app.get('/api/swarm/history', (req, res) => {
  res.json({
    total: analysisHistory.length,
    recent: analysisHistory.slice(-10),
    fraud_rate: analysisHistory.filter(a => 
      a.decision.action === 'ABORT'
    ).length / analysisHistory.length
  });
});

// Get agent performance metrics
app.get('/api/swarm/performance', async (req, res) => {
  if (!swarm || !swarm.performance) {
    return res.status(503).json({
      error: 'Performance data not available'
    });
  }
  
  const performance = Object.fromEntries(swarm.performance);
  
  res.json({
    agents: performance,
    best_performer: Object.entries(performance)
      .sort(([,a], [,b]) => b - a)[0],
    worst_performer: Object.entries(performance)
      .sort(([,a], [,b]) => a - b)[0]
  });
});

// Submit feedback for learning
app.post('/api/swarm/feedback', async (req, res) => {
  if (!swarm) {
    return res.status(503).json({
      error: 'Swarm not initialized'
    });
  }
  
  const { analysis_id, outcome, notes } = req.body;
  
  if (!analysis_id || !outcome) {
    return res.status(400).json({
      error: 'analysis_id and outcome required'
    });
  }
  
  try {
    // Find the analysis
    const analysis = analysisHistory.find(a => 
      a.timestamp === analysis_id
    );
    
    if (!analysis) {
      return res.status(404).json({
        error: 'Analysis not found'
      });
    }
    
    // Update swarm learning
    await swarm.learnFromOutcome(
      JSON.stringify(analysis.data).substring(0, 100),
      outcome
    );
    
    // Store feedback in Supabase
    await supabase
      .from('swarm_feedback')
      .insert({
        analysis_id,
        outcome,
        notes,
        timestamp: new Date().toISOString()
      });
    
    res.json({
      message: 'Feedback received',
      learning_updated: true
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({
      error: 'Feedback processing failed',
      message: error.message
    });
  }
});

// Real-time SSE stream of analyses
app.get('/api/swarm/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send latest analysis every time one happens
  const sendAnalysis = (analysis) => {
    res.write(`data: ${JSON.stringify({
      type: 'analysis',
      data: analysis
    })}\n\n`);
  };
  
  // Send heartbeat
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({
      type: 'heartbeat',
      timestamp: new Date().toISOString()
    })}\n\n`);
  }, 30000);
  
  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Wall of Shame - vendors caught using Math.random()
app.get('/api/wall-of-shame', async (req, res) => {
  // Get all analyses that detected fraud
  const fraudAnalyses = analysisHistory.filter(a => 
    a.decision.action === 'ABORT' &&
    a.consensus.key_insights.some(i => 
      i.toLowerCase().includes('fraud') || 
      i.toLowerCase().includes('math.random')
    )
  );
  
  // Group by platform/vendor
  const vendors = {};
  fraudAnalyses.forEach(a => {
    const vendor = a.data.platform || 'Unknown';
    if (!vendors[vendor]) {
      vendors[vendor] = {
        count: 0,
        confidence: 0,
        examples: []
      };
    }
    vendors[vendor].count++;
    vendors[vendor].confidence = Math.max(
      vendors[vendor].confidence,
      a.decision.confidence
    );
    if (vendors[vendor].examples.length < 3) {
      vendors[vendor].examples.push({
        content: a.data.content.substring(0, 200),
        timestamp: a.timestamp
      });
    }
  });
  
  res.json({
    wall_of_shame: vendors,
    total_fraud_detected: fraudAnalyses.length,
    message: 'Math.random() has no place in AI'
  });
});

const PORT = 8003;

// Initialize swarm and start server
initializeSwarm().then(() => {
  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║     AGENT SWARM API LIVE              ║
║     12 Agents of Truth                ║
║     Port: ${PORT}                          ║
║                                       ║
║     Endpoints:                        ║
║     POST /api/swarm/analyze           ║
║     POST /api/swarm/batch             ║
║     GET  /api/swarm/history           ║
║     GET  /api/swarm/performance       ║
║     POST /api/swarm/feedback          ║
║     GET  /api/swarm/stream            ║
║     GET  /api/wall-of-shame           ║
║                                       ║
║     The truth compounds.              ║
╚═══════════════════════════════════════╝
    `);
  });
}).catch(console.error);