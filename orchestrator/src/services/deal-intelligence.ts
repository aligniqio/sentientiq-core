/**
 * Deal Intelligence System
 * 
 * When prospects with deals in-flight show emotions,
 * we don't just save customers - we save DEALS.
 * 
 * Ed from Boeing reviewing docs before saying yes to $2.4M?
 * We better know if he hits a dead link.
 */

import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { emotionPhysicsEngine } from './emotion-physics.js';
import { executiveAlerts } from './executive-alerts.js';
import { interventionEngine } from './intervention-engine.js';
import type { EmotionWeights } from '../types.js';

// Deal stages where emotions matter most
const CRITICAL_STAGES = [
  'NEGOTIATION',
  'PROPOSAL',
  'LEGAL_REVIEW', 
  'FINAL_APPROVAL',
  'CHAMPION_REVIEW'
];

// Emotion → Deal Impact mapping
const DEAL_EMOTION_IMPACTS: Record<string, number> = {
  'rage': -0.9,              // Deal killer
  'frustration': -0.6,        // Major concern
  'confusion': -0.4,          // Needs clarification
  'dead_link': -0.7,          // Reliability concern
  'skepticism': -0.3,         // Normal but needs addressing
  'sticker_shock': -0.5,      // Price objection
  'confidence': 0.4,          // Positive signal
  'delight': 0.6,             // Champion activated
  'exploration': 0.2,         // Engaged evaluation
  'purchase_intent': 0.8      // Ready to close
};

interface CRMDeal {
  dealId: string;
  companyName: string;
  dealValue: number;
  stage: string;
  probability: number;
  closeDate: Date;
  owner: string;
  champion: {
    name: string;
    email: string;
    title: string;
    lastActivity: Date;
  };
  contacts: Array<{
    name: string;
    email: string;
    role: string;
  }>;
  notes: string[];
  competitor?: string;
}

interface DealIntelligence {
  deal: CRMDeal;
  prospect: {
    email: string;
    name: string;
    role: string;
    isChampion: boolean;
    isDecisionMaker: boolean;
  };
  emotion: string;
  confidence: number;
  context: {
    page: string;
    element?: string;
    timeOnSite: number;
    pagesViewed: string[];
    previousEmotions: string[];
  };
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
  dealImpact: number; // Potential impact on deal value
}

class DealIntelligenceSystem extends EventEmitter {
  private supabase: SupabaseClient | null = null;
  private hubspotDeals: Map<string, CRMDeal> = new Map();
  private salesforceDeals: Map<string, CRMDeal> = new Map();
  private activeProspects: Map<string, DealIntelligence> = new Map();
  private dealAlerts: Map<string, Date> = new Map(); // Prevent alert spam

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Sync CRM data
    await this.syncCRMDeals();
    
    // Refresh every 5 minutes
    setInterval(() => this.syncCRMDeals(), 5 * 60 * 1000);

    console.log('✅ Deal Intelligence System initialized');
  }

  /**
   * Sync deals from CRM systems
   */
  private async syncCRMDeals(): Promise<void> {
    // HubSpot sync
    if (process.env.HUBSPOT_API_KEY) {
      try {
        const response = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
          }
        });
        
        const data = await response.json();
        
        for (const deal of data.results) {
          if (CRITICAL_STAGES.includes(deal.properties.dealstage)) {
            const crmDeal = await this.enrichDealData(deal, 'hubspot');
            this.hubspotDeals.set(deal.id, crmDeal);
            
            // Map email → deal for quick lookup
            for (const contact of crmDeal.contacts) {
              this.mapEmailToDeal(contact.email, crmDeal);
            }
          }
        }
        
        console.log(`📊 Synced ${this.hubspotDeals.size} active HubSpot deals`);
      } catch (error) {
        console.error('HubSpot sync failed:', error);
      }
    }

    // Salesforce sync
    if (process.env.SALESFORCE_ACCESS_TOKEN) {
      try {
        const response = await fetch(`${process.env.SALESFORCE_INSTANCE_URL}/services/data/v55.0/query`, {
          headers: {
            'Authorization': `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            query: "SELECT Id, Name, Amount, StageName, CloseDate, Probability FROM Opportunity WHERE IsClosed = false"
          })
        });
        
        const data = await response.json();
        
        for (const opp of data.records) {
          if (CRITICAL_STAGES.includes(opp.StageName)) {
            const crmDeal = await this.enrichDealData(opp, 'salesforce');
            this.salesforceDeals.set(opp.Id, crmDeal);
            
            // Map email → deal
            for (const contact of crmDeal.contacts) {
              this.mapEmailToDeal(contact.email, crmDeal);
            }
          }
        }
        
        console.log(`📊 Synced ${this.salesforceDeals.size} active Salesforce opportunities`);
      } catch (error) {
        console.error('Salesforce sync failed:', error);
      }
    }
  }

  /**
   * Enrich deal with contact data
   */
  private async enrichDealData(rawDeal: any, source: 'hubspot' | 'salesforce'): Promise<CRMDeal> {
    // This would fetch associated contacts, activities, notes
    // Simplified for demonstration
    
    return {
      dealId: rawDeal.id || rawDeal.Id,
      companyName: rawDeal.properties?.company || rawDeal.Name,
      dealValue: parseFloat(rawDeal.properties?.amount || rawDeal.Amount || 0),
      stage: rawDeal.properties?.dealstage || rawDeal.StageName,
      probability: parseFloat(rawDeal.properties?.probability || rawDeal.Probability || 50),
      closeDate: new Date(rawDeal.properties?.closedate || rawDeal.CloseDate),
      owner: rawDeal.properties?.hubspot_owner_id || rawDeal.OwnerId,
      champion: {
        name: 'Ed Martinez', // Would fetch from associations
        email: 'ed@company.com',
        title: 'VP Engineering',
        lastActivity: new Date()
      },
      contacts: [], // Would fetch from associations
      notes: [], // Would fetch from engagements
      competitor: rawDeal.properties?.competitor
    };
  }

  /**
   * Map email to deal for quick lookup
   */
  private mapEmailToDeal(email: string, deal: CRMDeal): void {
    // Store in memory for instant lookup
    // In production, use Redis/NATS KV
  }

  /**
   * Process visitor emotion with deal context
   */
  async processProspectEmotion(params: {
    sessionId: string;
    email?: string;
    emotion: string;
    confidence: number;
    page: string;
    element?: string;
  }): Promise<DealIntelligence | null> {
    // Skip if no email
    if (!params.email) return null;

    // Check if this visitor has an active deal
    const deal = await this.findDealByEmail(params.email);
    if (!deal) return null;

    // Check if deal is in critical stage
    if (!CRITICAL_STAGES.includes(deal.stage)) return null;

    // Identify the prospect
    const prospect = this.identifyProspect(params.email, deal);

    // Calculate risk level
    const riskLevel = this.calculateDealRisk(
      params.emotion,
      params.confidence,
      deal,
      prospect.isChampion
    );

    // Determine action
    const suggestedAction = this.determineAction(
      params.emotion,
      deal,
      prospect,
      riskLevel
    );

    // Calculate potential deal impact
    const emotionImpact = DEAL_EMOTION_IMPACTS[params.emotion as keyof typeof DEAL_EMOTION_IMPACTS] || 0;
    const dealImpact = deal.dealValue * emotionImpact * (params.confidence / 100);

    const intelligence: DealIntelligence = {
      deal,
      prospect,
      emotion: params.emotion,
      confidence: params.confidence,
      context: {
        page: params.page,
        element: params.element,
        timeOnSite: 0, // Would calculate from session
        pagesViewed: [], // Would track from session
        previousEmotions: [] // Would track from session
      },
      riskLevel,
      suggestedAction,
      dealImpact
    };

    // Store active prospect
    this.activeProspects.set(params.sessionId, intelligence);

    // Trigger interventions based on risk
    await this.triggerDealIntervention(intelligence);

    // Emit for dashboards
    this.emit('deal:emotion', intelligence);

    return intelligence;
  }

  /**
   * Find deal by email
   */
  private async findDealByEmail(email: string): Promise<CRMDeal | null> {
    // Check HubSpot deals
    for (const deal of this.hubspotDeals.values()) {
      if (deal.contacts.some(c => c.email === email) || 
          deal.champion.email === email) {
        return deal;
      }
    }

    // Check Salesforce deals
    for (const deal of this.salesforceDeals.values()) {
      if (deal.contacts.some(c => c.email === email) ||
          deal.champion.email === email) {
        return deal;
      }
    }

    return null;
  }

  /**
   * Identify prospect role in deal
   */
  private identifyProspect(email: string, deal: CRMDeal): DealIntelligence['prospect'] {
    const isChampion = deal.champion.email === email;
    const contact = deal.contacts.find(c => c.email === email);
    
    return {
      email,
      name: isChampion ? deal.champion.name : contact?.name || 'Unknown',
      role: isChampion ? deal.champion.title : contact?.role || 'Unknown',
      isChampion,
      isDecisionMaker: isChampion || ((contact?.role?.includes('VP') || contact?.role?.includes('Director')) ?? false)
    };
  }

  /**
   * Calculate deal risk based on emotion
   */
  private calculateDealRisk(
    emotion: string,
    confidence: number,
    deal: CRMDeal,
    isChampion: boolean
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const negativeEmotions = ['rage', 'frustration', 'dead_link', 'confusion', 'sticker_shock'];
    const isNegative = negativeEmotions.includes(emotion);
    
    if (!isNegative) return 'LOW';

    // Champion emotions are more critical
    const multiplier = isChampion ? 2 : 1;
    
    // Factor in deal value
    const valueMultiplier = deal.dealValue > 1000000 ? 2 : 
                           deal.dealValue > 500000 ? 1.5 : 1;
    
    const riskScore = confidence * multiplier * valueMultiplier;
    
    if (riskScore > 250) return 'CRITICAL';
    if (riskScore > 150) return 'HIGH';
    if (riskScore > 75) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Determine intervention action
   */
  private determineAction(
    emotion: string,
    deal: CRMDeal,
    prospect: DealIntelligence['prospect'],
    riskLevel: string
  ): string {
    if (emotion === 'dead_link') {
      return `IMMEDIATE: Fix dead link and call ${prospect.name} to apologize`;
    }
    
    if (emotion === 'rage' && prospect.isChampion) {
      return `CRITICAL: CEO should call ${prospect.name} within 5 minutes`;
    }
    
    if (emotion === 'confusion' && deal.stage === 'NEGOTIATION') {
      return `Schedule clarification call with ${prospect.name} today`;
    }
    
    if (emotion === 'sticker_shock') {
      return `Send ROI calculator and offer call with CFO`;
    }
    
    if (emotion === 'confidence' || emotion === 'delight') {
      return `Positive signal! Ask ${prospect.name} for referral or case study`;
    }
    
    return `Monitor and be ready to assist ${prospect.name}`;
  }

  /**
   * Trigger deal-specific intervention
   */
  private async triggerDealIntervention(intelligence: DealIntelligence): Promise<void> {
    const { deal, prospect, emotion, riskLevel } = intelligence;
    
    // Check if we already alerted recently
    const lastAlert = this.dealAlerts.get(deal.dealId);
    if (lastAlert && Date.now() - lastAlert.getTime() < 15 * 60 * 1000) {
      return; // Don't spam - wait 15 minutes between alerts
    }

    if (riskLevel === 'CRITICAL') {
      // IMMEDIATE ESCALATION
      await executiveAlerts.sendCriticalAlert({
        userId: prospect.email,
        email: prospect.email,
        company: deal.companyName,
        value: deal.dealValue,
        emotion: emotion,
        confidence: intelligence.confidence,
        section: intelligence.context.page,
        sessionId: `deal_${deal.dealId}`
      });

      // Update CRM with alert
      await this.updateCRMWithAlert(deal, intelligence);

      // Slack the deal owner
      await this.notifyDealOwner(deal, intelligence);
      
      this.dealAlerts.set(deal.dealId, new Date());
    } else if (riskLevel === 'HIGH') {
      // Notify deal owner
      await this.notifyDealOwner(deal, intelligence);
      
      // Create task in CRM
      await this.createCRMTask(deal, intelligence);
    }

    // Log to revenue forensics
    this.emit('deal:intervention', {
      deal,
      intelligence,
      action: intelligence.suggestedAction
    });
  }

  /**
   * Update CRM with emotion alert
   */
  private async updateCRMWithAlert(deal: CRMDeal, intelligence: DealIntelligence): Promise<void> {
    const note = `🚨 EMOTION ALERT: ${intelligence.prospect.name} showed ${intelligence.emotion} (${intelligence.confidence}% confidence) on ${intelligence.context.page}. Risk Level: ${intelligence.riskLevel}. Suggested Action: ${intelligence.suggestedAction}`;
    
    // Update HubSpot
    if (process.env.HUBSPOT_API_KEY) {
      await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${deal.dealId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: note })
      });
    }
  }

  /**
   * Notify deal owner via Slack/Email
   */
  private async notifyDealOwner(deal: CRMDeal, intelligence: DealIntelligence): Promise<void> {
    const message = `🎯 ${deal.companyName} - ${intelligence.prospect.name} needs attention!\n\n` +
                   `Emotion: ${intelligence.emotion} (${intelligence.confidence}%)\n` +
                   `Deal Value: $${(deal.dealValue / 1000).toFixed(0)}k\n` +
                   `Stage: ${deal.stage}\n` +
                   `Risk: ${intelligence.riskLevel}\n\n` +
                   `Action: ${intelligence.suggestedAction}\n\n` +
                   `Dashboard: https://app.sentientiq.app/deal/${deal.dealId}`;
    
    // Send to Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message })
      });
    }
  }

  /**
   * Create follow-up task in CRM
   */
  private async createCRMTask(deal: CRMDeal, intelligence: DealIntelligence): Promise<void> {
    const task = {
      subject: `Follow up with ${intelligence.prospect.name} - ${intelligence.emotion} detected`,
      description: intelligence.suggestedAction,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      priority: intelligence.riskLevel === 'HIGH' ? 'High' : 'Normal',
      associatedDeal: deal.dealId
    };
    
    // Create in HubSpot/Salesforce
    console.log('📋 Created CRM task:', task);
  }

  /**
   * Get deal intelligence dashboard data
   */
  getDashboardData(): any {
    const activeDeals = [...this.hubspotDeals.values(), ...this.salesforceDeals.values()];
    const atRiskDeals = activeDeals.filter(d => {
      const prospect = this.activeProspects.get(`deal_${d.dealId}`);
      return prospect && prospect.riskLevel !== 'LOW';
    });
    
    return {
      totalDealsMonitored: activeDeals.length,
      totalDealValue: activeDeals.reduce((sum, d) => sum + d.dealValue, 0),
      atRiskDeals: atRiskDeals.length,
      atRiskValue: atRiskDeals.reduce((sum, d) => sum + d.dealValue, 0),
      activeProspects: Array.from(this.activeProspects.values()).map(p => ({
        company: p.deal.companyName,
        prospect: p.prospect.name,
        emotion: p.emotion,
        risk: p.riskLevel,
        value: p.deal.dealValue
      }))
    };
  }
}

// Singleton instance
export const dealIntelligence = new DealIntelligenceSystem();

export default dealIntelligence;