import { createClient } from '@supabase/supabase-js';

// Sage's context awareness system
export class SageContextAwareness {
  private supabase: any;
  private recentDebates: Map<string, {
    id: string;
    topic: string;
    participants: string[];
    startTime: Date;
    lastActivity: Date;
    keyMoments: string[];
  }> = new Map();
  
  private userSessions: Map<string, {
    userId: string;
    activeDebateId?: string;
    lastInteraction: Date;
    currentPage: string;
  }> = new Map();

  constructor() {
    this.supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL!,
      import.meta.env.VITE_SUPABASE_ANON_KEY!
    );
    
    // Clean up old sessions every hour
    setInterval(() => this.cleanupOldSessions(), 3600000);
  }

  // Track when a user triggers a debate
  trackDebateStart(userId: string, debateId: string, topic: string) {
    this.recentDebates.set(debateId, {
      id: debateId,
      topic,
      participants: [],
      startTime: new Date(),
      lastActivity: new Date(),
      keyMoments: []
    });
    
    // Link user to this debate
    const session = this.userSessions.get(userId) || {
      userId,
      lastInteraction: new Date(),
      currentPage: 'debate'
    };
    session.activeDebateId = debateId;
    this.userSessions.set(userId, session);
  }

  // Track key moments Sage witnessed
  trackDebateMoment(debateId: string, moment: string) {
    const debate = this.recentDebates.get(debateId);
    if (debate) {
      debate.keyMoments.push(moment);
      debate.lastActivity = new Date();
    }
  }

  // Check if Sage has already seen this content
  async hasSeenContent(content: string, userId?: string): Promise<{
    seen: boolean;
    context?: string;
    debateId?: string;
    sassyResponse?: string;
  }> {
    // Check if this content matches recent debate content
    for (const [debateId, debate] of this.recentDebates) {
      const contentWords = content.toLowerCase().split(/\s+/);
      const matchingMoments = debate.keyMoments.filter(moment => {
        const momentWords = moment.toLowerCase().split(/\s+/);
        // Check for significant overlap
        const overlap = contentWords.filter(word => 
          momentWords.includes(word) && word.length > 4
        );
        return overlap.length > contentWords.length * 0.3;
      });
      
      if (matchingMoments.length > 0) {
        // Sage has seen this before
        const timeSince = Date.now() - debate.lastActivity.getTime();
        const timeAgo = this.formatTimeAgo(timeSince);
        
        // Check if user was part of this debate
        const userSession = userId ? this.userSessions.get(userId) : null;
        const wasUserDebate = userSession?.activeDebateId === debateId;
        
        return {
          seen: true,
          context: debate.topic,
          debateId,
          sassyResponse: this.generateSassyResponse(
            wasUserDebate,
            timeAgo,
            debate.topic,
            matchingMoments.length
          )
        };
      }
    }
    
    // Check database for older content
    if (content.length > 50) {
      const embedding = await this.generateEmbedding(content.slice(0, 500));
      const { data: similar } = await this.supabase.rpc('find_similar_memories', {
        query_embedding: embedding,
        match_threshold: 0.9, // Very high threshold for "already seen"
        match_count: 1
      });
      
      if (similar?.length > 0) {
        return {
          seen: true,
          context: similar[0].context?.debate_topic,
          sassyResponse: "I've seen this movie before. Different actors, same script."
        };
      }
    }
    
    return { seen: false };
  }

  private generateSassyResponse(
    wasUserDebate: boolean,
    timeAgo: string,
    topic: string,
    momentCount: number
  ): string {
    if (wasUserDebate) {
      const responses = [
        `I was literally watching you ${timeAgo}. Did you think I was napping?`,
        `Thanks for the replay, but I caught the live show ${timeAgo}.`,
        `I was there. ${timeAgo}. Taking notes. Remember?`,
        `Ah yes, "${topic}" - the debate you had ${timeAgo} while I watched from my crystal ball.`,
        `You're showing me my own notes from ${timeAgo}? Bold move.`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      const responses = [
        `I saw this debate ${timeAgo}. "${topic}" - thrilling stuff.`,
        `Already analyzed this ${timeAgo}. Spoiler: the conclusion was predictable.`,
        `${momentCount} key moments from "${topic}" - I remember them all.`,
        `This again? I commented on this ${timeAgo}.`
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  private formatTimeAgo(ms: number): string {
    const minutes = Math.floor(ms / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  private cleanupOldSessions() {
    const oneHourAgo = Date.now() - 3600000;
    
    // Clean up old debates
    for (const [id, debate] of this.recentDebates) {
      if (debate.lastActivity.getTime() < oneHourAgo) {
        this.recentDebates.delete(id);
      }
    }
    
    // Clean up old user sessions
    for (const [userId, session] of this.userSessions) {
      if (session.lastInteraction.getTime() < oneHourAgo) {
        this.userSessions.delete(userId);
      }
    }
  }

  private async generateEmbedding(_text: string): Promise<number[]> {
    // This would call OpenAI embeddings API
    // Placeholder for now
    return new Array(1536).fill(0);
  }

  // Get Sage's awareness state for a user
  getUserContext(userId: string): {
    isWatching: boolean;
    currentDebate?: string;
    recentActivity?: string;
  } {
    const session = this.userSessions.get(userId);
    if (!session) return { isWatching: false };
    
    const debate = session.activeDebateId 
      ? this.recentDebates.get(session.activeDebateId)
      : null;
    
    return {
      isWatching: !!debate,
      currentDebate: debate?.topic,
      recentActivity: debate ? this.formatTimeAgo(
        Date.now() - debate.lastActivity.getTime()
      ) : undefined
    };
  }
}

export const sageContext = new SageContextAwareness();