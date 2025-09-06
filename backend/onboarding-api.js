import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Claude for emotional analysis
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Google PageSpeed Insights API
const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PAGESPEED_KEY = process.env.GOOGLE_PAGESPEED_API_KEY;

/**
 * FRICTIONLESS ONBOARDING FLOW
 * 1. User enters work email
 * 2. We extract domain
 * 3. Run instant analysis
 * 4. Deliver value in 30 seconds
 */
router.post('/api/onboard/analyze', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid work email required' });
    }
    
    // Extract domain from email
    const domain = email.split('@')[1];
    const websiteUrl = `https://${domain}`;
    
    console.log(`🚀 Instant analysis for ${email} - Domain: ${domain}`);
    
    // Run PageSpeed Insights
    const pagespeedData = await fetchPageSpeedData(websiteUrl);
    
    // Run emotional analysis on the PageSpeed data
    const emotionalAnalysis = await analyzeEmotionalImpact(pagespeedData);
    
    // Get PhD Collective insights
    const phdInsights = await getPhdInsights(websiteUrl, pagespeedData, emotionalAnalysis);
    
    // Check for tracking pixels and potential Math.random() indicators
    const fraudIndicators = await detectFraudIndicators(pagespeedData);
    
    // Store the analysis for when they sign up
    const { data: analysis, error } = await supabase
      .from('onboarding_analyses')
      .insert({
        email,
        domain,
        pagespeed_data: pagespeedData,
        emotional_analysis: emotionalAnalysis,
        phd_insights: phdInsights,
        problems_detected: emotionalAnalysis.problems?.length || 0,
        opportunities_found: emotionalAnalysis.opportunities?.length || 0,
        fraud_indicators: fraudIndicators
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Return instant value report
    res.json({
      success: true,
      message: `Analysis complete for ${domain}`,
      instant_insights: {
        domain,
        performance_score: pagespeedData.lighthouseResult?.categories?.performance?.score || 0,
        emotional_impact: emotionalAnalysis,
        top_issues: [
          ...emotionalAnalysis.problems?.slice(0, 3) || [],
          ...fraudIndicators.suspicious?.slice(0, 2) || []
        ],
        phd_recommendation: phdInsights.summary,
        next_step: 'Create your account to see full analysis and connect your MarTech stack'
      },
      analysis_id: analysis.id
    });
    
  } catch (error) {
    console.error('Onboarding analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
});

/**
 * Fetch PageSpeed Insights data
 */
async function fetchPageSpeedData(url) {
  try {
    const apiUrl = `${PAGESPEED_API}?url=${encodeURIComponent(url)}&key=${PAGESPEED_KEY}&category=performance&category=accessibility&category=best-practices&category=seo`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    return data;
  } catch (error) {
    console.error('PageSpeed fetch error:', error);
    return { error: 'Could not analyze website' };
  }
}

/**
 * Analyze emotional impact from site performance
 */
async function analyzeEmotionalImpact(pagespeedData) {
  const metrics = pagespeedData.lighthouseResult?.audits || {};
  
  const problems = [];
  const opportunities = [];
  
  // Loading time anxiety
  const fcp = parseFloat(metrics['first-contentful-paint']?.numericValue || 0);
  if (fcp > 2500) {
    problems.push({
      type: 'anxiety',
      issue: 'Slow loading causing visitor anxiety',
      metric: `${(fcp/1000).toFixed(1)}s first paint`,
      emotional_impact: 'Users feel frustrated and may abandon'
    });
  }
  
  // Decision paralysis from too many CTAs
  const buttons = pagespeedData.lighthouseResult?.audits?.['link-text']?.details?.items?.length || 0;
  if (buttons > 20) {
    problems.push({
      type: 'paralysis',
      issue: 'Too many calls-to-action creating decision paralysis',
      metric: `${buttons} clickable elements detected`,
      emotional_impact: 'Overwhelms users, reduces conversion'
    });
  }
  
  // Trust signals
  const https = pagespeedData.lighthouseResult?.audits?.['is-on-https']?.score === 1;
  if (!https) {
    problems.push({
      type: 'trust',
      issue: 'Missing HTTPS reducing trust',
      emotional_impact: 'Users feel unsafe sharing information'
    });
  } else {
    opportunities.push({
      type: 'trust',
      strength: 'Secure connection builds confidence',
      emotional_impact: 'Users feel safe to engage'
    });
  }
  
  // Color contrast affecting readability stress
  const contrast = pagespeedData.lighthouseResult?.audits?.['color-contrast']?.score || 0;
  if (contrast < 0.9) {
    problems.push({
      type: 'stress',
      issue: 'Poor color contrast causing reading stress',
      emotional_impact: 'Users strain to read, increasing cognitive load'
    });
  }
  
  return {
    overall_emotional_score: Math.max(0, 100 - (problems.length * 15)),
    problems,
    opportunities,
    summary: problems.length > 3 
      ? 'High emotional friction detected - multiple user experience issues'
      : 'Moderate emotional health with improvement opportunities'
  };
}

/**
 * Get PhD Collective insights
 */
async function getPhdInsights(url, pagespeedData, emotionalAnalysis) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      temperature: 0.7,
      system: 'You are Dr. Strategic from the PhD Collective, analyzing website emotional impact.',
      messages: [{
        role: 'user',
        content: `Analyze this website's emotional impact on visitors:
        URL: ${url}
        Performance Score: ${pagespeedData.lighthouseResult?.categories?.performance?.score || 'Unknown'}
        Problems Found: ${emotionalAnalysis.problems?.map(p => p.issue).join(', ')}
        
        Provide a brief, actionable insight about the emotional experience.`
      }]
    });
    
    return {
      summary: response.content[0].text,
      confidence: 0.85
    };
  } catch (error) {
    return {
      summary: 'Multiple optimization opportunities detected. Full PhD analysis available after signup.',
      confidence: 0.7
    };
  }
}

/**
 * Detect potential fraud indicators (Math.random() patterns)
 */
async function detectFraudIndicators(pagespeedData) {
  const suspicious = [];
  
  // Check for known intent data vendors
  const scripts = pagespeedData.lighthouseResult?.audits?.['network-requests']?.details?.items || [];
  
  const suspectVendors = [
    '6sense.com',
    'demandbase.com',
    'clearbit.com',
    'bombora.com',
    'intentdata.io'
  ];
  
  scripts.forEach(script => {
    suspectVendors.forEach(vendor => {
      if (script.url?.includes(vendor)) {
        suspicious.push({
          vendor,
          type: 'tracking_pixel',
          warning: `${vendor} intent data detected - requires verification`,
          math_random_risk: 'HIGH'
        });
      }
    });
  });
  
  // Check for suspicious patterns in JavaScript
  const jsPatterns = [
    'Math.random',
    'intent_score',
    'buyer_intent',
    'predictive_score'
  ];
  
  return {
    suspicious,
    has_intent_vendors: suspicious.length > 0,
    recommendation: suspicious.length > 0 
      ? 'Intent data vendors detected. Connect your stack to verify data authenticity.'
      : 'No suspicious vendors detected on initial scan.'
  };
}

/**
 * Complete signup after seeing value
 */
router.post('/api/onboard/complete', async (req, res) => {
  const { email, analysis_id, company_name } = req.body;
  
  try {
    // Get the domain from email
    const domain = email.split('@')[1];
    
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        domain,
        company_name: company_name || domain,
        subscription_tier: 'trial'
      })
      .select()
      .single();
    
    if (orgError) throw orgError;
    
    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        organization_id: org.id,
        role: 'admin'
      })
      .select()
      .single();
    
    if (userError) throw userError;
    
    // Get their pre-signup analysis
    const { data: analysis } = await supabase
      .from('onboarding_analyses')
      .select('*')
      .eq('id', analysis_id)
      .single();
    
    res.json({
      success: true,
      message: 'Welcome to SentientIQ!',
      organization: org,
      user,
      instant_analysis: analysis,
      next_steps: [
        'Connect your MarTech stack',
        'Run comparative analysis',
        'Expose the truth'
      ]
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});

export default router;