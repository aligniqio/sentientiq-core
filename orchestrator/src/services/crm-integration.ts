/**
 * CRM Integration Service
 * 
 * This pushes emotional intelligence directly into your sales and support tools.
 * Your sales rep will know their prospect had 3 rage moments before they even pick up the phone.
 */

import axios from 'axios';
import { UserIdentity } from './identity-resolution.js';

export interface CRMContact {
  id: string;
  email: string;
  company?: string;
  properties: Record<string, any>;
}

export interface EmotionalCRMUpdate {
  userId: string;
  email?: string;
  emotion: string;
  confidence: number;
  timestamp: Date;
  pageUrl: string;
  predictedAction: string;
  interventionSuggested: string;
}

export interface CRMConfig {
  provider: 'salesforce' | 'hubspot' | 'intercom' | 'segment';
  apiKey?: string;
  accessToken?: string;
  instanceUrl?: string; // For Salesforce
  portalId?: string; // For HubSpot
}

abstract class CRMProvider {
  protected config: CRMConfig;
  
  constructor(config: CRMConfig) {
    this.config = config;
  }
  
  abstract syncEmotionalEvent(event: EmotionalCRMUpdate): Promise<void>;
  abstract updateContact(contact: Partial<CRMContact>): Promise<void>;
  abstract createTimelineEvent(userId: string, event: any): Promise<void>;
  abstract getContact(email: string): Promise<CRMContact | null>;
}

/**
 * HubSpot CRM Integration
 */
class HubSpotIntegration extends CRMProvider {
  private apiUrl = 'https://api.hubapi.com';
  
  async syncEmotionalEvent(event: EmotionalCRMUpdate): Promise<void> {
    try {
      // Get or create contact
      let contact = await this.getContact(event.email || event.userId);
      if (!contact && event.email) {
        contact = await this.createContact(event.email);
      }
      
      if (!contact) {
        console.warn('Could not find or create HubSpot contact for:', event.userId);
        return;
      }
      
      // Update contact properties with latest emotional state
      await this.updateContact({
        id: contact.id,
        properties: {
          last_emotion: event.emotion,
          last_emotion_confidence: event.confidence,
          last_emotion_timestamp: event.timestamp.toISOString(),
          emotional_state: this.getEmotionalHealthScore(event.emotion, event.confidence),
          intervention_needed: event.confidence > 80 && ['rage', 'frustration', 'abandonment'].includes(event.emotion)
        }
      });
      
      // Create timeline event
      await this.createTimelineEvent(contact.id, {
        eventTypeId: '000001', // Custom event type for emotions
        emotion: event.emotion,
        confidence: event.confidence,
        url: event.pageUrl,
        predictedAction: event.predictedAction,
        interventionSuggested: event.interventionSuggested,
        timestamp: event.timestamp
      });
      
      // Trigger workflow if high-risk emotion
      if (event.confidence > 85 && ['rage', 'abandonment'].includes(event.emotion)) {
        await this.triggerWorkflow(contact.id, 'high_risk_emotion');
      }
      
    } catch (error) {
      console.error('HubSpot sync failed:', error);
    }
  }
  
  async getContact(email: string): Promise<CRMContact | null> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/crm/v3/objects/contacts/${email}`,
        {
          params: { idProperty: 'email' },
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        id: response.data.id,
        email: response.data.properties.email,
        company: response.data.properties.company,
        properties: response.data.properties
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  async createContact(email: string): Promise<CRMContact> {
    const response = await axios.post(
      `${this.apiUrl}/crm/v3/objects/contacts`,
      {
        properties: {
          email,
          sentientiq_tracked: true,
          first_tracked: new Date().toISOString()
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      id: response.data.id,
      email,
      properties: response.data.properties
    };
  }
  
  async updateContact(contact: Partial<CRMContact>): Promise<void> {
    await axios.patch(
      `${this.apiUrl}/crm/v3/objects/contacts/${contact.id}`,
      { properties: contact.properties },
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  async createTimelineEvent(contactId: string, event: any): Promise<void> {
    await axios.post(
      `${this.apiUrl}/crm/v3/timeline/events`,
      {
        objectId: contactId,
        objectType: 'CONTACT',
        eventTemplateId: '000001', // Emotional event template
        tokens: event
      },
      {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  private async triggerWorkflow(contactId: string, workflowType: string): Promise<void> {
    // Trigger HubSpot workflow for immediate intervention
    console.log(`Triggering ${workflowType} workflow for contact ${contactId}`);
    // Implementation depends on HubSpot workflow API setup
  }
  
  private getEmotionalHealthScore(emotion: string, confidence: number): string {
    const negativeEmotions = ['rage', 'frustration', 'anxiety', 'abandonment', 'confusion'];
    const positiveEmotions = ['delight', 'confidence', 'discovery', 'curiosity'];
    
    if (negativeEmotions.includes(emotion) && confidence > 70) {
      return 'at_risk';
    } else if (positiveEmotions.includes(emotion) && confidence > 70) {
      return 'healthy';
    }
    return 'neutral';
  }
}

/**
 * Salesforce CRM Integration
 */
class SalesforceIntegration extends CRMProvider {
  private apiVersion = 'v57.0';
  
  async syncEmotionalEvent(event: EmotionalCRMUpdate): Promise<void> {
    try {
      // Get Salesforce access token (assumes OAuth already done)
      const sfAuth = await this.authenticate();
      
      // Find contact or lead
      const contact = await this.findContact(event.email || event.userId, sfAuth);
      if (!contact) {
        console.warn('Could not find Salesforce contact for:', event.userId);
        return;
      }
      
      // Create custom object record for emotional event
      await this.createEmotionalEvent(contact.Id, event, sfAuth);
      
      // Update contact/lead with latest emotional state
      await this.updateContactEmotionalState(contact.Id, event, sfAuth);
      
      // Create task for sales rep if intervention needed
      if (event.confidence > 85 && ['rage', 'abandonment'].includes(event.emotion)) {
        await this.createInterventionTask(contact.Id, event, sfAuth);
      }
      
    } catch (error) {
      console.error('Salesforce sync failed:', error);
    }
  }
  
  private async authenticate(): Promise<{ accessToken: string; instanceUrl: string }> {
    // In production, use proper OAuth flow
    // This is simplified for demonstration
    return {
      accessToken: this.config.accessToken!,
      instanceUrl: this.config.instanceUrl!
    };
  }
  
  private async findContact(identifier: string, auth: any): Promise<any> {
    const query = `SELECT Id, Email, Name, Account.Name FROM Contact WHERE Email = '${identifier}' LIMIT 1`;
    
    const response = await axios.get(
      `${auth.instanceUrl}/services/data/${this.apiVersion}/query`,
      {
        params: { q: query },
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.records[0] || null;
  }
  
  private async createEmotionalEvent(contactId: string, event: EmotionalCRMUpdate, auth: any): Promise<void> {
    await axios.post(
      `${auth.instanceUrl}/services/data/${this.apiVersion}/sobjects/SentientIQ_Event__c`,
      {
        Contact__c: contactId,
        Emotion__c: event.emotion,
        Confidence__c: event.confidence,
        Page_URL__c: event.pageUrl,
        Predicted_Action__c: event.predictedAction,
        Intervention_Suggested__c: event.interventionSuggested,
        Timestamp__c: event.timestamp.toISOString()
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  private async updateContactEmotionalState(contactId: string, event: EmotionalCRMUpdate, auth: any): Promise<void> {
    await axios.patch(
      `${auth.instanceUrl}/services/data/${this.apiVersion}/sobjects/Contact/${contactId}`,
      {
        Last_Emotion__c: event.emotion,
        Last_Emotion_Confidence__c: event.confidence,
        Last_Emotion_Date__c: event.timestamp.toISOString(),
        Emotional_Health__c: this.calculateEmotionalHealth(event.emotion, event.confidence),
        Needs_Intervention__c: event.confidence > 80 && ['rage', 'frustration', 'abandonment'].includes(event.emotion)
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  private async createInterventionTask(contactId: string, event: EmotionalCRMUpdate, auth: any): Promise<void> {
    const priority = event.emotion === 'rage' ? 'High' : 'Normal';
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + (priority === 'High' ? 1 : 4));
    
    await axios.post(
      `${auth.instanceUrl}/services/data/${this.apiVersion}/sobjects/Task`,
      {
        WhoId: contactId,
        Subject: `URGENT: Customer experiencing ${event.emotion} (${event.confidence}% confidence)`,
        Description: `Customer showed ${event.emotion} on ${event.pageUrl} at ${event.timestamp.toISOString()}.
                     Predicted action: ${event.predictedAction}
                     Suggested intervention: ${event.interventionSuggested}
                     
                     Immediate action required to prevent churn.`,
        Priority: priority,
        Status: 'Open',
        ActivityDate: dueDate.toISOString().split('T')[0]
      },
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  private calculateEmotionalHealth(emotion: string, confidence: number): string {
    const score = this.getEmotionalScore(emotion, confidence);
    if (score < 30) return 'Critical';
    if (score < 50) return 'At Risk';
    if (score < 70) return 'Neutral';
    return 'Healthy';
  }
  
  private getEmotionalScore(emotion: string, confidence: number): number {
    const emotionScores: Record<string, number> = {
      'rage': -100,
      'abandonment': -90,
      'frustration': -70,
      'anxiety': -60,
      'confusion': -50,
      'hesitation': -30,
      'decision_paralysis': -40,
      'curiosity': 30,
      'discovery': 50,
      'confidence': 70,
      'delight': 90,
      'urgency': 20
    };
    
    const baseScore = emotionScores[emotion] || 0;
    const adjustedScore = baseScore * (confidence / 100);
    
    // Normalize to 0-100 scale
    return Math.max(0, Math.min(100, 50 + adjustedScore / 2));
  }
  
  async getContact(email: string): Promise<CRMContact | null> {
    const auth = await this.authenticate();
    const contact = await this.findContact(email, auth);
    
    if (!contact) return null;
    
    return {
      id: contact.Id,
      email: contact.Email,
      company: contact.Account?.Name,
      properties: contact
    };
  }
  
  async updateContact(contact: Partial<CRMContact>): Promise<void> {
    const auth = await this.authenticate();
    await axios.patch(
      `${auth.instanceUrl}/services/data/${this.apiVersion}/sobjects/Contact/${contact.id}`,
      contact.properties,
      {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  async createTimelineEvent(userId: string, event: any): Promise<void> {
    const auth = await this.authenticate();
    await this.createEmotionalEvent(userId, event, auth);
  }
}

/**
 * CRM Integration Manager
 */
export class CRMIntegrationService {
  private providers: Map<string, CRMProvider> = new Map();
  
  /**
   * Register a CRM provider
   */
  registerProvider(name: string, config: CRMConfig): void {
    let provider: CRMProvider;
    
    switch (config.provider) {
      case 'hubspot':
        provider = new HubSpotIntegration(config);
        break;
      case 'salesforce':
        provider = new SalesforceIntegration(config);
        break;
      default:
        throw new Error(`Unsupported CRM provider: ${config.provider}`);
    }
    
    this.providers.set(name, provider);
    console.log(`Registered CRM provider: ${name} (${config.provider})`);
  }
  
  /**
   * Sync emotional event to all registered CRMs
   */
  async syncEmotionalEvent(event: EmotionalCRMUpdate): Promise<void> {
    const syncPromises = Array.from(this.providers.entries()).map(([name, provider]) => {
      return provider.syncEmotionalEvent(event).catch(error => {
        console.error(`Failed to sync to ${name}:`, error);
      });
    });
    
    await Promise.all(syncPromises);
  }
  
  /**
   * Get provider by name
   */
  getProvider(name: string): CRMProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Initialize from environment variables
   */
  initializeFromEnv(): void {
    // HubSpot
    if (process.env.HUBSPOT_ACCESS_TOKEN) {
      this.registerProvider('hubspot', {
        provider: 'hubspot',
        accessToken: process.env.HUBSPOT_ACCESS_TOKEN,
        portalId: process.env.HUBSPOT_PORTAL_ID
      });
    }
    
    // Salesforce
    if (process.env.SALESFORCE_ACCESS_TOKEN && process.env.SALESFORCE_INSTANCE_URL) {
      this.registerProvider('salesforce', {
        provider: 'salesforce',
        accessToken: process.env.SALESFORCE_ACCESS_TOKEN,
        instanceUrl: process.env.SALESFORCE_INSTANCE_URL
      });
    }
  }
}

// Singleton instance
export const crmService = new CRMIntegrationService();

// Initialize on startup
crmService.initializeFromEnv();

export default crmService;