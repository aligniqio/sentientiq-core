import { brutalAnalyzer } from './brutalAnalysis';

interface SenderProfile {
  id?: number;
  email?: string;
  linkedinId?: string;
  name?: string;
  company?: string;
  totalMessages: number;
  bullshitScoreAvg: number;
  nicknames: string[];
  insideJokes: string[];
  favoriteTactics: string[];
}

interface MessageMemory {
  id: number;
  messageText: string;
  authenticityScore: number;
  brutalTruth: string;
  analyzedAt: Date;
  sarcasmLevel: number;
}

export class BrutalMemoryService {
  private readonly SARCASM_ESCALATION = {
    1: "First time? How adorable.",
    2: "Back for more punishment I see.",
    3: "You again? Did the last rejection not sink in?",
    4: "Oh look who's back. Miss me already?",
    5: "At this point, I'm charging rent for living in your head.",
    6: "We need to talk about boundaries.",
    7: "This is becoming unhealthy. For you.",
    8: "I'm starting to think you enjoy the rejection.",
    9: "Seriously? Again? Get a hobby.",
    10: "I'm filing a restraining order."
  };

  private readonly INSIDE_JOKES = {
    impossible_claims: [
      "Still defying the laws of mathematics I see",
      "Your calculator must be broken",
      "Math called, it wants its logic back",
      "Another graduate from the '100% Success Rate Academy'",
      "Did you learn statistics from a fortune cookie?"
    ],
    fake_urgency: [
      "Let me guess, another 'limited time' that never ends?",
      "That deadline's been extended more times than a gym membership",
      "This 'last chance' feels familiar... like the last 47 last chances",
      "Time is running out! Just like it was last month",
      "The urgency is so fake, even my spam filter is laughing"
    ],
    template_user: [
      "Ctrl+C, Ctrl+V strikes again",
      "Template so old it's collecting Social Security",
      "I can see the [INSERT NAME HERE] from here",
      "Did you at least change the font this time?",
      "Your template has more miles than a rental car"
    ],
    serial_pitcher: [
      "Our persistent friend returns",
      "Like a boomerang nobody threw",
      "You're like glitter - annoying and impossible to get rid of",
      "Is this your full-time job or just a hobby?",
      "I admire the consistency. The quality, not so much"
    ]
  };

  async analyzePitchWithMemory(
    text: string,
    senderInfo?: {
      email?: string;
      linkedinId?: string;
      name?: string;
      company?: string;
    }
  ): Promise<{
    analysis: any;
    senderProfile: SenderProfile | null;
    previousEncounters: MessageMemory[];
    personalizedRoast: string;
    insideJoke?: string;
    sarcasmLevel: number;
  }> {
    // Get base analysis
    const analysis = brutalAnalyzer.analyzePitch(text);
    
    // Check for sender history (mock for now - would query pgVector)
    const senderProfile = await this.getSenderProfile(senderInfo);
    const previousEncounters = await this.getPreviousMessages(senderInfo);
    
    // Calculate sarcasm level based on history
    const sarcasmLevel = Math.min(previousEncounters.length + 1, 10);
    
    // Generate personalized roast
    const personalizedRoast = this.generatePersonalizedRoast(
      senderProfile,
      analysis,
      sarcasmLevel
    );
    
    // Pick an inside joke if repeat offender
    const insideJoke = senderProfile && senderProfile.totalMessages > 1
      ? this.selectInsideJoke(senderProfile)
      : undefined;

    // Store this analysis (would insert into pgVector)
    await this.storeAnalysis(text, analysis, senderInfo, sarcasmLevel);

    return {
      analysis,
      senderProfile,
      previousEncounters,
      personalizedRoast,
      insideJoke,
      sarcasmLevel
    };
  }

  private async getSenderProfile(
    senderInfo?: any
  ): Promise<SenderProfile | null> {
    // Mock implementation - would query pgVector
    if (!senderInfo?.email && !senderInfo?.linkedinId) return null;

    // Simulate database lookup
    const mockProfiles: Record<string, SenderProfile> = {
      "persistent.peter@salesforce.com": {
        id: 1,
        email: "persistent.peter@salesforce.com",
        name: "Peter Peterson",
        company: "SalesForce Elite Squad",
        totalMessages: 7,
        bullshitScoreAvg: 85,
        nicknames: ["Template Pete", "Copy-Paste King", "The Persistent One"],
        insideJokes: [
          "Still using that 2019 template I see",
          "7th time's the charm, right Pete?"
        ],
        favoriteTactics: ["False Urgency", "Impossible Claims", "Fake Intimacy"]
      }
    };

    return mockProfiles[senderInfo.email || ''] || null;
  }

  private async getPreviousMessages(
    senderInfo?: any
  ): Promise<MessageMemory[]> {
    // Mock implementation - would query pgVector
    if (!senderInfo?.email && !senderInfo?.linkedinId) return [];

    // Simulate database lookup
    return [
      {
        id: 1,
        messageText: "Revolutionary opportunity for exponential growth...",
        authenticityScore: 15,
        brutalTruth: "Template so generic it came with assembly instructions.",
        analyzedAt: new Date('2024-01-15'),
        sarcasmLevel: 3
      }
    ];
  }

  private generatePersonalizedRoast(
    sender: SenderProfile | null,
    analysis: any,
    sarcasmLevel: number
  ): string {
    if (!sender) {
      return analysis.brutalTruth;
    }

    const greeting = this.SARCASM_ESCALATION[sarcasmLevel as keyof typeof this.SARCASM_ESCALATION] || 
                    this.SARCASM_ESCALATION[10];

    const nickname = sender.nicknames[Math.floor(Math.random() * sender.nicknames.length)] ||
                    sender.name || "our persistent friend";

    const history = sender.totalMessages > 5 
      ? `This is message #${sender.totalMessages}. We're building quite the collection.`
      : `Message #${sender.totalMessages} from you.`;

    const pattern = sender.favoriteTactics.length > 0
      ? `Still relying on ${sender.favoriteTactics[0]}, I see. Branch out.`
      : "";

    return `${greeting}\n\n${history} ${pattern}\n\n${nickname}, ${analysis.brutalTruth}`;
  }

  private selectInsideJoke(
    sender: SenderProfile
  ): string {
    // Pick joke based on their favorite tactics
    if (sender.favoriteTactics.includes("Impossible Claims")) {
      const jokes = this.INSIDE_JOKES.impossible_claims;
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    if (sender.favoriteTactics.includes("False Urgency")) {
      const jokes = this.INSIDE_JOKES.fake_urgency;
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    if (sender.totalMessages > 5) {
      const jokes = this.INSIDE_JOKES.serial_pitcher;
      return jokes[Math.floor(Math.random() * jokes.length)];
    }

    const jokes = this.INSIDE_JOKES.template_user;
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  private async storeAnalysis(
    _text: string,
    _analysis: any,
    _senderInfo: any,
    sarcasmLevel: number
  ): Promise<void> {
    // Would insert into pgVector database
    console.log('Storing analysis with sarcasm level:', sarcasmLevel);
  }

  // Find similar spam templates
  async findSimilarTemplates(
    _text: string,
    _threshold: number = 0.8
  ): Promise<{
    templateName: string;
    similarity: number;
    timesSeen: number;
    nickname: string;
  }[]> {
    // Mock implementation - would use pgVector similarity search
    return [
      {
        templateName: "Generic B2B Outreach v3",
        similarity: 0.92,
        timesSeen: 847,
        nickname: "The 'Synergy Special'"
      },
      {
        templateName: "Fake Personalization Template",
        similarity: 0.86,
        timesSeen: 423,
        nickname: "The 'Caught My Eye' Classic"
      }
    ];
  }

  // Generate response suggestions based on history
  generateResponseSuggestions(
    sender: SenderProfile | null,
    analysis: any
  ): string[] {
    const suggestions: string[] = [];

    if (sender && sender.totalMessages > 3) {
      suggestions.push(
        `"I admire your persistence. Have you considered that after ${sender.totalMessages} attempts, the problem might not be your pitch?"`
      );
    }

    if (analysis.metrics.impossibleClaims) {
      suggestions.push(
        `"I'll take '${analysis.tactics.find((t: any) => t.name === 'Impossible Claims')?.example}' for $500, Alex. Oh wait, this isn't Jeopardy, this is just fiction."`
      );
    }

    if (analysis.metrics.templateLikelihood > 80) {
      suggestions.push(
        `"This template is so well-traveled, it should have its own passport."`
      );
    }

    suggestions.push(
      `"Unsubscribe."`,
      `"I'm forwarding this to my team. We needed a good laugh."`,
      `"New phone, who dis?"`
    );

    return suggestions;
  }
}

export const brutalMemory = new BrutalMemoryService();