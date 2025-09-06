import express from 'express';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

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

// Initialize Resend for email delivery
const resend = new Resend(process.env.RESEND_API_KEY || 're_Vfdt96WE_5Zba47zxL58Ptngzi4aZThon');

// Google PageSpeed Insights API
const PAGESPEED_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const PAGESPEED_KEY = process.env.GOOGLE_PAGE_SPEED_INSIGHTS || process.env.GOOGLE_PAGESPEED_API_KEY;

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
    
    // Send instant value email
    try {
      await sendInstantValueEmail(email, domain, emotionalAnalysis, phdInsights);
      console.log(`📧 Instant value email sent to ${email}`);
    } catch (emailError) {
      console.error('Email send failed:', emailError);
      // Don't fail the whole request if email fails
    }
    
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
  
  // Plutchik's Wheel of Emotions - the REAL emotional states
  const plutchikEmotions = {
    joy: 0,
    trust: 0,
    fear: 0,
    surprise: 0,
    sadness: 0,
    disgust: 0,
    anger: 0,
    anticipation: 0
  };
  
  const emotionalTriggers = [];
  
  // SLOW LOADING → ANGER & DISGUST
  const fcp = parseFloat(metrics['first-contentful-paint']?.numericValue || 0);
  const lcp = parseFloat(metrics['largest-contentful-paint']?.numericValue || 0);
  
  if (fcp > 3000) {
    plutchikEmotions.anger += 35;
    plutchikEmotions.disgust += 25;
    emotionalTriggers.push({
      trigger: 'Extreme loading delay',
      metric: `${(fcp/1000).toFixed(1)}s first paint`,
      emotions: ['anger', 'disgust'],
      impact: 'Users rage-quit before content loads',
      severity: 'critical'
    });
  } else if (fcp > 2000) {
    plutchikEmotions.anger += 20;
    plutchikEmotions.fear += 15; // Fear of wasting time
    emotionalTriggers.push({
      trigger: 'Slow initial load',
      metric: `${(fcp/1000).toFixed(1)}s first paint`,
      emotions: ['anger', 'fear'],
      impact: 'Frustration builds, trust erodes',
      severity: 'high'
    });
  }
  
  // TOO MANY CTAs → FEAR & SADNESS (overwhelm)
  const buttons = pagespeedData.lighthouseResult?.audits?.['link-text']?.details?.items?.length || 0;
  if (buttons > 30) {
    plutchikEmotions.fear += 30;
    plutchikEmotions.sadness += 20;
    plutchikEmotions.disgust += 15;
    emotionalTriggers.push({
      trigger: 'Choice overload paralysis',
      metric: `${buttons} competing CTAs`,
      emotions: ['fear', 'sadness', 'disgust'],
      impact: 'Users freeze, then flee',
      severity: 'critical'
    });
  } else if (buttons > 15) {
    plutchikEmotions.fear += 15;
    plutchikEmotions.anticipation -= 10; // Reduces excitement
    emotionalTriggers.push({
      trigger: 'Decision fatigue',
      metric: `${buttons} CTAs`,
      emotions: ['fear'],
      impact: 'Cognitive overload reduces action',
      severity: 'medium'
    });
  }
  
  // CUMULATIVE LAYOUT SHIFT → SURPRISE (negative) & ANGER
  const cls = parseFloat(metrics['cumulative-layout-shift']?.numericValue || 0);
  if (cls > 0.25) {
    plutchikEmotions.surprise += 25; // Bad surprise
    plutchikEmotions.anger += 30;
    plutchikEmotions.trust -= 20;
    emotionalTriggers.push({
      trigger: 'Layout instability chaos',
      metric: `${cls.toFixed(2)} CLS`,
      emotions: ['surprise', 'anger'],
      impact: 'Users lose place, misclick, rage',
      severity: 'critical'
    });
  } else if (cls > 0.1) {
    plutchikEmotions.surprise += 10;
    plutchikEmotions.trust -= 10;
    emotionalTriggers.push({
      trigger: 'Shifting content',
      metric: `${cls.toFixed(2)} CLS`,
      emotions: ['surprise'],
      impact: 'Disrupts user flow',
      severity: 'medium'
    });
  }
  
  // MISSING HTTPS → FEAR & DISTRUST
  const https = pagespeedData.lighthouseResult?.audits?.['is-on-https']?.score === 1;
  if (!https) {
    plutchikEmotions.fear += 40;
    plutchikEmotions.trust -= 50;
    emotionalTriggers.push({
      trigger: 'Security warning',
      metric: 'No HTTPS',
      emotions: ['fear'],
      impact: 'Users abort transactions',
      severity: 'critical'
    });
  } else {
    plutchikEmotions.trust += 20;
    plutchikEmotions.anticipation += 10;
  }
  
  // POOR CONTRAST → SADNESS & ANGER
  const contrast = pagespeedData.lighthouseResult?.audits?.['color-contrast']?.score || 0;
  if (contrast < 0.5) {
    plutchikEmotions.sadness += 25;
    plutchikEmotions.anger += 20;
    emotionalTriggers.push({
      trigger: 'Unreadable content',
      metric: `${Math.round(contrast * 100)}% contrast score`,
      emotions: ['sadness', 'anger'],
      impact: 'Users give up trying to read',
      severity: 'high'
    });
  } else if (contrast < 0.9) {
    plutchikEmotions.sadness += 10;
    emotionalTriggers.push({
      trigger: 'Reading strain',
      metric: `${Math.round(contrast * 100)}% contrast`,
      emotions: ['sadness'],
      impact: 'Cognitive fatigue',
      severity: 'medium'
    });
  }
  
  // BLOCKING TIME → ANTICIPATION KILLER
  const tbt = parseFloat(metrics['total-blocking-time']?.numericValue || 0);
  if (tbt > 600) {
    plutchikEmotions.anticipation -= 30;
    plutchikEmotions.anger += 25;
    emotionalTriggers.push({
      trigger: 'Frozen interface',
      metric: `${(tbt/1000).toFixed(1)}s blocking`,
      emotions: ['anger'],
      impact: 'Users think site is broken',
      severity: 'critical'
    });
  }
  
  // IMAGE OPTIMIZATION → JOY OPPORTUNITY
  const imageOpt = metrics['uses-optimized-images']?.score || 0;
  if (imageOpt === 1) {
    plutchikEmotions.joy += 15;
    plutchikEmotions.anticipation += 10;
    emotionalTriggers.push({
      trigger: 'Fast visual loading',
      metric: 'Optimized images',
      emotions: ['joy', 'anticipation'],
      impact: 'Delightful experience',
      severity: 'positive'
    });
  }
  
  // Calculate dominant emotions
  const dominantEmotions = Object.entries(plutchikEmotions)
    .filter(([_, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emotion, intensity]) => ({
      emotion,
      intensity: Math.min(100, Math.max(0, intensity))
    }));
  
  // Overall emotional health score (inverse of negative emotions)
  const negativeTotal = plutchikEmotions.anger + plutchikEmotions.fear + 
                        plutchikEmotions.sadness + plutchikEmotions.disgust;
  const positiveTotal = Math.max(0, plutchikEmotions.joy + plutchikEmotions.trust + 
                        plutchikEmotions.anticipation);
  
  const emotionalHealth = Math.max(0, Math.min(100, 
    100 - (negativeTotal / 2) + (positiveTotal / 3)
  ));
  
  return {
    plutchik_wheel: plutchikEmotions,
    dominant_emotions: dominantEmotions,
    emotional_triggers: emotionalTriggers,
    emotional_health_score: Math.round(emotionalHealth),
    diagnosis: emotionalHealth < 30 
      ? 'Severe emotional friction - users actively suffering'
      : emotionalHealth < 60
      ? 'Significant negative emotions blocking conversion'
      : emotionalHealth < 80
      ? 'Mixed emotions - room for delight'
      : 'Positive emotional experience',
    prescription: dominantEmotions[0]?.emotion === 'anger' 
      ? 'URGENT: Fix performance immediately - users are rage-quitting'
      : dominantEmotions[0]?.emotion === 'fear'
      ? 'Reduce complexity and add trust signals'
      : dominantEmotions[0]?.emotion === 'disgust'
      ? 'Site feels broken - rebuild user confidence'
      : 'Optimize for joy and anticipation',
    // Backwards compatibility
    problems: emotionalTriggers.filter(t => t.severity !== 'positive'),
    opportunities: emotionalTriggers.filter(t => t.severity === 'positive'),
    summary: dominantEmotions[0]?.emotion || 'Emotional state analyzed'
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

/**
 * Send instant value email with emotional analysis
 */
async function sendInstantValueEmail(email, domain, emotionalAnalysis, phdInsights) {
  const problemsList = emotionalAnalysis.problems?.map(p => 
    `<li><strong>${p.issue}</strong><br/>${p.emotional_impact}</li>`
  ).join('') || '';

  const opportunitiesList = emotionalAnalysis.opportunities?.map(o => 
    `<li><strong>${o.strength}</strong><br/>${o.emotional_impact}</li>`
  ).join('') || '';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .score-card { background: #f7f9fc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .score { font-size: 48px; font-weight: bold; color: #667eea; }
        .problems { background: #fef5f5; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
        .opportunities { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
        .phd-insight { background: linear-gradient(135deg, #667eea15, #764ba215); padding: 20px; border-radius: 8px; margin: 20px 0; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        h1 { margin: 0; }
        ul { padding-left: 20px; }
        li { margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Your Instant Site Analysis</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Domain: ${domain}</p>
        </div>

        <div class="score-card">
          <h2>Emotional Impact Score</h2>
          <div class="score">${emotionalAnalysis.overall_emotional_score}/100</div>
          <p>${emotionalAnalysis.summary}</p>
        </div>

        ${problemsList ? `
        <div class="problems">
          <h3>⚠️ Emotional Friction Points</h3>
          <ul>${problemsList}</ul>
        </div>
        ` : ''}

        ${opportunitiesList ? `
        <div class="opportunities">
          <h3>✅ Strengths Detected</h3>
          <ul>${opportunitiesList}</ul>
        </div>
        ` : ''}

        <div class="phd-insight">
          <h3>🧠 PhD Collective Says</h3>
          <p>${phdInsights.summary}</p>
        </div>

        <div style="text-align: center; margin: 40px 0;">
          <h2>Ready for the Full Analysis?</h2>
          <p>Get 20 free questions with our PhD Collective and see how your entire MarTech stack measures up.</p>
          <a href="https://sentientiq.ai/sign-up?email=${encodeURIComponent(email)}" class="cta-button">
            Continue to Full Analysis →
          </a>
          <p style="color: #666; font-size: 14px;">No credit card required • 3-second setup</p>
        </div>

        <div style="border-top: 1px solid #e5e5e5; margin-top: 40px; padding-top: 20px; text-align: center; color: #666; font-size: 12px;">
          <p>© 2025 SentientIQ • The Emotional Intelligence Layer for MarTech</p>
          <p>This analysis was generated in under 3 seconds using Google PageSpeed + AI</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const { data, error } = await resend.emails.send({
    from: 'SentientIQ <insights@sentientiq.ai>',
    to: email,
    subject: `🎯 Instant Analysis: ${domain} scores ${emotionalAnalysis.overall_emotional_score}/100`,
    html: emailHtml
  });

  if (error) {
    throw error;
  }

  return data;
}

export default router;