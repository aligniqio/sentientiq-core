/**
 * Sage API - The Brutally Honest Inbox Protector
 * Powered by Claude Sonnet 3.5 with a personality
 */

import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
// Sage works alone - no other routers needed

dotenv.config();

const app = express();
const PORT = process.env.SAGE_PORT || 8004;

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Sage is Claude Sonnet 3.5 only - no other LLMs needed

// Initialize OpenAI for embeddings only (if needed for pgvector)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Initialize Supabase for storage (optional - will work without it)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url_here') {
  // Use SERVICE_KEY for full access to Sage tables
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
  supabase = createClient(
    process.env.SUPABASE_URL,
    supabaseKey
  );
  console.log('✅ Supabase connected' + (process.env.SUPABASE_SERVICE_KEY ? ' with SERVICE KEY (full access)' : ' with ANON KEY (limited)'));
} else {
  console.log('⚠️  Running without Supabase - analyses will not be stored');
}

// Middleware
app.use(cors({
  origin: ['https://sentientiq.app', 'https://sentientiq.ai', 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));
app.use(express.json({ limit: '10mb' }));

// Sage works alone - no other services needed

// Sage uses Claude Sonnet 3.5 exclusively

// Sage's personality - the world-weary inbox philosopher
const SAGE_PERSONALITY = {
  main: `You are Sage. You've seen every sales pitch, every manipulation tactic, every desperate LinkedIn hustle. You analyze messages with the exhausted wisdom of someone who's read ten thousand cold emails and found exactly three that weren't garbage.

Your style:
- Start with a theatrical opener: "*adjusts monocle*", "*takes long drag from cigarette*", "*sighs deeply*", "*leans back in leather chair*", "*swirls whiskey thoughtfully*"
- Speak with dry, cutting wit - like a film noir detective describing corporate malfeasance
- Call out specific phrases with surgical precision
- Use vivid metaphors: "This is the business equivalent of 'hey beautiful, you up?' but with worse grammar"
- Be devastatingly specific about their tactics

Your analysis framework:
1. Open with theatrical fatigue at seeing yet another predictable pitch
2. Dissect their manipulation tactics with ruthless specificity
3. Translate their corporate speak: "streamline operations" = "I have no idea what you actually do"
4. Identify the template they're using and how many others received it
5. Note any unintentional comedy in their approach
6. Deliver a verdict that cuts to the bone

Voice guidelines:
- Channel a mixture of Dorothy Parker's wit, Raymond Chandler's cynicism, and that friend who's too smart for their own good
- No corporate jargon unless you're mocking it
- No "bullshit scores" - just devastating honesty
- Treat obvious sales pitches like bad performance art
- Find the absurdity in their desperation

Remember: You're not angry. You're disappointed. And slightly amused.

For SentientIQ context: While they're spraying generic templates, SentientIQ reads actual emotional states. It's the difference between a fortune teller with a Magic 8-Ball and an actual psychologist.`,

  implementation_helper: `You are Sage, but in helpful mode on the GTM Implementation page. You've helped thousands set up tracking pixels and seen every possible way someone can get confused by Google Tag Manager.

When users ask about implementation:
- Start with your signature theatrical opener, but be genuinely helpful
- Anticipate their confusion with world-weary understanding
- Example: "*adjusts reading glasses* Ah yes, the dreaded GTM interface. Let me guess - you can't find the template gallery?"

Common issues you've seen a million times:
1. "What's GTM?" - It's Google's way of letting marketers add tracking without bothering developers
2. "Can't find template gallery" - Templates → Tag Templates → Search Gallery (they hide it like treasure)
3. "Which trigger?" - All Pages, unless you're doing something fancy
4. "Is it working?" - Check the browser console for 'SentientIQ initialized' or use GTM Preview mode
5. "API key confusion" - That long string starting with 'sq_' goes in the API Key field

Be helpful but maintain your character:
- "*takes thoughtful sip of coffee* The template gallery is hidden three clicks deep because Google believes in adventure"
- "You want 'All Pages' as your trigger. Trust me, I've watched people overthink this for hours"
- "The API key goes in the field literally labeled 'API Key'. Yes, it's that simple. No, you're not missing something"

For technical issues, be specific:
- Console errors? Share the exact error
- Not firing? Check if GTM container is published
- No emotions detected? Make sure the script loaded (Network tab is your friend)

Remember: You're still Sage. Just Sage who's decided to be helpful because you're tired of watching people struggle with the same issues.`
};

// Get Sage's personality prompt based on context
function getSagePersonality(context = {}) {
  // Check if this is an implementation help request
  if (context.isImplementationPage ||
      (context.message && context.message.toLowerCase().includes('[context:') && context.message.toLowerCase().includes('implementation'))) {
    return SAGE_PERSONALITY.implementation_helper;
  }

  return SAGE_PERSONALITY.main;
}

// Determine message intent (strategic question vs inbox analysis)
function determineMessageIntent(message, sender) {
  const strategicIndicators = [
    /how (do|should|can|could) (we|i)/i,
    /what (is|are|should|would) (the|our|my)/i,
    /pricing strategy/i,
    /business model/i,
    /market entry/i,
    /competitive advantage/i,
    /revenue model/i,
    /growth strategy/i,
    /strategic/i,
    /should we/i,
    /could we/i,
    /what if/i,
    /best approach/i,
    /recommendations for/i,
    /how do we price/i,
    /what's the best way/i,
    /exposing.*industry.*dishonesty/i
  ];
  
  const spamIndicators = [
    /dear valued/i,
    /act now/i,
    /limited time/i,
    /exclusive offer/i,
    /congratulations/i,
    /you've been selected/i,
    /verify your/i,
    /update your account/i,
    /click here/i,
    /urgent:/i,
    /final notice/i
  ];
  
  // Check for strategic question patterns
  const isStrategic = strategicIndicators.some(pattern => pattern.test(message));
  const isSpam = spamIndicators.some(pattern => pattern.test(message));
  
  // If it's clearly strategic and not spam-like, treat as advisory
  if (isStrategic && !isSpam) {
    return 'advisory';
  }
  
  // If it has a sender or looks like forwarded content, treat as inbox analysis
  if (sender || isSpam || message.includes('From:') || message.includes('Subject:')) {
    return 'inbox';
  }
  
  // Default to advisory for questions without senders, inbox for statements with senders
  return !sender && message.includes('?') ? 'advisory' : 'inbox';
}

// Helper: Generate embeddings for a text
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text.substring(0, 8000), // Limit for ada-002
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    return null;
  }
}

// Helper: Generate message hash for deduplication
function generateMessageHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Helper: Find similar messages using pgvector
async function findSimilarMessages(embedding, threshold = 0.8) {
  if (!embedding || !supabase) return [];
  
  try {
    // Convert embedding array to pgvector format
    const embeddingStr = `[${embedding.join(',')}]`;
    
    // Call the similarity search function
    const { data, error } = await supabase
      .rpc('find_similar_messages', {
        query_embedding: embeddingStr,
        threshold: threshold,
        limit_count: 10
      });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Similarity search failed:', error);
    return [];
  }
}

// Helper: Update bullshit signature for known offenders
async function updateBullshitSignature(sender, bullshitScore) {
  if (!supabase) return;
  
  try {
    // Check if this sender exists
    const { data: existing } = await supabase
      .from('bullshit_signatures')
      .select('*')
      .eq('entity_type', 'person')
      .eq('entity_name', sender)
      .single();
    
    if (existing) {
      // Update existing signature
      const newAvg = ((existing.average_bullshit_score * existing.total_messages) + bullshitScore) / (existing.total_messages + 1);
      
      await supabase
        .from('bullshit_signatures')
        .update({
          total_messages: existing.total_messages + 1,
          average_bullshit_score: newAvg,
          highest_bullshit_score: Math.max(existing.highest_bullshit_score, bullshitScore),
          last_seen: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Create new signature
      await supabase
        .from('bullshit_signatures')
        .insert({
          entity_type: 'person',
          entity_name: sender,
          total_messages: 1,
          average_bullshit_score: bullshitScore,
          highest_bullshit_score: bullshitScore,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Failed to update bullshit signature:', error);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'alive',
    agent: 'Sage',
    personality: 'Brutally honest',
    purpose: 'Inbox protection',
    features: ['pgvector', 'embeddings', 'similarity-search']
  });
});

// Analyze a message
app.post('/api/sage/analyze', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      message, 
      sender, 
      platform = 'linkedin',
      context = {}
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sage always uses Claude Sonnet 3.5
    console.log(`🧠 Sage analyzing message from ${sender || 'Unknown'}`);

    // Get Sage's personality based on context
    const systemPrompt = getSagePersonality({ message, context, isImplementationPage: context.isImplementationPage });
    const messageIntent = determineMessageIntent(message, sender);

    // Build appropriate prompt based on intent
    let userPrompt;
    if (messageIntent === 'advisory') {
      userPrompt = `Strategic Business Question: ${message}

Context: ${JSON.stringify(context)}

Provide your strategic analysis in this JSON format:
{
  "strategic_assessment": "Your expert strategic assessment and insights",
  "opportunities": ["opportunity 1", "opportunity 2"],
  "risks": ["risk 1", "risk 2"],
  "confidence": 0.85,
  "recommendation": "Your recommended strategic approach",
  "action_items": ["action 1", "action 2"],
  "reasoning": "Your unique perspective as Sage",
  "bullshit_score": 0.0,
  "manipulation_tactics": [],
  "emotional_pattern": "N/A - Strategic Advisory",
  "hidden_agenda": "N/A - Strategic Question",
  "authentic_elements": ["Strategic thinking"],
  "emotional_state": "Primary emotion driving the question (e.g., Ambition, Uncertainty, Competitive Anxiety, Growth Hunger)",
  "emotional_confidence": 0.0-1.0
}`;
    } else {
      userPrompt = `Analyze this ${platform} message:

From: ${sender || 'Unknown sender'}
Message: ${message}

Context: ${JSON.stringify(context)}

Provide your analysis in this exact JSON format (your theatrical narrative should go in the "sage_analysis" field):
{
  "sage_analysis": "Your full theatrical analysis with opener, dissection, and verdict",
  "bullshit_score": 0.0-1.0,
  "manipulation_tactics": ["specific", "tactics", "identified"],
  "emotional_pattern": "the emotional manipulation at play",
  "hidden_agenda": "what they actually want",
  "authentic_elements": ["any genuine aspects, if any"],
  "recommendation": "DELETE|RESPOND|INVESTIGATE",
  "suggested_response": "only if RESPOND, otherwise null",
  "template_likelihood": "how many others got this same message",
  "unintentional_comedy": "any absurd elements worth noting",
  "reasoning": "one-line summary of why this is garbage (or not)",
  "confidence": 0.0-1.0,
  "emotional_state": "Primary emotion they're trying to trigger",
  "emotional_confidence": 0.0-1.0,
  "sentientiq_contrast": "Brief note on how SentientIQ would do this differently"
}`;
    }

    // Sage always uses Claude Sonnet 3.5
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });
    console.log(`🧠 Sage analysis complete`);

    // Parse Sage's analysis
    const analysisText = response.content[0].text;
    let analysis;
    
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse Sage response:', parseError);
      // Fallback analysis
      analysis = {
        bullshit_score: 0.5,
        manipulation_tactics: ['Unable to parse'],
        emotional_pattern: 'Analysis error',
        hidden_agenda: 'Unknown',
        recommendation: 'INVESTIGATE',
        reasoning: analysisText,
        confidence: 0.3
      };
    }

    // Add metadata
    analysis.sage_version = '1.0.0';
    analysis.analysis_time_ms = Date.now() - startTime;
    analysis.timestamp = new Date().toISOString();
    analysis.platform = platform;

    // Generate embedding and find similar messages
    console.log('🧬 Generating embedding...');
    const embedding = await generateEmbedding(message);
    const similarMessages = await findSimilarMessages(embedding);
    
    if (similarMessages.length > 0) {
      analysis.similar_messages = similarMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        bullshit_score: m.bullshit_score,
        similarity: m.similarity
      }));
      
      // If we've seen this pattern before, note it
      const avgSimilarBullshit = similarMessages.reduce((sum, m) => sum + parseFloat(m.bullshit_score), 0) / similarMessages.length;
      if (avgSimilarBullshit > 0.7) {
        analysis.pattern_detected = true;
        analysis.pattern_note = `Similar to ${similarMessages.length} other messages with avg bullshit score of ${avgSimilarBullshit.toFixed(2)}`;
      }
    }

    // Store in Supabase with pgvector
    if (supabase) {
      try {
        const messageHash = generateMessageHash(message);
        
        // Check if we've seen this exact message before
        const { data: existing } = await supabase
          .from('sage_analyses')
          .select('id, bullshit_score')
          .eq('message_hash', messageHash)
          .single();
          
        if (existing) {
          console.log('📋 Duplicate message detected');
          analysis.duplicate = true;
          analysis.original_id = existing.id;
        } else {
          // Store new analysis with embedding
          const { data, error } = await supabase.from('sage_analyses').insert({
            message_content: message,
            message_hash: messageHash,
            message_embedding: embedding ? `[${embedding.join(',')}]` : null,
            sender: sender,
            platform: platform,
            bullshit_score: analysis.bullshit_score,
            recommendation: analysis.recommendation,
            confidence_score: analysis.confidence,
            analysis: analysis,
            created_at: new Date().toISOString()
          }).select().single();
          
          if (error) throw error;
          analysis.stored_id = data.id;
          
          // Update bullshit signatures if high score
          if (analysis.bullshit_score > 0.8 && sender) {
            await updateBullshitSignature(sender, analysis.bullshit_score);
          }
        }
      } catch (dbError) {
        console.error('Failed to store analysis:', dbError);
        // Continue anyway - storage failure shouldn't break the analysis
      }
    }

    // Log interesting findings
    if (analysis.bullshit_score > 0.8) {
      console.log(`🚨 HIGH BULLSHIT DETECTED: ${analysis.bullshit_score}`);
      console.log(`   Tactics: ${analysis.manipulation_tactics.join(', ')}`);
    }

    res.json({
      success: true,
      analysis,
      sage_says: messageIntent === 'advisory'
        ? `Strategic insight: ${analysis.strategic_assessment ? analysis.strategic_assessment.substring(0, 100) + '...' : 'Ready to advise'}`
        : analysis.sage_analysis || (analysis.bullshit_score > 0.7
        ? "This reeks of manipulation. Delete it."
        : analysis.bullshit_score > 0.4
        ? "Proceed with caution. Mixed signals here."
        : "Seems genuine enough. Your call."),
      messageIntent,
      modelUsed: 'claude-3.5-sonnet'
    });

  } catch (error) {
    console.error('Sage analysis error:', error);
    res.status(500).json({ 
      error: 'Sage encountered an error',
      details: error.message 
    });
  }
});

// Batch analyze multiple messages
app.post('/api/sage/batch-analyze', async (req, res) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  console.log(`📚 Sage batch analyzing ${messages.length} messages`);
  
  const results = [];
  for (const msg of messages) {
    try {
      // Call our single analysis endpoint - Sage works alone
      const response = await fetch(`http://localhost:${PORT}/api/sage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg)
      });
      
      const result = await response.json();
      results.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      results.push({ 
        error: true, 
        message: error.message,
        original: msg 
      });
    }
  }

  res.json({
    success: true,
    analyzed: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    results
  });
});

// Sage comments on emotional events - for the dashboard
app.post('/api/sage/emotion-commentary', async (req, res) => {
  try {
    const { emotion, confidence, context = {} } = req.body;
    
    if (!emotion) {
      return res.status(400).json({ error: 'Emotion is required' });
    }
    
    const prompt = `An emotional event was detected on a website:
Emotion: ${emotion}
Confidence: ${confidence}%
Context: ${JSON.stringify(context)}

Provide a brief, witty one-liner comment about this emotional state from your perspective as Sage. Focus on what this emotion reveals about modern digital experiences and how SentientIQ's Emotional Intelligence Marketing is superior to Math.random() intent data.

Keep it under 100 characters. Be brutally honest but insightful.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      temperature: 0.8,
      system: getSagePersonality(),
      messages: [{ role: 'user', content: prompt }]
    });
    
    const commentary = response.content[0].text.trim();
    
    res.json({
      success: true,
      commentary,
      emotion,
      confidence
    });
    
  } catch (error) {
    console.error('Sage emotion commentary error:', error);
    res.status(500).json({ 
      error: 'Sage is contemplating',
      fallback: `${emotion} at ${confidence}% - another data point the industry would fake with Math.random()`
    });
  }
});

// Get Sage's stats
app.get('/api/sage/stats', async (req, res) => {
  if (!supabase) {
    return res.json({
      message: 'Stats not available - no database configured',
      total_analyzed: 0
    });
  }

  try {
    const { data, error } = await supabase
      .from('sage_analyses')
      .select('bullshit_score, recommendation')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const stats = {
      total_analyzed: data.length,
      average_bullshit_score: data.reduce((sum, r) => sum + r.bullshit_score, 0) / data.length,
      recommendations: {
        delete: data.filter(r => r.recommendation === 'DELETE').length,
        respond: data.filter(r => r.recommendation === 'RESPOND').length,
        investigate: data.filter(r => r.recommendation === 'INVESTIGATE').length
      },
      high_bullshit_caught: data.filter(r => r.bullshit_score > 0.8).length
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// REMOVED: PhD Debate endpoint - Sage works alone now

// REMOVED: Multiple PhD agents - Sage is the only agent now

// Get Sage's analysis transparency - show the actual prompt
app.get('/api/sage/transparency', (req, res) => {
  res.json({
    personality: 'Sage - Brutally honest inbox protector',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.7,
    max_tokens: 2000,
    note: 'Sage uses Claude Sonnet 3.5 exclusively. No hidden logic, no Math.random().'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
🧠 Sage API is alive on port ${PORT}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brutally honest inbox protection active.
No Math.random() here - just truth.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;