/**
 * Executive Escalation System
 * 
 * THE NORTH STAR: When a $100k customer shows rage, 
 * the CEO gets a text within 3 seconds with a link to intervene.
 * 
 * No delays. No excuses. Just instant executive awareness.
 */

import twilio from 'twilio';
import { EventEmitter } from 'events';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 3 second deadline - NO EXCEPTIONS
const CEO_ALERT_DEADLINE_MS = 3000;

// Alert thresholds
const ESCALATION_THRESHOLDS = {
  CEO: 100000,        // $100k+ → CEO
  VP_SALES: 50000,    // $50k+ → VP Sales
  ACCOUNT_MANAGER: 10000, // $10k+ → Account Manager
  SUPPORT_LEAD: 5000  // $5k+ → Support Lead
};

// Critical emotions that trigger escalation
const CRITICAL_EMOTIONS = [
  'rage',
  'abandonment_risk',
  'sticker_shock',
  'exit_risk',
  'frustration_peak'
];

interface ExecutiveContact {
  role: 'CEO' | 'VP_SALES' | 'ACCOUNT_MANAGER' | 'SUPPORT_LEAD';
  name: string;
  phone: string;
  email: string;
  whatsapp?: string;
  slack?: string;
  escalationOrder: number;
}

interface CriticalAlert {
  customerId: string;
  customerEmail: string;
  customerCompany: string;
  customerValue: number;
  emotion: string;
  confidence: number;
  section: string;
  dashboardUrl: string;
  timestamp: number;
  escalationLevel: string;
}

interface AlertResult {
  success: boolean;
  method: 'sms' | 'whatsapp' | 'call' | 'slack';
  recipient: string;
  deliveryTime: number; // milliseconds
  messageId?: string;
  error?: string;
}

class ExecutiveAlertSystem extends EventEmitter {
  private twilioClient: any;
  private supabase: SupabaseClient | null = null;
  private executiveContacts: Map<string, ExecutiveContact> = new Map();
  private alertHistory: CriticalAlert[] = [];
  private metrics = {
    totalAlerts: 0,
    ceoAlerts: 0,
    avgDeliveryTime: 0,
    failedAlerts: 0,
    under3SecondAlerts: 0,
    savedRevenue: 0
  };

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      console.log('✅ Twilio initialized for executive alerts');
    } else {
      console.error('❌ Twilio credentials missing - CEO ALERTS WILL FAIL');
    }

    // Initialize Supabase for contact storage
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    }

    // Load executive contacts
    await this.loadExecutiveContacts();
  }

  private async loadExecutiveContacts(): Promise<void> {
    // Load from environment or database
    const contacts: ExecutiveContact[] = [
      {
        role: 'CEO',
        name: process.env.CEO_NAME || 'CEO',
        phone: process.env.CEO_PHONE || '',
        email: process.env.CEO_EMAIL || '',
        whatsapp: process.env.CEO_WHATSAPP,
        slack: process.env.CEO_SLACK_ID,
        escalationOrder: 1
      },
      {
        role: 'VP_SALES',
        name: process.env.VP_SALES_NAME || 'VP Sales',
        phone: process.env.VP_SALES_PHONE || '',
        email: process.env.VP_SALES_EMAIL || '',
        escalationOrder: 2
      },
      {
        role: 'ACCOUNT_MANAGER',
        name: process.env.AM_NAME || 'Account Manager',
        phone: process.env.AM_PHONE || '',
        email: process.env.AM_EMAIL || '',
        escalationOrder: 3
      },
      {
        role: 'SUPPORT_LEAD',
        name: process.env.SUPPORT_LEAD_NAME || 'Support Lead',
        phone: process.env.SUPPORT_LEAD_PHONE || '',
        email: process.env.SUPPORT_LEAD_EMAIL || '',
        escalationOrder: 4
      }
    ];

    for (const contact of contacts) {
      if (contact.phone || contact.whatsapp || contact.slack) {
        this.executiveContacts.set(contact.role, contact);
      }
    }

    console.log(`📱 Loaded ${this.executiveContacts.size} executive contacts`);
  }

  /**
   * CRITICAL PATH: Send CEO alert for high-value rage
   * MUST complete in <3 seconds
   */
  async sendCriticalAlert(params: {
    userId: string;
    email: string;
    company: string;
    value: number;
    emotion: string;
    confidence: number;
    section: string;
    sessionId: string;
  }): Promise<AlertResult> {
    const startTime = Date.now();
    
    // Determine escalation level
    const escalationLevel = this.getEscalationLevel(params.value);
    const contact = this.executiveContacts.get(escalationLevel);
    
    if (!contact) {
      console.error(`❌ No contact found for ${escalationLevel} level`);
      return {
        success: false,
        method: 'sms',
        recipient: 'unknown',
        deliveryTime: Date.now() - startTime,
        error: 'No contact configured'
      };
    }

    // Build dashboard URL
    const dashboardUrl = this.buildDashboardUrl(params.sessionId, params.userId);
    
    // Create alert record
    const alert: CriticalAlert = {
      customerId: params.userId,
      customerEmail: params.email,
      customerCompany: params.company,
      customerValue: params.value,
      emotion: params.emotion,
      confidence: params.confidence,
      section: params.section,
      dashboardUrl,
      timestamp: Date.now(),
      escalationLevel
    };
    
    this.alertHistory.push(alert);
    
    // Try multiple channels in parallel for speed
    const alertPromises: Promise<AlertResult>[] = [];
    
    // SMS is fastest - always try first
    if (contact.phone && this.twilioClient) {
      alertPromises.push(this.sendSMS(contact, alert));
    }
    
    // WhatsApp as backup
    if (contact.whatsapp && this.twilioClient) {
      alertPromises.push(this.sendWhatsApp(contact, alert));
    }
    
    // Slack for internal notification
    if (contact.slack) {
      alertPromises.push(this.sendSlack(contact, alert));
    }
    
    // Race to deliver through any channel
    try {
      const result = await Promise.race(alertPromises);
      
      const deliveryTime = Date.now() - startTime;
      result.deliveryTime = deliveryTime;
      
      // Track metrics
      this.metrics.totalAlerts++;
      if (escalationLevel === 'CEO') {
        this.metrics.ceoAlerts++;
      }
      if (deliveryTime < CEO_ALERT_DEADLINE_MS) {
        this.metrics.under3SecondAlerts++;
      }
      this.metrics.avgDeliveryTime = 
        (this.metrics.avgDeliveryTime * (this.metrics.totalAlerts - 1) + deliveryTime) / 
        this.metrics.totalAlerts;
      
      // Log performance
      if (deliveryTime > CEO_ALERT_DEADLINE_MS) {
        console.error(`🚨 DEADLINE MISSED: Alert took ${deliveryTime}ms (target: ${CEO_ALERT_DEADLINE_MS}ms)`);
      } else {
        console.log(`✅ Alert delivered in ${deliveryTime}ms to ${contact.name}`);
      }
      
      // Emit event
      this.emit('alert:sent', {
        alert,
        result,
        deliveryTime
      });
      
      // Log to database
      await this.logAlert(alert, result);
      
      return result;
      
    } catch (error: any) {
      this.metrics.failedAlerts++;
      console.error('❌ All alert channels failed:', error);
      
      return {
        success: false,
        method: 'sms',
        recipient: contact.name,
        deliveryTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Send SMS alert via Twilio
   */
  private async sendSMS(contact: ExecutiveContact, alert: CriticalAlert): Promise<AlertResult> {
    const message = this.formatSMSMessage(alert);
    
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `${process.env.API_URL}/webhooks/twilio/status`
      });
      
      return {
        success: true,
        method: 'sms',
        recipient: contact.name,
        deliveryTime: 0,
        messageId: result.sid
      };
    } catch (error: any) {
      throw new Error(`SMS failed: ${error.message}`);
    }
  }

  /**
   * Send WhatsApp alert via Twilio
   */
  private async sendWhatsApp(contact: ExecutiveContact, alert: CriticalAlert): Promise<AlertResult> {
    const message = this.formatWhatsAppMessage(alert);
    
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        to: `whatsapp:${contact.whatsapp}`,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
      });
      
      return {
        success: true,
        method: 'whatsapp',
        recipient: contact.name,
        deliveryTime: 0,
        messageId: result.sid
      };
    } catch (error: any) {
      throw new Error(`WhatsApp failed: ${error.message}`);
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlack(contact: ExecutiveContact, alert: CriticalAlert): Promise<AlertResult> {
    // Direct message to executive
    const message = this.formatSlackMessage(alert);
    
    try {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL || '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: contact.slack,
          text: message,
          attachments: [{
            color: 'danger',
            title: `🚨 ${alert.customerCompany} - ${alert.emotion.toUpperCase()}`,
            fields: [
              { title: 'Customer Value', value: `$${alert.customerValue.toLocaleString()}/yr`, short: true },
              { title: 'Confidence', value: `${alert.confidence}%`, short: true },
              { title: 'Section', value: alert.section, short: true },
              { title: 'Email', value: alert.customerEmail, short: true }
            ],
            actions: [{
              type: 'button',
              text: 'Open Dashboard',
              url: alert.dashboardUrl,
              style: 'danger'
            }]
          }]
        })
      });
      
      return {
        success: response.ok,
        method: 'slack',
        recipient: contact.name,
        deliveryTime: 0
      };
    } catch (error: any) {
      throw new Error(`Slack failed: ${error.message}`);
    }
  }

  /**
   * Format SMS message - MUST BE CONCISE
   */
  private formatSMSMessage(alert: CriticalAlert): string {
    return `🚨 URGENT: ${alert.customerCompany} ($${Math.round(alert.customerValue/1000)}k/yr) showing ${alert.emotion.toUpperCase()}. Dashboard: ${alert.dashboardUrl}`;
  }

  /**
   * Format WhatsApp message
   */
  private formatWhatsAppMessage(alert: CriticalAlert): string {
    return `*🚨 CRITICAL CUSTOMER ALERT*\n\n` +
           `Company: *${alert.customerCompany}*\n` +
           `Value: *$${alert.customerValue.toLocaleString()}/yr*\n` +
           `Emotion: *${alert.emotion.toUpperCase()}* (${alert.confidence}%)\n` +
           `Section: ${alert.section}\n\n` +
           `👉 Intervene now: ${alert.dashboardUrl}`;
  }

  /**
   * Format Slack message
   */
  private formatSlackMessage(alert: CriticalAlert): string {
    return `🚨 *CRITICAL: $${Math.round(alert.customerValue/1000)}k customer needs immediate attention*`;
  }

  /**
   * Determine who to escalate to based on value
   */
  private getEscalationLevel(value: number): string {
    if (value >= ESCALATION_THRESHOLDS.CEO) return 'CEO';
    if (value >= ESCALATION_THRESHOLDS.VP_SALES) return 'VP_SALES';
    if (value >= ESCALATION_THRESHOLDS.ACCOUNT_MANAGER) return 'ACCOUNT_MANAGER';
    return 'SUPPORT_LEAD';
  }

  /**
   * Build one-click intervention dashboard URL
   */
  private buildDashboardUrl(sessionId: string, userId: string): string {
    const baseUrl = process.env.DASHBOARD_URL || 'https://app.sentientiq.app';
    return `${baseUrl}/intervention?session=${sessionId}&user=${userId}&urgent=true`;
  }

  /**
   * Log alert to database for tracking
   */
  private async logAlert(alert: CriticalAlert, result: AlertResult): Promise<void> {
    if (!this.supabase) return;
    
    try {
      await this.supabase
        .from('executive_alerts')
        .insert({
          customer_id: alert.customerId,
          customer_email: alert.customerEmail,
          customer_company: alert.customerCompany,
          customer_value: alert.customerValue,
          emotion: alert.emotion,
          confidence: alert.confidence,
          section: alert.section,
          dashboard_url: alert.dashboardUrl,
          escalation_level: alert.escalationLevel,
          delivery_method: result.method,
          delivery_time_ms: result.deliveryTime,
          success: result.success,
          error: result.error,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to log alert:', error);
    }
  }

  /**
   * Send follow-up if no action taken
   */
  async sendFollowUp(alertId: string, minutesElapsed: number): Promise<void> {
    const alert = this.alertHistory.find(a => 
      `${a.customerId}_${a.timestamp}` === alertId
    );
    
    if (!alert) return;
    
    const contact = this.executiveContacts.get(alert.escalationLevel);
    if (!contact) return;
    
    const message = `⏰ REMINDER: ${alert.customerCompany} still needs attention (${minutesElapsed} min elapsed). ${alert.dashboardUrl}`;
    
    if (contact.phone && this.twilioClient) {
      await this.twilioClient.messages.create({
        body: message,
        to: contact.phone,
        from: process.env.TWILIO_PHONE_NUMBER
      });
    }
  }

  /**
   * Get alert metrics
   */
  getMetrics(): any {
    return {
      ...this.metrics,
      successRate: this.metrics.totalAlerts > 0 ? 
        ((this.metrics.totalAlerts - this.metrics.failedAlerts) / this.metrics.totalAlerts * 100).toFixed(1) + '%' : 
        '0%',
      under3SecondRate: this.metrics.totalAlerts > 0 ?
        (this.metrics.under3SecondAlerts / this.metrics.totalAlerts * 100).toFixed(1) + '%' :
        '0%'
    };
  }

  /**
   * Test alert system (for setup verification)
   */
  async testAlert(): Promise<AlertResult> {
    console.log('🧪 Testing executive alert system...');
    
    return this.sendCriticalAlert({
      userId: 'test_user',
      email: 'test@example.com',
      company: 'Test Company',
      value: 100000,
      emotion: 'test_rage',
      confidence: 95,
      section: 'pricing',
      sessionId: 'test_session'
    });
  }
}

// Singleton instance
export const executiveAlerts = new ExecutiveAlertSystem();

export default executiveAlerts;