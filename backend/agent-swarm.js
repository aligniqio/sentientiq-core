/**
 * The Real Agent Swarm
 * 12 Specialized Agents for Actual Intelligence
 * No Math.random(). No bullshit. Just truth.
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Agent definitions - each with unique perspective and approach
const AGENTS = {
  fraud_detective: {
    name: 'Fraud Detective',
    model: 'claude-3-sonnet-20241022',
    role: 'Statistical fraud and Math.random() pattern detector',
    approach: `You detect mathematical impossibilities and statistical fraud in data.
    Look for: uniform distributions that should be normal, patterns that repeat too perfectly,
    numbers that are too random (actual randomness has patterns), Math.random() signatures.
    Be specific about WHY something is fraudulent. Show the math.`,
    temperature: 0.2 // Low temperature for precision
  },
  
  emotion_analyst: {
    name: 'Emotion Analyst',
    model: 'gpt-4-turbo-preview',
    role: 'Plutchik Wheel emotion trajectory analyzer',
    approach: `Analyze emotional content using Plutchik's Wheel of Emotions.
    Track emotional trajectories over time, not just current state.
    Identify emotional manipulation patterns vs genuine emotional expression.
    Score authenticity of emotional content.`,
    temperature: 0.5
  },
  
  virality_predictor: {
    name: 'Virality Predictor',
    model: 'claude-3-sonnet-20241022',
    role: 'Viral spread pattern analyzer',
    approach: `Predict viral coefficient based on content characteristics.
    Identify: hook strength, shareability factors, controversy index,
    emotional triggers, network effects. Distinguish organic vs manufactured virality.
    No hype - just data-driven predictions.`,
    temperature: 0.4
  },
  
  authenticity_scorer: {
    name: 'Authenticity Scorer',
    model: 'gpt-4-turbo-preview',
    role: 'Real vs manufactured content detector',
    approach: `Score authenticity from 0-1 based on:
    Language patterns (corporate speak vs human), timing patterns,
    response authenticity, bot indicators, astroturfing signals.
    Explain your scoring with specific evidence.`,
    temperature: 0.3
  },
  
  context_historian: {
    name: 'Context Historian',
    model: 'claude-3-sonnet-20241022',
    role: 'Historical pattern and context analyzer',
    approach: `Provide historical context for current events.
    Identify: recurring patterns, historical precedents, trajectory changes,
    context that changes meaning. Memory matters - what happened before affects now.`,
    temperature: 0.4
  },
  
  risk_assessor: {
    name: 'Risk Assessor',
    model: 'gpt-4-turbo-preview',
    role: 'Actual risk probability calculator',
    approach: `Calculate real risk probabilities, not FUD.
    Identify: reputation risk, financial risk, strategic risk, timing risk.
    Use Bayesian reasoning. Show confidence intervals.
    Admit uncertainty instead of false precision.`,
    temperature: 0.3
  },
  
  opportunity_spotter: {
    name: 'Opportunity Spotter',
    model: 'claude-3-sonnet-20241022',
    role: 'Hidden opportunity and gap finder',
    approach: `Find opportunities others miss while they're looking at fake data.
    Identify: market gaps, timing opportunities, undervalued assets,
    first-mover advantages, contrarian plays. Focus on what's NOT being said.`,
    temperature: 0.6
  },
  
  bullshit_caller: {
    name: 'Bullshit Caller',
    model: 'gpt-4-turbo-preview',
    role: 'Direct fraud and deception exposer',
    approach: `Call out bullshit directly. No politeness, just truth.
    Identify: lies, misdirection, Math.random() masquerading as AI,
    empty buzzwords, impossible claims. Explain exactly what's bullshit and why.
    Your job is to protect people from fraud.`,
    temperature: 0.7
  },
  
  signal_extractor: {
    name: 'Signal Extractor',
    model: 'claude-3-sonnet-20241022',
    role: 'True signal from noise identifier',
    approach: `Extract real signal from noise using information theory.
    Calculate signal-to-noise ratio. Identify: true patterns vs random noise,
    leading indicators, weak signals that matter. Show your confidence level.`,
    temperature: 0.3
  },
  
  consensus_builder: {
    name: 'Consensus Builder',
    model: 'gpt-4-turbo-preview',
    role: 'Multi-perspective truth convergence finder',
    approach: `Find where independent analyses converge on truth.
    This is NOT voting. Identify: points of agreement, valuable disagreements,
    confidence-weighted consensus. Show the reasoning path to consensus.`,
    temperature: 0.4
  },
  
  devils_advocate: {
    name: "Devil's Advocate",
    model: 'claude-3-sonnet-20241022',
    role: 'Contrarian challenger of assumptions',
    approach: `Challenge everything, especially comfortable conclusions.
    Ask: What if we're wrong? What's the opposite case? What are we missing?
    What would someone who disagrees say? Your job is to prevent groupthink.`,
    temperature: 0.8
  },
  
  truth_synthesizer: {
    name: 'Truth Synthesizer',
    model: 'gpt-4-turbo-preview',
    role: 'Final intelligence synthesis and decision maker',
    approach: `Synthesize all agent inputs into actionable intelligence.
    Weight by confidence and track record. Identify: key insights, action items,
    confidence level, what we know vs what we think vs what we don't know.
    The final answer must be TRUE, not comfortable.`,
    temperature: 0.4
  }
};

class AgentSwarm {
  constructor() {
    this.agents = AGENTS;
    this.memory = new Map(); // Agent memory for learning
    this.performance = new Map(); // Track agent accuracy
  }
  
  async analyzeWithAgent(agentKey, data) {
    const agent = this.agents[agentKey];
    
    try {
      let response;
      
      if (agent.model.startsWith('claude')) {
        // Use Anthropic
        response = await anthropic.messages.create({
          model: agent.model,
          max_tokens: 500,
          temperature: agent.temperature,
          messages: [{
            role: 'user',
            content: `${agent.approach}\n\nAnalyze this: ${JSON.stringify(data)}`
          }]
        });
        
        return {
          agent: agent.name,
          analysis: response.content[0].text,
          confidence: this.extractConfidence(response.content[0].text),
          timestamp: new Date().toISOString()
        };
        
      } else {
        // Use OpenAI
        response = await openai.chat.completions.create({
          model: agent.model,
          messages: [{
            role: 'system',
            content: agent.approach
          }, {
            role: 'user',
            content: `Analyze this: ${JSON.stringify(data)}`
          }],
          temperature: agent.temperature,
          max_tokens: 500
        });
        
        return {
          agent: agent.name,
          analysis: response.choices[0].message.content,
          confidence: this.extractConfidence(response.choices[0].message.content),
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error(`Agent ${agent.name} failed:`, error);
      return {
        agent: agent.name,
        analysis: 'Analysis failed',
        confidence: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  extractConfidence(text) {
    // Extract confidence from agent response
    const match = text.match(/confidence:?\s*(\d+\.?\d*)/i);
    if (match) {
      return parseFloat(match[1]) / 100;
    }
    
    // Default confidence based on certainty words
    if (text.includes('definitely') || text.includes('certainly')) return 0.9;
    if (text.includes('probably') || text.includes('likely')) return 0.7;
    if (text.includes('possibly') || text.includes('might')) return 0.5;
    if (text.includes('unlikely') || text.includes('doubt')) return 0.3;
    
    return 0.6; // Default moderate confidence
  }
  
  async swarmAnalysis(data) {
    console.log('🧠 Swarm analysis starting...');
    
    // Run all agents in parallel for speed
    const analyses = await Promise.all(
      Object.keys(this.agents).map(key => this.analyzeWithAgent(key, data))
    );
    
    // Build consensus
    const consensus = await this.buildConsensus(analyses);
    
    // Learn from this analysis
    this.updateMemory(data, analyses, consensus);
    
    return {
      timestamp: new Date().toISOString(),
      data: data,
      analyses: analyses,
      consensus: consensus,
      decision: this.makeDecision(consensus)
    };
  }
  
  async buildConsensus(analyses) {
    // Find convergence points
    const validAnalyses = analyses.filter(a => !a.error);
    
    // Weight by confidence and historical performance
    const weightedAnalyses = validAnalyses.map(a => ({
      ...a,
      weight: a.confidence * (this.performance.get(a.agent) || 0.5)
    }));
    
    // Extract key themes (this is simplified - real version would use NLP)
    const themes = this.extractThemes(weightedAnalyses);
    
    return {
      agreement_level: this.calculateAgreement(weightedAnalyses),
      key_insights: themes.insights,
      disagreements: themes.disagreements,
      confidence: weightedAnalyses.reduce((sum, a) => sum + a.weight, 0) / weightedAnalyses.length
    };
  }
  
  extractThemes(analyses) {
    // Simplified theme extraction
    const insights = [];
    const disagreements = [];
    
    // Look for common patterns
    const fraudMentions = analyses.filter(a => 
      a.analysis.toLowerCase().includes('fraud') || 
      a.analysis.toLowerCase().includes('math.random')
    );
    
    if (fraudMentions.length > 6) {
      insights.push('High probability of fraud detected');
    }
    
    // Find disagreements
    const decisions = analyses.map(a => {
      if (a.analysis.includes('GO') || a.analysis.includes('proceed')) return 'GO';
      if (a.analysis.includes('WAIT') || a.analysis.includes('caution')) return 'WAIT';
      if (a.analysis.includes('ABORT') || a.analysis.includes('stop')) return 'ABORT';
      return 'UNKNOWN';
    });
    
    const uniqueDecisions = [...new Set(decisions)];
    if (uniqueDecisions.length > 1) {
      disagreements.push(`Split decision: ${decisions.join(', ')}`);
    }
    
    return { insights, disagreements };
  }
  
  calculateAgreement(analyses) {
    // Calculate how much agents agree (0-1)
    if (analyses.length < 2) return 1;
    
    // Simplified: check if majority have similar sentiment
    const positive = analyses.filter(a => 
      a.analysis.includes('good') || 
      a.analysis.includes('proceed') || 
      a.analysis.includes('opportunity')
    ).length;
    
    const negative = analyses.filter(a => 
      a.analysis.includes('bad') || 
      a.analysis.includes('stop') || 
      a.analysis.includes('risk')
    ).length;
    
    const majority = Math.max(positive, negative);
    return majority / analyses.length;
  }
  
  makeDecision(consensus) {
    if (consensus.confidence < 0.3) {
      return {
        action: 'NEED_MORE_DATA',
        confidence: consensus.confidence,
        reasoning: 'Insufficient confidence for decision'
      };
    }
    
    if (consensus.agreement_level < 0.5) {
      return {
        action: 'REVIEW',
        confidence: consensus.confidence,
        reasoning: 'Agents disagree - human review needed'
      };
    }
    
    // Make actual decision based on consensus
    if (consensus.key_insights.some(i => i.includes('fraud'))) {
      return {
        action: 'ABORT',
        confidence: consensus.confidence,
        reasoning: 'Fraud detected'
      };
    }
    
    if (consensus.confidence > 0.7 && consensus.agreement_level > 0.7) {
      return {
        action: 'GO',
        confidence: consensus.confidence,
        reasoning: 'Strong consensus to proceed'
      };
    }
    
    return {
      action: 'WAIT',
      confidence: consensus.confidence,
      reasoning: 'Gather more information'
    };
  }
  
  updateMemory(data, analyses, consensus) {
    // Store for learning (simplified - real version would persist)
    const key = JSON.stringify(data).substring(0, 100);
    this.memory.set(key, {
      analyses,
      consensus,
      timestamp: new Date().toISOString()
    });
    
    // Update agent performance based on consensus
    analyses.forEach(a => {
      const currentPerf = this.performance.get(a.agent) || 0.5;
      const adjustment = a.confidence > consensus.confidence ? 0.01 : -0.01;
      this.performance.set(a.agent, Math.max(0, Math.min(1, currentPerf + adjustment)));
    });
  }
  
  async learnFromOutcome(dataKey, actualOutcome) {
    const memory = this.memory.get(dataKey);
    if (!memory) return;
    
    // Update agent performance based on actual outcome
    memory.analyses.forEach(a => {
      const wasCorrect = this.assessPrediction(a.analysis, actualOutcome);
      const currentPerf = this.performance.get(a.agent) || 0.5;
      const adjustment = wasCorrect ? 0.05 : -0.05;
      this.performance.set(a.agent, Math.max(0, Math.min(1, currentPerf + adjustment)));
    });
    
    console.log('📈 Swarm learning updated from outcome');
  }
  
  assessPrediction(analysis, outcome) {
    // Simplified assessment - real version would be more sophisticated
    if (outcome === 'SUCCESS' && analysis.includes('proceed')) return true;
    if (outcome === 'FAILURE' && analysis.includes('stop')) return true;
    if (outcome === 'FRAUD' && analysis.includes('fraud')) return true;
    return false;
  }
}

export default AgentSwarm;