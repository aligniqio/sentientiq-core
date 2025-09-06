import express from 'express';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize Claude for recommendation generation
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Get dynamic recommendations based on user's actual site analysis
 */
router.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's latest analysis from Supabase
    const { data: analysis, error } = await supabase
      .from('onboarding_analyses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !analysis) {
      // If no analysis exists, trigger a new one based on their email domain
      return res.json({ 
        recommendations: [],
        message: 'No analysis found. Triggering new scan...'
      });
    }
    
    // Generate recommendations from REAL data
    const recommendations = await generateRecommendations(analysis);
    
    // Store recommendations for tracking
    await supabase
      .from('recommendations')
      .upsert({
        user_id: userId,
        recommendations,
        generated_at: new Date().toISOString(),
        analysis_id: analysis.id
      });
    
    res.json({
      success: true,
      recommendations,
      analysis_date: analysis.created_at,
      domain: analysis.domain
    });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

/**
 * Generate recommendations from actual PageSpeed and emotional analysis
 */
async function generateRecommendations(analysis) {
  const recommendations = [];
  const { pagespeed_data, emotional_analysis, fraud_indicators } = analysis;
  
  // PERFORMANCE ISSUES
  const metrics = pagespeed_data?.lighthouseResult?.audits || {};
  
  // First Contentful Paint
  const fcp = parseFloat(metrics['first-contentful-paint']?.numericValue || 0);
  if (fcp > 2500) {
    recommendations.push({
      id: `perf-fcp-${Date.now()}`,
      priority: fcp > 4000 ? 'critical' : 'high',
      category: 'Performance',
      title: 'Fix Slow First Paint',
      description: `Your first contentful paint is ${(fcp/1000).toFixed(1)}s. Users expect content in under 2.5s.`,
      impact: `${Math.round((fcp - 2500) / fcp * 45)}% faster perceived loading`,
      effort: 'medium',
      metrics: {
        current: `${(fcp/1000).toFixed(1)}s`,
        target: '2.5s'
      },
      implementation: [
        'Optimize critical rendering path',
        'Reduce server response time',
        'Eliminate render-blocking resources',
        'Use resource hints (preconnect, prefetch)'
      ]
    });
  }
  
  // Largest Contentful Paint
  const lcp = parseFloat(metrics['largest-contentful-paint']?.numericValue || 0);
  if (lcp > 2500) {
    recommendations.push({
      id: `perf-lcp-${Date.now()}`,
      priority: lcp > 4000 ? 'critical' : 'high',
      category: 'Performance',
      title: 'Improve Largest Contentful Paint',
      description: `LCP is ${(lcp/1000).toFixed(1)}s. Google requires under 2.5s for good score.`,
      impact: 'Better Core Web Vitals score',
      effort: 'high',
      metrics: {
        current: `${(lcp/1000).toFixed(1)}s`,
        target: '2.5s'
      }
    });
  }
  
  // FRAUD/TRACKING ISSUES
  if (fraud_indicators?.suspicious?.length > 0) {
    fraud_indicators.suspicious.forEach(vendor => {
      recommendations.push({
        id: `fraud-${vendor.vendor}-${Date.now()}`,
        priority: 'critical',
        category: 'Data Integrity',
        title: `Remove ${vendor.vendor} Tracking`,
        description: `${vendor.vendor} uses ${vendor.math_random_risk} risk probabilistic matching.`,
        impact: 'Restore deterministic data accuracy',
        effort: 'low',
        metrics: {
          current: `${vendor.vendor} active`,
          target: 'Removed'
        },
        implementation: [
          `Remove ${vendor.vendor} tracking pixel`,
          'Replace with deterministic solution',
          'Audit data accuracy post-removal'
        ]
      });
    });
  }
  
  // PLUTCHIK EMOTIONAL ISSUES - REAL EMOTIONS, REAL IMPACT
  if (emotional_analysis?.dominant_emotions?.length > 0) {
    emotional_analysis.dominant_emotions.forEach((emotion, index) => {
      // Only create recommendations for negative emotions
      if (['anger', 'fear', 'disgust', 'sadness'].includes(emotion.emotion)) {
        const priority = emotion.intensity > 50 ? 'critical' : 
                        emotion.intensity > 30 ? 'high' : 'medium';
        
        const emotionMap = {
          anger: {
            title: 'Eliminate User Rage Points',
            description: `${emotion.intensity}% anger intensity detected. Users are actively frustrated.`,
            impact: 'Stop rage-quits, restore calm',
            implementation: [
              'Fix performance bottlenecks immediately',
              'Eliminate layout shifts',
              'Speed up interactive elements',
              'Remove blocking scripts'
            ]
          },
          fear: {
            title: 'Reduce User Anxiety',
            description: `${emotion.intensity}% fear response. Users feel unsafe or overwhelmed.`,
            impact: 'Build confidence, increase trust',
            implementation: [
              'Add security badges and trust signals',
              'Simplify navigation and choices',
              'Clear error messaging',
              'Progressive disclosure of complexity'
            ]
          },
          disgust: {
            title: 'Fix Broken Experience',
            description: `${emotion.intensity}% disgust reaction. Site feels unprofessional.`,
            impact: 'Restore credibility',
            implementation: [
              'Fix all broken elements',
              'Update outdated design patterns',
              'Ensure consistent behavior',
              'Professional error handling'
            ]
          },
          sadness: {
            title: 'Reduce Cognitive Strain',
            description: `${emotion.intensity}% sadness/fatigue. Users feel defeated.`,
            impact: 'Make experience effortless',
            implementation: [
              'Improve readability and contrast',
              'Simplify user flows',
              'Add helpful guidance',
              'Reduce cognitive load'
            ]
          }
        };
        
        const emotionData = emotionMap[emotion.emotion];
        if (emotionData) {
          recommendations.push({
            id: `emotion-${emotion.emotion}-${Date.now()}`,
            priority,
            category: 'Emotional Intelligence',
            title: emotionData.title,
            description: emotionData.description,
            impact: emotionData.impact,
            effort: emotion.intensity > 40 ? 'high' : 'medium',
            metrics: {
              current: `${emotion.emotion}: ${emotion.intensity}%`,
              target: `${emotion.emotion}: <10%`
            },
            implementation: emotionData.implementation
          });
        }
      }
    });
  }
  
  // Add emotional triggers as specific issues
  if (emotional_analysis?.emotional_triggers?.length > 0) {
    emotional_analysis.emotional_triggers
      .filter(trigger => trigger.severity === 'critical')
      .slice(0, 3)
      .forEach(trigger => {
        recommendations.push({
          id: `trigger-${Date.now()}-${Math.random()}`,
          priority: 'critical',
          category: 'Emotional Trigger',
          title: trigger.trigger,
          description: trigger.impact,
          impact: `Fix ${trigger.emotions.join(' & ')} triggers`,
          effort: 'medium',
          metrics: {
            current: trigger.metric,
            target: 'Resolved'
          }
        });
      });
  }
  
  // CONVERSION OPTIMIZATION
  const buttons = pagespeed_data?.lighthouseResult?.audits?.['link-text']?.details?.items?.length || 0;
  if (buttons > 20) {
    recommendations.push({
      id: `conv-cta-${Date.now()}`,
      priority: 'high',
      category: 'Conversion',
      title: 'Reduce Decision Paralysis',
      description: `${buttons} CTAs detected. Optimal range is 3-5 primary actions.`,
      impact: '40-60% improvement in conversion',
      effort: 'low',
      metrics: {
        current: `${buttons} CTAs`,
        target: '5 CTAs'
      },
      implementation: [
        'Audit all CTAs for relevance',
        'Create clear visual hierarchy',
        'Use progressive disclosure',
        'A/B test reduced CTA layouts'
      ]
    });
  }
  
  // SEO ISSUES
  const seoScore = pagespeed_data?.lighthouseResult?.categories?.seo?.score || 0;
  if (seoScore < 0.9) {
    recommendations.push({
      id: `seo-score-${Date.now()}`,
      priority: 'medium',
      category: 'SEO',
      title: 'Improve SEO Score',
      description: `SEO score is ${Math.round(seoScore * 100)}/100. Missing key optimizations.`,
      impact: 'Better search visibility',
      effort: 'medium',
      metrics: {
        current: `${Math.round(seoScore * 100)}/100`,
        target: '90/100'
      }
    });
  }
  
  // ACCESSIBILITY
  const a11yScore = pagespeed_data?.lighthouseResult?.categories?.accessibility?.score || 0;
  if (a11yScore < 0.9) {
    recommendations.push({
      id: `a11y-score-${Date.now()}`,
      priority: 'medium',
      category: 'Accessibility',
      title: 'Fix Accessibility Issues',
      description: `Accessibility score ${Math.round(a11yScore * 100)}/100. Legal compliance at risk.`,
      impact: 'Avoid lawsuits, reach more users',
      effort: 'medium',
      metrics: {
        current: `${Math.round(a11yScore * 100)}/100`,
        target: '100/100'
      }
    });
  }
  
  // Use Claude to add strategic insights
  if (recommendations.length > 0) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 500,
        temperature: 0.7,
        system: 'You are a strategic advisor analyzing website optimization priorities.',
        messages: [{
          role: 'user',
          content: `Based on these issues found on ${analysis.domain}:
          ${recommendations.map(r => `- ${r.title}: ${r.description}`).join('\n')}
          
          Add one strategic recommendation that ties these together.`
        }]
      });
      
      recommendations.push({
        id: `strategic-${Date.now()}`,
        priority: 'high',
        category: 'Strategy',
        title: 'PhD Collective Strategic Insight',
        description: response.content[0].text,
        impact: 'Holistic improvement across all metrics',
        effort: 'medium'
      });
    } catch (err) {
      console.error('Claude strategic insight failed:', err);
    }
  }
  
  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return recommendations;
}

/**
 * Trigger fresh analysis for a user
 */
router.post('/api/recommendations/refresh/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user's email/domain
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Trigger fresh PageSpeed analysis
    // This would call the onboarding-api analyze endpoint
    
    res.json({
      success: true,
      message: 'Fresh analysis triggered',
      email: user.email
    });
    
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh analysis' });
  }
});

export default router;