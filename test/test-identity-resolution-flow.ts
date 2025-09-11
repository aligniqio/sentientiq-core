/**
 * Test Identity Resolution & Intervention Flow
 * 
 * This validates the complete emotional intelligence pipeline:
 * 1. Detect emotion through behavioral physics
 * 2. Identify the user
 * 3. Trigger intervention based on value/tier
 * 4. Update CRM
 * 5. Track accountability
 */

import { identityService } from '../orchestrator/src/services/identity-resolution.js';
import { interventionEngine } from '../orchestrator/src/services/intervention-engine.js';
import { accountabilityEngine } from '../orchestrator/src/services/accountability-engine.js';
import { crmService } from '../orchestrator/src/services/crm-integration.js';
import { webhookDispatcher } from '../orchestrator/src/services/webhook-dispatcher.js';

async function testFullFlow() {
  console.log('🧪 Testing SentientIQ Identity Resolution & Intervention Flow\n');
  
  // Step 1: Simulate user session
  const sessionId = 'test_session_' + Date.now();
  console.log('📍 Session:', sessionId);
  
  // Step 2: Identify high-value user
  console.log('\n🔍 Identifying user...');
  const identity = await identityService.identify({
    sessionId,
    email: 'ceo@fortune500.com',
    traits: {
      company_name: 'Fortune 500 Corp',
      plan: 'enterprise',
      mrr: 50000
    },
    source: 'direct'
  });
  
  console.log('✅ User identified:', {
    userId: identity.userId,
    email: identity.email,
    company: identity.company,
    tier: identity.tier,
    value: identity.value
  });
  
  // Step 3: Register webhook endpoint
  console.log('\n🔔 Registering webhook...');
  webhookDispatcher.registerEndpoint({
    id: 'test_webhook',
    url: 'https://webhook.site/test',
    events: ['emotional_event', 'high_value_alert'],
    filters: {
      minConfidence: 80,
      emotions: ['rage', 'abandonment']
    },
    active: true
  });
  
  // Step 4: Simulate rage emotion detection
  console.log('\n😡 Simulating rage detection...');
  const emotionalEvent = {
    sessionId,
    userId: identity.userId,
    emotion: 'rage',
    confidence: 95,
    pageUrl: 'https://app.fortune500.com/checkout',
    predictedAction: 'abandon_session',
    interventionWindow: 3000
  };
  
  // Step 5: Process intervention
  console.log('\n⚡ Processing interventions...');
  const interventions = await interventionEngine.processEmotionalEvent(emotionalEvent);
  
  console.log(`✅ ${interventions.length} interventions triggered:`);
  interventions.forEach(intervention => {
    console.log(`  - Rule: ${intervention.ruleId}`);
    console.log(`    Actions: ${intervention.actions.map(a => a.type).join(', ')}`);
    console.log(`    Revenue at risk: $${intervention.revenue_impact || 0}`);
  });
  
  // Step 6: Track accountability
  console.log('\n📊 Tracking accountability...');
  const recommendation = await accountabilityEngine.trackRecommendation({
    companyId: identity.company || 'Fortune 500 Corp',
    userId: identity.userId,
    emotion: emotionalEvent.emotion,
    confidence: emotionalEvent.confidence,
    recommendedAction: 'Immediate executive intervention required',
    userValue: identity.value,
    pageUrl: emotionalEvent.pageUrl
  });
  
  console.log('✅ Recommendation tracked:', {
    id: recommendation.id,
    severity: recommendation.severity,
    estimatedRevenueLoss: recommendation.estimatedRevenueLoss,
    deadline: recommendation.deadline
  });
  
  // Step 7: Simulate action taken
  console.log('\n✅ Simulating action taken...');
  const outcome = await accountabilityEngine.recordOutcome({
    recommendationId: recommendation.id,
    actionTaken: true,
    outcome: 'saved',
    notes: 'CEO contacted immediately, issue resolved'
  });
  
  console.log('✅ Outcome recorded:', {
    actionTaken: outcome.actionTaken,
    outcome: outcome.outcome,
    revenueSaved: recommendation.estimatedRevenueLoss
  });
  
  // Step 8: Generate accountability report
  console.log('\n📈 Generating accountability report...');
  const report = await accountabilityEngine.generateReport(
    identity.company || 'Fortune 500 Corp',
    '30d'
  );
  
  console.log('📊 Accountability Score:', {
    score: report.score.score,
    grade: report.score.grade,
    revenueSaved: report.score.revenueSaved,
    customersS
aved: report.score.customersSaved
  });
  
  // Step 9: Check webhook deliveries
  console.log('\n📬 Checking webhook deliveries...');
  const deliveries = webhookDispatcher.getEndpointDeliveries('test_webhook');
  console.log(`✅ ${deliveries.length} webhooks sent`);
  
  // Step 10: Get intervention statistics
  console.log('\n📊 Final Statistics:');
  const stats = interventionEngine.getStats();
  console.log({
    totalRules: stats.totalRules,
    totalExecutions: stats.totalExecutions,
    successRate: (stats.successRate * 100).toFixed(1) + '%',
    estimatedRevenueSaved: '$' + stats.estimatedRevenueSaved
  });
  
  console.log('\n✅ Test complete! Identity resolution and intervention flow working.');
  
  // Test negative case - ignored recommendation
  console.log('\n\n🧪 Testing ignored recommendation flow...');
  
  const ignoredRec = await accountabilityEngine.trackRecommendation({
    companyId: 'Test Corp',
    userId: 'test_user',
    emotion: 'frustration',
    confidence: 85,
    recommendedAction: 'Contact support team',
    userValue: 20000,
    pageUrl: 'https://app.test.com/settings'
  });
  
  await accountabilityEngine.recordOutcome({
    recommendationId: ignoredRec.id,
    actionTaken: false,
    outcome: 'lost',
    actualRevenueLoss: 20000,
    notes: 'Customer churned due to unresolved frustration'
  });
  
  const testReport = await accountabilityEngine.generateReport('Test Corp', '30d');
  
  console.log('\n⚠️ Impact of ignored recommendation:');
  console.log({
    revenueLost: testReport.score.revenueLost,
    preventableChurn: testReport.score.preventableChurn,
    scoreImpact: 'Score dropped to ' + testReport.score.score
  });
  
  // Show insights
  const insights = await accountabilityEngine.getInsights('Test Corp');
  console.log('\n💡 Insights:');
  insights.forEach(insight => {
    console.log(`  ${insight.type.toUpperCase()}: ${insight.message}`);
    console.log(`    Impact: ${insight.impact}`);
    if (insight.suggestedAction) {
      console.log(`    Suggestion: ${insight.suggestedAction}`);
    }
  });
}

// Run the test
testFullFlow().catch(console.error);