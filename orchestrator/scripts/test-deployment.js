#!/usr/bin/env node

/**
 * SentientIQ Alpha Deployment Test Script
 * 
 * Quick verification that the core emotional detection system is running
 * and properly configured for alpha deployment.
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8787';

console.log('🧪 Testing SentientIQ Alpha Deployment...\n');

// Test 1: Health Check
async function testHealthCheck() {
  console.log('1. Testing health check...');
  try {
    const response = await fetch(`${BASE_URL}/health`);
    const health = await response.json();
    
    if (health.status === 'healthy') {
      console.log('   ✅ Health check passed');
      console.log(`   📊 Mode: ${health.mode}`);
      
      // Check core systems
      const coreHealthy = health.checks.emotions.healthy && 
                         health.checks.interventions.healthy && 
                         health.checks.websockets.healthy;
      
      if (coreHealthy) {
        console.log('   ✅ Core systems (emotions, interventions, websockets) healthy');
      } else {
        console.log('   ❌ Core systems not healthy');
        return false;
      }
      
      // Check stub status
      if (health.checks.dataLake.stubbed) {
        console.log(`   🟡 Data lake stubbed to: ${health.checks.dataLake.backend}`);
      }
      if (health.checks.notifications.stubbed) {
        console.log(`   🟡 Notifications stubbed to: ${health.checks.notifications.backend}`);
      }
      
      return true;
    } else {
      console.log('   ❌ Health check failed:', health.status);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Health check error:', error.message);
    return false;
  }
}

// Test 2: Deployment Status  
async function testDeploymentStatus() {
  console.log('\n2. Testing deployment status...');
  try {
    const response = await fetch(`${BASE_URL}/deployment`);
    const deployment = await response.json();
    
    if (deployment.deployment.ready) {
      console.log('   ✅ Deployment ready');
      console.log(`   📋 Mode: ${deployment.deployment.mode}`);
      console.log(`   🎯 Core systems: ${Object.keys(deployment.deployment.coreSystemsStatus).map(k => `${k}${deployment.deployment.coreSystemsStatus[k]}`).join(' ')}`);
      console.log(`   🏗️  Infrastructure: ${Object.keys(deployment.deployment.infrastructureStatus).map(k => `${k}${deployment.deployment.infrastructureStatus[k]}`).join(' ')}`);
      return true;
    } else {
      console.log('   ❌ Deployment not ready:', deployment.deployment.errors);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Deployment status error:', error.message);
    return false;
  }
}

// Test 3: Feature Flags
async function testFeatureFlags() {
  console.log('\n3. Testing feature flags...');
  try {
    const response = await fetch(`${BASE_URL}/features`);
    const features = await response.json();
    
    console.log('   Core features:');
    Object.entries(features.coreFeatures).forEach(([feature, enabled]) => {
      console.log(`     ${enabled ? '✅' : '❌'} ${feature}`);
    });
    
    console.log('   Progressive features:');
    Object.entries(features.progressiveFeatures).forEach(([feature, enabled]) => {
      console.log(`     ${enabled ? '✅' : '🔒'} ${feature}`);
    });
    
    // Core features must be enabled
    const coreEnabled = features.coreFeatures.emotionDetection && 
                       features.coreFeatures.interventionEngine && 
                       features.coreFeatures.websocketStreaming;
    
    if (coreEnabled) {
      console.log('   ✅ Core features properly enabled');
      return true;
    } else {
      console.log('   ❌ Core features not enabled');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Feature flags error:', error.message);
    return false;
  }
}

// Test 4: Emotional Event Recording
async function testEmotionalEvent() {
  console.log('\n4. Testing emotional event recording...');
  try {
    const testEvent = {
      emotion: 'test_excitement',
      confidence: 85.5,
      intensity: 72.3,
      userId: 'test_user_' + Date.now(),
      companyId: 'test_company_alpha',
      sessionId: 'test_session_' + Date.now(),
      timestamp: new Date().toISOString(),
      vertical: 'saas',
      geography: 'us-east',
      dollarValue: 150.00,
      interventionTaken: false,
      outcome: 'testing',
      pageUrl: 'https://test.example.com/pricing',
      userAgent: 'SentientIQ-TestScript/1.0',
      metadata: {
        deviceType: 'server',
        platform: 'test',
        testMode: true
      }
    };
    
    const response = await fetch(`${BASE_URL}/api/emotional/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testEvent)
    });
    
    if (response.ok) {
      console.log('   ✅ Emotional event recorded successfully');
      return true;
    } else {
      const error = await response.text();
      console.log('   ❌ Event recording failed:', error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Event recording error:', error.message);
    return false;
  }
}

// Test 5: Supabase Connection (if configured)
async function testSupabaseConnection() {
  console.log('\n5. Testing Supabase connection...');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('   ⚠️  Supabase not configured (this is OK for full S3 mode)');
    return true;
  }
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Test connection with a simple query
    const { data, error } = await supabase
      .from('emotional_events')
      .select('count')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      console.log('   ⚠️  Supabase table not found - run the schema script first');
      console.log('   💡 Execute: psql [supabase-connection] -f scripts/supabase-schema.sql');
      return false;
    } else if (error) {
      console.log('   ❌ Supabase connection error:', error.message);
      return false;
    } else {
      console.log('   ✅ Supabase connection successful');
      return true;
    }
  } catch (error) {
    console.log('   ❌ Supabase test error:', error.message);
    return false;
  }
}

// Test 6: Basic Routes Availability
async function testRouteAvailability() {
  console.log('\n6. Testing route availability...');
  
  const routes = [
    { path: '/', name: 'Root' },
    { path: '/health', name: 'Health' },
    { path: '/deployment', name: 'Deployment' },
    { path: '/features', name: 'Features' }
  ];
  
  let allRoutesWork = true;
  
  for (const route of routes) {
    try {
      const response = await fetch(`${BASE_URL}${route.path}`);
      if (response.ok) {
        console.log(`   ✅ ${route.name} route available`);
      } else {
        console.log(`   ❌ ${route.name} route failed (${response.status})`);
        allRoutesWork = false;
      }
    } catch (error) {
      console.log(`   ❌ ${route.name} route error:`, error.message);
      allRoutesWork = false;
    }
  }
  
  return allRoutesWork;
}

// Main test runner
async function runTests() {
  console.log(`🎯 Testing deployment at: ${BASE_URL}\n`);
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Deployment Status', fn: testDeploymentStatus },
    { name: 'Feature Flags', fn: testFeatureFlags },
    { name: 'Emotional Event Recording', fn: testEmotionalEvent },
    { name: 'Supabase Connection', fn: testSupabaseConnection },
    { name: 'Route Availability', fn: testRouteAvailability }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, passed: result });
    } catch (error) {
      console.log(`   💥 ${test.name} crashed:`, error.message);
      results.push({ name: test.name, passed: false });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🏁 TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    console.log(`${result.passed ? '✅' : '❌'} ${result.name}`);
  });
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 RESULTS: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Deployment looks good.');
    console.log('💡 Your SentientIQ alpha instance is ready for users.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
    console.log('📖 Review the DEPLOYMENT.md guide for troubleshooting.');
  }
  
  console.log('\n🚀 Happy emotion detecting!');
  
  process.exit(passed === total ? 0 : 1);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { runTests };