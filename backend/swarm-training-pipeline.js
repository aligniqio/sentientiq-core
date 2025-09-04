/**
 * Swarm Training Pipeline
 * The swarm gets smarter with every truth it finds
 * Every lie it exposes makes it better at finding the next one
 */

import { createClient } from '@supabase/supabase-js';
import AgentSwarm from './agent-swarm.js';
import fs from 'fs/promises';
import path from 'path';

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://ujoheqdvzndrajfbqzxq.supabase.co',
  process.env.SUPABASE_KEY || 'your-key-here'
);

class SwarmTrainingPipeline {
  constructor() {
    this.swarm = new AgentSwarm();
    this.trainingData = [];
    this.validationData = [];
    this.modelPath = './models/swarm-memory.json';
  }
  
  async loadTrainingData() {
    console.log('📚 Loading training data from Supabase...');
    
    // Load posts that have been verified as fraud
    const { data: fraudPosts } = await supabase
      .from('enriched_social_data')
      .select('*')
      .or('content.ilike.%math.random%,content.ilike.%fake%,content.ilike.%fraud%')
      .limit(500);
    
    // Load posts that are genuine
    const { data: genuinePosts } = await supabase
      .from('enriched_social_data')
      .select('*')
      .not('content', 'ilike', '%math.random%')
      .limit(500);
    
    // Label the data
    this.trainingData = [
      ...fraudPosts.map(p => ({ ...p, label: 'FRAUD', verified: true })),
      ...genuinePosts.map(p => ({ ...p, label: 'GENUINE', verified: true }))
    ];
    
    console.log(`✅ Loaded ${this.trainingData.length} training samples`);
    
    // Split into training and validation
    const splitIndex = Math.floor(this.trainingData.length * 0.8);
    this.validationData = this.trainingData.slice(splitIndex);
    this.trainingData = this.trainingData.slice(0, splitIndex);
  }
  
  async trainSwarm() {
    console.log('🧠 Training swarm on historical data...');
    
    const results = {
      correct: 0,
      incorrect: 0,
      agentPerformance: new Map()
    };
    
    // Train on each sample
    for (const sample of this.trainingData) {
      const analysis = await this.swarm.swarmAnalysis({
        content: sample.content,
        platform: sample.platform,
        timestamp: sample.timestamp
      });
      
      // Check if swarm got it right
      const swarmDecision = analysis.decision.action;
      const correct = this.evaluateDecision(swarmDecision, sample.label);
      
      if (correct) {
        results.correct++;
      } else {
        results.incorrect++;
      }
      
      // Update swarm memory with outcome
      await this.swarm.learnFromOutcome(
        JSON.stringify(sample).substring(0, 100),
        sample.label
      );
      
      // Track individual agent performance
      analysis.analyses.forEach(agentAnalysis => {
        const agent = agentAnalysis.agent;
        if (!results.agentPerformance.has(agent)) {
          results.agentPerformance.set(agent, { correct: 0, total: 0 });
        }
        
        const perf = results.agentPerformance.get(agent);
        perf.total++;
        
        if (this.evaluateAgentAnalysis(agentAnalysis.analysis, sample.label)) {
          perf.correct++;
        }
      });
      
      // Progress update
      if ((results.correct + results.incorrect) % 50 === 0) {
        const accuracy = results.correct / (results.correct + results.incorrect);
        console.log(`📊 Training progress: ${accuracy.toFixed(2)}% accurate`);
      }
    }
    
    // Final training metrics
    const accuracy = results.correct / (results.correct + results.incorrect);
    console.log(`\n🎯 Training Results:`);
    console.log(`   Overall Accuracy: ${(accuracy * 100).toFixed(1)}%`);
    console.log(`   Correct: ${results.correct}`);
    console.log(`   Incorrect: ${results.incorrect}`);
    
    // Agent performance breakdown
    console.log(`\n📊 Agent Performance:`);
    results.agentPerformance.forEach((perf, agent) => {
      const agentAccuracy = perf.correct / perf.total;
      console.log(`   ${agent}: ${(agentAccuracy * 100).toFixed(1)}% accurate`);
    });
    
    return results;
  }
  
  async validateSwarm() {
    console.log('\n🔍 Validating swarm on unseen data...');
    
    const results = {
      correct: 0,
      incorrect: 0,
      falsePositives: 0,
      falseNegatives: 0
    };
    
    for (const sample of this.validationData) {
      const analysis = await this.swarm.swarmAnalysis({
        content: sample.content,
        platform: sample.platform,
        timestamp: sample.timestamp
      });
      
      const swarmDecision = analysis.decision.action;
      const correct = this.evaluateDecision(swarmDecision, sample.label);
      
      if (correct) {
        results.correct++;
      } else {
        results.incorrect++;
        
        // Track false positives/negatives
        if (sample.label === 'FRAUD' && swarmDecision !== 'ABORT') {
          results.falseNegatives++;
        } else if (sample.label === 'GENUINE' && swarmDecision === 'ABORT') {
          results.falsePositives++;
        }
      }
    }
    
    // Validation metrics
    const accuracy = results.correct / (results.correct + results.incorrect);
    const precision = results.correct / (results.correct + results.falsePositives);
    const recall = results.correct / (results.correct + results.falseNegatives);
    const f1Score = 2 * (precision * recall) / (precision + recall);
    
    console.log(`\n✅ Validation Results:`);
    console.log(`   Accuracy: ${(accuracy * 100).toFixed(1)}%`);
    console.log(`   Precision: ${(precision * 100).toFixed(1)}%`);
    console.log(`   Recall: ${(recall * 100).toFixed(1)}%`);
    console.log(`   F1 Score: ${f1Score.toFixed(3)}`);
    console.log(`   False Positives: ${results.falsePositives}`);
    console.log(`   False Negatives: ${results.falseNegatives}`);
    
    return results;
  }
  
  evaluateDecision(decision, label) {
    if (label === 'FRAUD' && decision === 'ABORT') return true;
    if (label === 'GENUINE' && (decision === 'GO' || decision === 'WAIT')) return true;
    return false;
  }
  
  evaluateAgentAnalysis(analysis, label) {
    const analysisLower = analysis.toLowerCase();
    if (label === 'FRAUD') {
      return analysisLower.includes('fraud') || 
             analysisLower.includes('fake') || 
             analysisLower.includes('suspicious') ||
             analysisLower.includes('stop') ||
             analysisLower.includes('abort');
    } else {
      return !analysisLower.includes('fraud') && 
             !analysisLower.includes('fake') &&
             (analysisLower.includes('genuine') || 
              analysisLower.includes('authentic') ||
              analysisLower.includes('proceed') ||
              analysisLower.includes('legitimate'));
    }
  }
  
  async saveModel() {
    console.log('💾 Saving swarm memory...');
    
    const model = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      agentPerformance: Object.fromEntries(this.swarm.performance),
      memory: Object.fromEntries(this.swarm.memory),
      trainingMetrics: {
        samplesProcessed: this.trainingData.length,
        validationSamples: this.validationData.length
      }
    };
    
    // Ensure directory exists
    const dir = path.dirname(this.modelPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Save model
    await fs.writeFile(this.modelPath, JSON.stringify(model, null, 2));
    console.log(`✅ Model saved to ${this.modelPath}`);
  }
  
  async loadModel() {
    try {
      const modelData = await fs.readFile(this.modelPath, 'utf8');
      const model = JSON.parse(modelData);
      
      // Restore swarm state
      this.swarm.performance = new Map(Object.entries(model.agentPerformance));
      this.swarm.memory = new Map(Object.entries(model.memory));
      
      console.log(`✅ Loaded model version ${model.version} from ${model.timestamp}`);
      return true;
    } catch (error) {
      console.log('📝 No existing model found, starting fresh');
      return false;
    }
  }
  
  async continuousLearning() {
    console.log('🔄 Starting continuous learning loop...');
    
    // Check for new verified data every hour
    setInterval(async () => {
      console.log('🔍 Checking for new training data...');
      
      // Fetch recent posts that have been verified
      const { data: newData } = await supabase
        .from('enriched_social_data')
        .select('*')
        .gt('created_at', new Date(Date.now() - 3600000).toISOString())
        .not('verified_outcome', 'is', null);
      
      if (newData && newData.length > 0) {
        console.log(`📚 Found ${newData.length} new verified samples`);
        
        // Learn from new data
        for (const sample of newData) {
          await this.swarm.learnFromOutcome(
            JSON.stringify(sample).substring(0, 100),
            sample.verified_outcome
          );
        }
        
        // Save updated model
        await this.saveModel();
      }
    }, 3600000); // Every hour
  }
  
  async runPipeline() {
    console.log(`
╔════════════════════════════════════╗
║   SWARM TRAINING PIPELINE v1.0     ║
║   Making Honesty Profitable        ║
╚════════════════════════════════════╝
    `);
    
    // Try to load existing model
    const modelLoaded = await this.loadModel();
    
    if (!modelLoaded) {
      // Train from scratch
      await this.loadTrainingData();
      await this.trainSwarm();
      await this.validateSwarm();
      await this.saveModel();
    }
    
    // Start continuous learning
    await this.continuousLearning();
    
    console.log('\n🚀 Swarm is ready for real-time analysis');
    console.log('💡 The truth compounds. Every analysis makes us stronger.\n');
    
    return this.swarm;
  }
}

// Export for use in API
export default SwarmTrainingPipeline;

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const pipeline = new SwarmTrainingPipeline();
  pipeline.runPipeline().catch(console.error);
}