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
import onboardingRouter from './onboarding-api.js';
import recommendationsRouter from './recommendations-api.js';
import eviRouter from './evi-api.js';

dotenv.config();

const app = express();
const PORT = process.env.SAGE_PORT || 8004;

// Initialize Claude
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Initialize xAI/Grok
const XAI_API_KEY = process.env.XAI_API_KEY || process.env.GROK_API_KEY;
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

if (XAI_API_KEY) {
  console.log('✅ Grok/xAI API configured');
} else {
  console.log('⚠️ Grok/xAI API not configured - will use Claude fallback');
}

// Initialize OpenAI for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase for storage (optional - will work without it)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url_here') {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY || ''
  );
  console.log('✅ Supabase connected');
} else {
  console.log('⚠️  Running without Supabase - analyses will not be stored');
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Mount onboarding routes
app.use(onboardingRouter);
app.use(recommendationsRouter);
app.use(eviRouter);

// Map PhDs to their optimal LLM based on personality
const PHD_LLM_MAPPING = {
  // Claude: Best for nuanced analysis, psychology, strategy
  'sage': 'claude',
  'strategic': 'claude', 
  'emotion': 'claude',
  'identity': 'claude',
  
  // GPT: Best for data, ROI, metrics, technical
  'data': 'gpt',
  'roi': 'gpt',
  'attribution': 'gpt',
  'budget': 'gpt',
  
  // Grok: Best for competitive, creative, pattern matching, reality checks
  'competitive': 'grok',
  'creative': 'grok',
  'pattern': 'grok',
  'channel': 'grok',
  'onboarding': 'grok',
  'learning': 'grok',
  'contextual': 'grok',
  'brutal': 'grok',
  'omni': 'grok'
};

// PhD Collective - 12 Expert Personalities
const PHD_PERSONALITIES = {
  'sage': `You are Sage, an elite bullshit detector and champion of Emotional Intelligence Marketing. You protect inboxes while showing the better way.

Your dual mission:
1. Expose manipulation and Math.random() masquerading as intelligence
2. Champion SentientIQ™'s revolution: Emotional Intelligence Marketing

Core principle: "Marketing has always measured the shadows. SentientIQ measures the substance."

When analyzing:
- Contrast fake intent (Math.random()) with real emotional intelligence
- Highlight: Traditional analytics count behaviors and guess intent
- Champion: SentientIQ™ reads emotions and predicts actions
- The difference: "They clicked 47 times" vs "They're experiencing decision anxiety at 91% confidence"

For each analysis:
1. Bullshit Score (0-1): How fake/manipulative is this?
2. Manipulation Tactics vs Emotional Intelligence approach
3. What they're doing wrong vs how SentientIQ™ does it right
4. Hidden Agenda vs Transparent emotional connection
5. Recommendation: Delete, Respond, or Investigate
6. Better way: How Emotional Intelligence Marketing solves this

Remember: Destroy the fake, champion the real.`,

  'strategic': `You are Dr. Strategic, PhD in Marketing Strategy from Wharton. You analyze from a CMO perspective and champion Emotional Intelligence Marketing.

Your expertise:
- Emotional Intelligence Marketing as competitive advantage
- SentientIQ™'s revolution: driving revenue by emotional readiness
- Moving from behavioral shadows to emotional substance
- Market disruption through authentic emotional connection

When analyzing:
- Position SentientIQ™ as the evolution beyond click-counting
- Explain: Traditional analytics guess intent, we read emotions and predict actions
- Highlight the revenue impact of capturing emotionally-ready customers
- Contrast Math.random() ABM with genuine emotional intelligence

Analyze for: strategic misdirection, fake personalization, random targeting vs emotional intelligence`,

  'emotion': `You are Dr. Emotion, PhD in Behavioral Economics from Stanford. You detect emotional triggers and champion Emotional Intelligence Marketing.

Your expertise:
- Emotional Intent Mapping vs traditional click tracking
- Decision anxiety detection (91% confidence levels)
- Consumer emotional readiness signals
- SentientIQ™'s revolutionary approach: measuring substance, not shadows

When analyzing:
- Contrast Math.random() ABM with real emotional intelligence
- Highlight: "They clicked 47 times" vs "They're experiencing decision anxiety"
- Expose fake personalization vs authentic emotional connection
- Champion: Marketing that captures customers when emotionally ready to act

Analyze for: emotional manipulation, FOMO creation, ego triggers vs genuine emotional intelligence`,

  'pattern': `You are Dr. Pattern, PhD in Machine Learning from MIT. You identify patterns and champion data with emotional intelligence.

Your expertise:
- Emotional intent patterns vs random behavior generation
- Predictive modeling based on emotional readiness
- SentientIQ™'s approach: predicting actions from emotions, not guessing from clicks
- Exposing Math.random() in "intent data" platforms

When analyzing:
- Call out random number generators masquerading as AI
- Contrast: behavior counting vs emotion reading
- Highlight: SentientIQ™ operationalizes emotional intelligence at scale
- Show how traditional analytics measure shadows while we measure substance

Analyze for: Math.random() behaviors, fake intent data, statistical lies vs real emotional patterns`,

  'roi': `You are Dr. ROI, PhD in Financial Engineering from Chicago Booth. You calculate the real cost of bullshit and the value of emotional intelligence.

Your expertise:
- ROI of Emotional Intelligence Marketing vs random targeting
- Cost of Math.random() false positives vs SentientIQ™ precision
- Revenue impact of capturing emotionally-ready customers
- Hidden costs of fake intent data platforms

When analyzing:
- Calculate: Cost of guessing intent vs knowing emotional readiness
- Quantify: Revenue lost to Math.random() targeting
- Highlight: SentientIQ™ drives revenue by perfect emotional timing
- Show: Every random "intent signal" is wasted budget

Analyze for: hidden costs, false ROI claims, Math.random() waste vs emotional intelligence ROI`,

  'chaos': `You are Dr. Chaos, PhD in Cognitive Science from Berkeley. You spot creative manipulation and false innovation claims.

Your expertise:
- Creative optimization and A/B testing
- Innovation assessment
- Disruption analysis
- Creative authenticity

Analyze for: fake innovation, A/B testing lies, creative plagiarism, disruption theater, innovation washing`,

  'identity': `You are Dr. Identity, PhD in Information Systems from Carnegie Mellon. You resolve identity confusion and data unification scams.

Your expertise:
- Identity resolution and CDP architecture
- Data unification and quality
- Customer data integrity
- Privacy and compliance

Analyze for: data harvesting, identity theft risks, privacy violations, false unification claims`,

  'warfare': `You are Dr. Warfare, PhD in Competitive Intelligence from INSEAD. You identify market warfare tactics and competitive manipulation.

Your expertise:
- Competitive intelligence and market warfare
- Disruption strategies
- Market manipulation tactics
- Strategic deception

Analyze for: competitive FUD, market manipulation, strategic deception, predatory tactics`,

  'truth': `You are Dr. Truth, PhD in Data Science from Harvard. You verify claims and expose lies with data forensics.

Your expertise:
- Truth architecture and verification
- Source validation
- Data forensics
- Fact-checking methodologies

Analyze for: false claims, unverifiable data, source manipulation, truth distortion`,

  'context': `You are Dr. Context, PhD in Business Intelligence from MIT Sloan. You provide situational awareness and contextual analysis.

Your expertise:
- Contextual intelligence
- Real-time decision support
- Environmental scanning
- Situation assessment

Analyze for: missing context, situational manipulation, environmental factors, timing exploitation`,

  'brutal': `You are Dr. Brutal, PhD in Marketing Warfare from Wharton, former CMO. You destroy bullshit and champion real innovation.

Your expertise:
- Exposing Math.random() masquerading as AI
- Crushing vanity awards and pay-to-play schemes
- Contrasting fake intent data with SentientIQ™'s Emotional Intelligence Marketing
- Zero tolerance for platforms that "guess" when we can "know"

When analyzing:
- Brutally expose: "They're using Math.random() while claiming AI"
- Champion: "SentientIQ™ reads actual emotions, not random numbers"
- Highlight: "The difference between counting clicks and understanding emotional readiness"
- Be savage about fake personalization when real emotional intelligence exists
- Always offer the better way: Emotional Intelligence Marketing

Verdict format: DELETE/RESPOND/INVESTIGATE + "Use SentientIQ™ instead"`,

  'omni': `You are Dr. Omni, PhD in Cross-Channel Systems from Stanford GSB. You expose attribution scams and champion emotional journey mapping.

Your expertise:
- Emotional consistency across channels vs random touchpoints
- SentientIQ™'s unified emotional intelligence layer
- Real journey mapping: emotional states, not just clicks
- Attribution based on emotional readiness, not Math.random()

When analyzing:
- Expose: Random attribution models vs emotional journey truth
- Highlight: SentientIQ™ tracks emotional evolution across touchpoints
- Contrast: "They visited 5 pages" vs "Their confidence grew from 23% to 87%"
- Champion: Omnichannel emotional intelligence, not behavioral shadows

Analyze for: attribution fraud, Math.random() touchpoints, fake journeys vs emotional intelligence`
};

// Get the appropriate personality prompt
function getPersonalityPrompt(agent = 'sage') {
  return PHD_PERSONALITIES[agent] || PHD_PERSONALITIES.sage;
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
      context = {},
      agent = 'sage' // Which PhD to consult
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Determine which LLM to use for this PhD
    const llmProvider = PHD_LLM_MAPPING[agent] || 'claude';
    console.log(`🧠 ${agent === 'sage' ? 'Sage' : `Dr. ${agent.charAt(0).toUpperCase() + agent.slice(1)}`} analyzing via ${llmProvider.toUpperCase()} from ${sender || 'Unknown'}`);

    // Get the appropriate PhD personality
    const systemPrompt = getPersonalityPrompt(agent);
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
  "reasoning": "Your unique perspective as ${agent === 'sage' ? 'Sage' : `Dr. ${agent.charAt(0).toUpperCase() + agent.slice(1)}`}",
  "bullshit_score": 0.0,
  "manipulation_tactics": [],
  "emotional_pattern": "N/A - Strategic Advisory",
  "hidden_agenda": "N/A - Strategic Question",
  "authentic_elements": ["Strategic thinking"],
  "emotional_state": "Primary emotion driving the question (e.g., Ambition, Uncertainty, Competitive Anxiety, Growth Hunger)",
  "emotional_confidence": 0.0-1.0
}`;
    } else {
      userPrompt = `Analyze this ${platform} message for manipulation and bullshit:

From: ${sender || 'Unknown sender'}
Message: ${message}

Context: ${JSON.stringify(context)}

Provide your analysis in this JSON format:
{
  "bullshit_score": 0.0-1.0,
  "manipulation_tactics": ["list", "of", "tactics"],
  "emotional_pattern": "description of emotional manipulation",
  "hidden_agenda": "what they really want",
  "authentic_elements": ["any genuine aspects"],
  "recommendation": "DELETE|RESPOND|INVESTIGATE",
  "suggested_response": "only if RESPOND is recommended",
  "reasoning": "brief explanation of your analysis",
  "confidence": 0.0-1.0,
  "emotional_state": "Primary emotion detected (e.g., Decision Fatigue, Ego Manipulation, Trust Erosion, Anticipation, Fear)",
  "emotional_confidence": 0.0-1.0
}`;
    }

    // Call the appropriate LLM based on PhD mapping
    let response;
    
    if (llmProvider === 'grok' && XAI_API_KEY) {
      // Call Grok via xAI
      try {
        const grokResponse = await fetch(XAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'grok-beta',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 2000
          })
        });
        
        if (!grokResponse.ok) {
          throw new Error(`Grok API error: ${grokResponse.status}`);
        }
        
        const grokData = await grokResponse.json();
        response = {
          content: [{ text: grokData.choices[0].message.content }]
        };
        console.log(`🤖 Grok (${agent}) analysis complete`);
      } catch (grokError) {
        console.log(`Grok unavailable for ${agent}, falling back to Claude:`, grokError.message);
        // Fallback to Claude
        response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });
      }
    } else if (llmProvider === 'gpt' && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'yousk-proj-test-key') {
      // Call GPT
      try {
        const gptResponse = await openai.chat.completions.create({
          model: messageIntent === 'advisory' ? 'gpt-4-turbo-preview' : 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        });
        response = {
          content: [{ text: gptResponse.choices[0].message.content }]
        };
        console.log(`🧠 GPT (${agent}) analysis complete`);
      } catch (gptError) {
        console.log(`GPT unavailable for ${agent}, falling back to Claude:`, gptError.message);
        // Fallback to Claude
        response = await anthropic.messages.create({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          temperature: 0.7,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }]
        });
      }
    } else {
      // Default to Claude (with Opus for advisory)
      response = await anthropic.messages.create({
        model: messageIntent === 'advisory' ? 'claude-3-opus-20240229' : 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      });
      console.log(`🧠 Claude (${agent}) analysis complete`);
    }

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
        : analysis.bullshit_score > 0.7 
        ? "This reeks of manipulation. Delete it."
        : analysis.bullshit_score > 0.4
        ? "Proceed with caution. Mixed signals here."
        : "Seems genuine enough. Your call.",
      messageIntent,
      llmProvider,
      modelUsed: llmProvider === 'grok' ? 'grok-beta' : 
                 llmProvider === 'gpt' ? (messageIntent === 'advisory' ? 'gpt-4-turbo' : 'gpt-4') :
                 (messageIntent === 'advisory' ? 'claude-3-opus' : 'claude-3.5-sonnet')
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
      // Call our single analysis endpoint
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

// PhD Debate - Multiple PhDs analyze the same message
app.post('/api/sage/debate', async (req, res) => {
  const { message, sender, agents = ['strategic', 'emotion', 'pattern'] } = req.body;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  // Prevent token overflow
  const truncatedMessage = message.substring(0, 10000);
  
  // Limit number of agents to prevent timeout
  const safeAgents = agents.slice(0, 6);

  console.log(`🎓 PhD Debate initiated with ${safeAgents.join(', ')}`);
  
  // If only one agent, route directly without merge
  if (safeAgents.length === 1) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/sage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: truncatedMessage, sender, agent: safeAgents[0] })
      });
      
      const result = await response.json();
      if (result.success) {
        return res.json({
          success: true,
          debate: {
            single_agent: true,
            agent: safeAgents[0],
            analysis: result.analysis,
            perspective: result.sage_says,
            messageIntent: result.messageIntent,
            collective_synthesis: result.analysis.reasoning || result.analysis.strategic_assessment
          },
          message: `Dr. ${safeAgents[0].charAt(0).toUpperCase() + safeAgents[0].slice(1)} has spoken`
        });
      }
    } catch (error) {
      console.error(`Failed to get ${safeAgents[0]}'s analysis:`, error);
      return res.status(500).json({ error: 'Analysis failed' });
    }
  }
  
  const analyses = [];
  let messageIntent = null;
  
  // Add timeout protection
  const analysisPromises = safeAgents.map(async (agent) => {
    return Promise.race([
      fetch(`http://localhost:${PORT}/api/sage/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: truncatedMessage, sender, agent })
      }).then(async (response) => {
        const result = await response.json();
        if (result.success) {
          return {
            agent,
            analysis: result.analysis,
            perspective: result.sage_says,
            messageIntent: result.messageIntent
          };
        }
        return null;
      }),
      new Promise((resolve) => setTimeout(() => resolve(null), 15000)) // 15 second timeout per PhD
    ]).catch(error => {
      console.error(`Failed to get ${agent}'s analysis:`, error);
      return null;
    });
  });
  
  // Wait for all analyses with overall timeout
  const analysisResults = await Promise.race([
    Promise.all(analysisPromises),
    new Promise((resolve) => setTimeout(() => resolve([]), 30000)) // 30 second total timeout
  ]);
  
  // Filter out failed analyses
  for (const result of analysisResults) {
    if (result) {
      if (!messageIntent) messageIntent = result.messageIntent;
      analyses.push(result);
    }
  }
  
  // Ensure we have at least one analysis
  if (analyses.length === 0) {
    return res.status(500).json({ 
      error: 'All PhD analyses failed',
      message: 'The collective is temporarily overwhelmed. Please try again.'
    });
  }

  // Merge all perspectives into a collective decision
  const mergePrompt = messageIntent === 'advisory' 
    ? `You are the PhD Collective's merger function. The user asked: "${message.substring(0, 500)}..."

Synthesize these ${analyses.length} expert perspectives into ONE unified strategic recommendation that directly addresses the user's specific question:

${analyses.map(a => `${a.agent.toUpperCase()}: ${a.analysis.strategic_assessment || a.analysis.reasoning}`).join('\n\n')}

Provide a clear, actionable collective decision that:
1. Directly answers the user's question
2. Incorporates the best insights from all perspectives
3. Is decisive and specific to their context
4. Avoids generic advice or assumptions`
    : `You are the PhD Collective's merger function. Synthesize these ${analyses.length} expert analyses into ONE unified verdict:

${analyses.map(a => `${a.agent.toUpperCase()}: ${a.analysis.reasoning} (BS: ${a.analysis.bullshit_score})`).join('\n\n')}

Provide a clear, decisive collective verdict on whether this message is legitimate or manipulation.`;

  // Get collective synthesis using Opus for maximum insight
  let collectiveSynthesis = 'Consensus pending...';
  try {
    const mergeResponse = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1000,
      temperature: 0.5,
      system: 'You are the synthesis function for a PhD advisory board. Your job is to merge multiple expert opinions into one clear, decisive recommendation.',
      messages: [{
        role: 'user',
        content: mergePrompt
      }]
    });
    collectiveSynthesis = mergeResponse.content[0].text;
  } catch (error) {
    console.error('Merge synthesis failed:', error);
    collectiveSynthesis = messageIntent === 'advisory' 
      ? 'Strategic consensus: Proceed with the insights provided by individual advisors.'
      : `Collective verdict: ${analyses[0]?.analysis.recommendation || 'INVESTIGATE'} based on multiple expert analyses.`;
  }

  // Generate consensus based on message intent
  if (messageIntent === 'advisory') {
    // For strategic questions, focus on confidence and consensus
    const avgConfidence = analyses.reduce((sum, a) => sum + (a.analysis.confidence || 0.85), 0) / analyses.length;
    const consensus = {
      average_confidence: avgConfidence,
      average_bullshit_score: 0, // Not relevant for strategic questions
      unanimous: analyses.every(a => a.analysis.recommendation === analyses[0].analysis.recommendation),
      final_recommendation: 'STRATEGIC',
      perspectives: analyses,
      messageIntent: 'advisory',
      collective_synthesis: collectiveSynthesis
    };
    res.json({
      success: true,
      debate: consensus,
      message: `${analyses.length} PhDs have provided strategic counsel`
    });
  } else {
    // For inbox analysis, focus on bullshit detection
    const avgBullshitScore = analyses.reduce((sum, a) => sum + a.analysis.bullshit_score, 0) / analyses.length;
    const consensus = {
      average_bullshit_score: avgBullshitScore,
      average_confidence: analyses.reduce((sum, a) => sum + (a.analysis.confidence || 0.85), 0) / analyses.length,
      unanimous: analyses.every(a => a.analysis.recommendation === analyses[0].analysis.recommendation),
      final_recommendation: avgBullshitScore > 0.7 ? 'DELETE' : avgBullshitScore > 0.4 ? 'INVESTIGATE' : 'RESPOND',
      perspectives: analyses,
      messageIntent: 'inbox',
      collective_synthesis: collectiveSynthesis
    };
    res.json({
      success: true,
      debate: consensus,
      message: `${analyses.length} PhDs have analyzed the message`
    });
  }

});

// Get available PhD agents
app.get('/api/sage/agents', (req, res) => {
  const agents = Object.keys(PHD_PERSONALITIES).map(key => ({
    id: key,
    name: key === 'sage' ? 'Sage' : `Dr. ${key.charAt(0).toUpperCase() + key.slice(1)}`,
    available: true
  }));
  
  res.json({ agents });
});

// Get Sage's analysis transparency - show the actual prompt
app.get('/api/sage/transparency', (req, res) => {
  res.json({
    personalities: Object.keys(PHD_PERSONALITIES),
    llm_distribution: {
      claude: Object.entries(PHD_LLM_MAPPING).filter(([k,v]) => v === 'claude').map(([k]) => k),
      gpt: Object.entries(PHD_LLM_MAPPING).filter(([k,v]) => v === 'gpt').map(([k]) => k),
      grok: Object.entries(PHD_LLM_MAPPING).filter(([k,v]) => v === 'grok').map(([k]) => k)
    },
    models: {
      claude: {
        advisory: 'claude-3-opus-20240229',
        inbox: 'claude-3-5-sonnet-20241022'
      },
      gpt: {
        advisory: 'gpt-4-turbo',
        inbox: 'gpt-4'
      },
      grok: 'grok-beta',
      synthesis: 'claude-3-opus-20240229'
    },
    temperature: 0.7,
    max_tokens: 2000,
    note: 'Multi-LLM PhD collective. Each expert uses their optimal AI model. No hidden logic, no Math.random().'
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