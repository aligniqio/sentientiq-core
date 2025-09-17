/**
 * Sage Support Service
 * Handles semantic search and AI-powered support for SentientIQ users
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface SupportRequest {
  id: string;
  user_id: string;
  organization_id: string;
  message: string;
  context: any;
  source: string;
  priority: string;
}

interface SimilarIssue {
  id: string;
  message: string;
  sage_response: string;
  context: any;
  issue_category: string;
  similarity: number;
}

export class SageSupportService {
  /**
   * Process a new support request
   */
  async processSupportRequest(requestId: string) {
    try {
      // 1. Fetch the support request
      const { data: request, error } = await supabase
        .from('sage_support')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error || !request) {
        throw new Error(`Support request not found: ${requestId}`);
      }

      // 2. Generate embedding for the message
      const embedding = await this.generateEmbedding(request.message);

      // 3. Find similar resolved issues
      const { data: similarIssues } = await supabase.rpc('find_similar_support_requests', {
        query_embedding: embedding,
        match_threshold: 0.75,
        match_count: 3
      });

      // 4. Generate context-aware response
      const response = await this.generateResponse(request, similarIssues || []);

      // 5. Generate embedding for the response (for future similarity searches)
      const responseEmbedding = await this.generateEmbedding(response.answer);

      // 6. Update the support request with response
      await supabase
        .from('sage_support')
        .update({
          message_embedding: embedding,
          sage_response: response.answer,
          sage_response_embedding: responseEmbedding,
          issue_category: response.category,
          issue_tags: response.tags,
          status: 'resolved',
          responded_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          resolution_time_seconds: Math.floor((Date.now() - new Date(request.created_at).getTime()) / 1000)
        })
        .eq('id', requestId);

      return response;
    } catch (error) {
      console.error('Error processing support request:', error);
      throw error;
    }
  }

  /**
   * Generate embedding using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Generate AI response based on context and similar issues
   */
  private async generateResponse(
    request: SupportRequest,
    similarIssues: SimilarIssue[]
  ) {
    const context = request.context;

    // Build system prompt with context
    const systemPrompt = `You are Sage, the AI support assistant for SentientIQ.
    You're helping a user who is implementing SentientIQ on their website using Google Tag Manager.

    Current Context:
    - Page: ${context.page}
    - Step: ${context.step}
    - Organization: ${context.organization_name}
    - Debug Mode: ${context.debug_mode ? 'Enabled' : 'Disabled'}
    - Scripts Copied: Telemetry=${context.scripts_copied?.telemetry || false}, Intervention=${context.scripts_copied?.intervention || false}

    The user is likely an auto dealer who is not technical. Be specific, clear, and helpful.
    Reference exact GTM menu locations and provide step-by-step guidance.`;

    // Build examples from similar issues
    const examples = similarIssues.map(issue => ({
      issue: issue.message,
      solution: issue.sage_response,
      category: issue.issue_category
    }));

    const userPrompt = `User Question: ${request.message}

${examples.length > 0 ? `
Similar Resolved Issues:
${examples.map((ex, i) => `
${i + 1}. Issue: ${ex.issue}
   Solution: ${ex.solution}
   Category: ${ex.category}`).join('\n')}
` : ''}

Please provide a helpful, specific response. If this is about GTM navigation, include exact click paths.
If debug mode is enabled, mention what they should see in the console.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const answer = completion.choices[0].message.content || 'I apologize, but I need more information to help you.';

    // Categorize the issue based on keywords
    const category = this.categorizeIssue(request.message, context);
    const tags = this.generateTags(request.message, answer);

    return {
      answer,
      category,
      tags
    };
  }

  /**
   * Categorize the support issue
   */
  private categorizeIssue(message: string, context: any): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('tag') || lowerMessage.includes('html') || lowerMessage.includes('gtm')) {
      return 'gtm_setup';
    }
    if (lowerMessage.includes('trigger') || lowerMessage.includes('fire') || lowerMessage.includes('firing')) {
      return 'trigger_config';
    }
    if (lowerMessage.includes('preview') || lowerMessage.includes('test')) {
      return 'testing';
    }
    if (lowerMessage.includes('console') || lowerMessage.includes('debug') || lowerMessage.includes('error')) {
      return 'debugging';
    }
    if (lowerMessage.includes('intervention') || lowerMessage.includes('widget')) {
      return 'intervention_config';
    }

    return 'general';
  }

  /**
   * Generate tags for the issue
   */
  private generateTags(message: string, response: string): string[] {
    const tags: string[] = [];
    const combined = (message + ' ' + response).toLowerCase();

    // Check for common keywords
    const keywordMap = {
      'gtm': 'gtm',
      'tag manager': 'gtm',
      'custom html': 'custom_html',
      'trigger': 'triggers',
      'all pages': 'all_pages_trigger',
      'dom ready': 'dom_ready_trigger',
      'preview': 'preview_mode',
      'console': 'console',
      'debug': 'debugging',
      'error': 'error',
      'not working': 'troubleshooting',
      'cant find': 'navigation',
      'where': 'navigation',
      'step 1': 'step1',
      'step 2': 'step2',
      'telemetry': 'telemetry',
      'intervention': 'intervention'
    };

    for (const [keyword, tag] of Object.entries(keywordMap)) {
      if (combined.includes(keyword)) {
        tags.push(tag);
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Get pending support requests
   */
  async getPendingRequests() {
    const { data, error } = await supabase
      .from('sage_support')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Process all pending requests
   */
  async processAllPending() {
    const pending = await this.getPendingRequests();
    console.log(`Processing ${pending.length} pending support requests...`);

    for (const request of pending) {
      try {
        await this.processSupportRequest(request.id);
        console.log(`✅ Processed request ${request.id}`);
      } catch (error) {
        console.error(`❌ Failed to process request ${request.id}:`, error);
      }
    }
  }
}

// Example usage:
// const sage = new SageSupportService();
// await sage.processAllPending();