import { Request, Response } from 'express';
import { sageWatcher } from '../services/sage-stream.js';
// import { SageService } from '../../src/services/sage';

// API endpoints for Sage
export class SageAPI {
  private sage: any; // SageService;
  
  constructor() {
    // this.sage = SageService.getInstance();
  }

  // Real-time commentary subscription via SSE
  async subscribeToCommentary(req: Request, res: Response) {
    const { debateId } = req.params;
    
    // Set up SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: 'connected', 
      message: 'Sage is watching...' 
    })}\n\n`);

    // Listen for Sage's commentary
    const commentaryHandler = (data: any) => {
      if (data.debateId === debateId) {
        res.write(`data: ${JSON.stringify({
          type: 'commentary',
          ...data
        })}\n\n`);
      }
    };

    sageWatcher.on('commentary', commentaryHandler);

    // Clean up on disconnect
    req.on('close', () => {
      sageWatcher.off('commentary', commentaryHandler);
      res.end();
    });
  }

  // Direct analysis endpoint
  async analyzeContent(req: Request, res: Response) {
    try {
      const { content, context } = req.body;
      
      if (!content) {
        return res.status(400).json({ error: 'Content required' });
      }

      // Find similar memories
      const memories = await this.sage.findSimilarMemories(content, 0.7, 3);
      
      // Analyze authenticity
      const analysis = this.sage.analyzeAuthenticity(content);
      
      // Generate response
      const response = await this.sage.generateResponse(
        content,
        context,
        memories
      );

      res.json({
        response,
        analysis,
        memories: memories.map((m: any) => ({
          content: m.content,
          type: m.memory_type,
          authenticity: m.authenticity_score
        }))
      });
    } catch (error) {
      console.error('Sage analysis error:', error);
      res.status(500).json({ 
        error: 'Sage is temporarily speechless',
        response: "Even I need a moment to process this." 
      });
    }
  }

  // Get Sage's current mood
  async getMood(req: Request, res: Response) {
    try {
      const mood = await this.sage.getCurrentMood();
      res.json(mood);
    } catch (error) {
      res.status(500).json({ 
        mood: 'Technically irritated',
        snarkLevel: 10,
        recentThemes: ['technical difficulties']
      });
    }
  }

  // Trigger immediate commentary
  async triggerCommentary(req: Request, res: Response) {
    try {
      const { debateId, context, priority } = req.body;
      
      // Publish to Redis for immediate Sage attention
      const redis = require('redis').createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      await redis.connect();
      await redis.publish('sage:trigger', JSON.stringify({
        debateId,
        context,
        priority: priority || 'normal'
      }));
      await redis.disconnect();
      
      res.json({ 
        success: true, 
        message: 'Sage has been summoned' 
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Failed to summon Sage',
        message: 'Try bribing him with authenticity'
      });
    }
  }

  // Get Sage's memories about a topic
  async getMemories(req: Request, res: Response) {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: 'Query required' });
      }
      
      const memories = await this.sage.findSimilarMemories(
        query as string,
        0.7,
        10
      );
      
      res.json({
        memories,
        count: memories.length,
        query
      });
    } catch (error) {
      res.status(500).json({ 
        error: 'Memory palace is locked',
        memories: []
      });
    }
  }
}

// Export configured routes
export function setupSageRoutes(app: any) {
  const sageAPI = new SageAPI();
  
  // SSE endpoint for real-time commentary
  app.get('/api/sage/commentary/:debateId', 
    sageAPI.subscribeToCommentary.bind(sageAPI));
  
  // REST endpoints
  app.post('/api/sage/analyze', 
    sageAPI.analyzeContent.bind(sageAPI));
  
  app.get('/api/sage/mood', 
    sageAPI.getMood.bind(sageAPI));
  
  app.post('/api/sage/trigger', 
    sageAPI.triggerCommentary.bind(sageAPI));
  
  app.get('/api/sage/memories', 
    sageAPI.getMemories.bind(sageAPI));
  
  console.log('🔮 Sage API endpoints configured');
}