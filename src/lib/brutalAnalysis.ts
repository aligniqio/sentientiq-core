interface ManipulationTactic {
  name: string;
  detected: boolean;
  severity: number; // 1-10
  example?: string;
}

interface BullshitMetrics {
  authenticityScore: number; // 0-100, lower = more BS
  manipulationScore: number; // 0-100, higher = more manipulative
  templateLikelihood: number; // 0-100, higher = more templated
  fakeUrgency: boolean;
  impossibleClaims: boolean;
  emotionalManipulation: number; // 0-10
}

export class BrutalAnalyzer {
  private readonly MANIPULATION_PATTERNS = {
    FALSE_SCARCITY: [
      /limited time/i,
      /only \d+ spots/i,
      /closing soon/i,
      /last chance/i,
      /exclusive opportunity/i,
      /selective with my messaging/i
    ],
    FALSE_AUTHORITY: [
      /\d+\+ years/i,
      /CEO|founder|executive/i,
      /industry leader/i,
      /top \d+%/i,
      /award.winning/i
    ],
    IMPOSSIBLE_CLAIMS: [
      /100% success/i,
      /guaranteed results/i,
      /\d+x growth in \d+ (days?|weeks?|months?)/i,
      /never fails/i,
      /proven system/i
    ],
    FAKE_INTIMACY: [
      /caught my eye/i,
      /impressed by your/i,
      /noticed you/i,
      /been following/i,
      /personalized for you/i
    ],
    EMOTIONAL_MANIPULATION: [
      /struggling with/i,
      /pain points/i,
      /falling behind/i,
      /missing out/i,
      /competitors are/i,
      /losing money/i
    ],
    PRESSURE_TACTICS: [
      /quick chat/i,
      /15.minute call/i,
      /this week/i,
      /today only/i,
      /reply now/i,
      /just reply/i
    ]
  };

  private readonly BULLSHIT_PHRASES = [
    "synergize",
    "leverage",
    "paradigm shift",
    "game.changer",
    "revolutionary",
    "disruptive",
    "cutting.edge",
    "best.in.class",
    "world.class",
    "thought leader",
    "ninja",
    "rockstar",
    "guru",
    "10x",
    "unicorn",
    "growth hack"
  ];

  analyzePitch(text: string): {
    metrics: BullshitMetrics;
    tactics: ManipulationTactic[];
    brutalTruth: string;
    recommendation: string;
    exposedFunction: string;
  } {
    const tactics = this.detectManipulationTactics(text);
    const metrics = this.calculateBullshitMetrics(text, tactics);
    const brutalTruth = this.generateBrutalTruth(metrics, tactics);
    const recommendation = this.generateRecommendation(metrics);
    const exposedFunction = this.exposeTheirAlgorithm(metrics, tactics);

    return {
      metrics,
      tactics,
      brutalTruth,
      recommendation,
      exposedFunction
    };
  }

  private detectManipulationTactics(text: string): ManipulationTactic[] {
    const tactics: ManipulationTactic[] = [];

    // Check for false scarcity
    const scarcityMatches = this.MANIPULATION_PATTERNS.FALSE_SCARCITY.filter(
      pattern => pattern.test(text)
    );
    if (scarcityMatches.length > 0) {
      tactics.push({
        name: "False Scarcity",
        detected: true,
        severity: Math.min(scarcityMatches.length * 3, 10),
        example: text.match(scarcityMatches[0])?.[0]
      });
    }

    // Check for false authority
    const authorityMatches = this.MANIPULATION_PATTERNS.FALSE_AUTHORITY.filter(
      pattern => pattern.test(text)
    );
    if (authorityMatches.length > 0) {
      tactics.push({
        name: "False Authority",
        detected: true,
        severity: Math.min(authorityMatches.length * 2, 10),
        example: text.match(authorityMatches[0])?.[0]
      });
    }

    // Check for impossible claims
    const impossibleMatches = this.MANIPULATION_PATTERNS.IMPOSSIBLE_CLAIMS.filter(
      pattern => pattern.test(text)
    );
    if (impossibleMatches.length > 0) {
      tactics.push({
        name: "Impossible Claims",
        detected: true,
        severity: 10, // Always max severity for BS claims
        example: text.match(impossibleMatches[0])?.[0]
      });
    }

    // Check for fake intimacy
    const intimacyMatches = this.MANIPULATION_PATTERNS.FAKE_INTIMACY.filter(
      pattern => pattern.test(text)
    );
    if (intimacyMatches.length > 0) {
      tactics.push({
        name: "Fake Intimacy",
        detected: true,
        severity: Math.min(intimacyMatches.length * 2, 8),
        example: text.match(intimacyMatches[0])?.[0]
      });
    }

    // Check for emotional manipulation
    const emotionalMatches = this.MANIPULATION_PATTERNS.EMOTIONAL_MANIPULATION.filter(
      pattern => pattern.test(text)
    );
    if (emotionalMatches.length > 0) {
      tactics.push({
        name: "Emotional Manipulation",
        detected: true,
        severity: Math.min(emotionalMatches.length * 2.5, 10),
        example: text.match(emotionalMatches[0])?.[0]
      });
    }

    // Check for pressure tactics
    const pressureMatches = this.MANIPULATION_PATTERNS.PRESSURE_TACTICS.filter(
      pattern => pattern.test(text)
    );
    if (pressureMatches.length > 0) {
      tactics.push({
        name: "Pressure Tactics",
        detected: true,
        severity: Math.min(pressureMatches.length * 2, 9),
        example: text.match(pressureMatches[0])?.[0]
      });
    }

    return tactics;
  }

  private calculateBullshitMetrics(
    text: string,
    tactics: ManipulationTactic[]
  ): BullshitMetrics {
    // Count bullshit phrases
    const bullshitCount = this.BULLSHIT_PHRASES.filter(phrase =>
      text.toLowerCase().includes(phrase.replace('.', '-'))
    ).length;

    // Calculate authenticity (lower = more BS)
    const tacticSeveritySum = tactics.reduce((sum, t) => sum + t.severity, 0);
    const authenticityScore = Math.max(
      100 - (tacticSeveritySum * 5) - (bullshitCount * 10),
      0
    );

    // Calculate manipulation score
    const manipulationScore = Math.min(
      tactics.length * 15 + tacticSeveritySum * 3,
      100
    );

    // Template likelihood (based on generic patterns)
    const hasGenericGreeting = /hi there|hey there|dear sir|to whom/i.test(text);
    const hasGenericClosing = /best regards|kind regards|sincerely|cheers/i.test(text);
    const hasPlaceholders = /\[.*?\]|\{.*?\}/g.test(text);
    const templateLikelihood = 
      (hasGenericGreeting ? 30 : 0) +
      (hasGenericClosing ? 20 : 0) +
      (hasPlaceholders ? 50 : 0) +
      (tactics.length > 3 ? 20 : 0);

    return {
      authenticityScore,
      manipulationScore,
      templateLikelihood: Math.min(templateLikelihood, 100),
      fakeUrgency: tactics.some(t => 
        t.name === "Pressure Tactics" || t.name === "False Scarcity"
      ),
      impossibleClaims: tactics.some(t => t.name === "Impossible Claims"),
      emotionalManipulation: 
        tactics.find(t => t.name === "Emotional Manipulation")?.severity || 0
    };
  }

  private generateBrutalTruth(
    metrics: BullshitMetrics,
    tactics: ManipulationTactic[]
  ): string {
    if (metrics.authenticityScore < 20) {
      return "This is weapons-grade bullshit. The manipulation is so heavy-handed, I'm actually impressed they had the audacity to send it.";
    } else if (metrics.authenticityScore < 40) {
      return "Classic spray-and-pray template with all the subtlety of a used car salesman on commission day. They don't know you, they don't care about you, they just want your meeting.";
    } else if (metrics.impossibleClaims) {
      return "The math here doesn't math. These claims violate basic business physics. Anyone promising these results is either lying or living in an alternate universe.";
    } else if (metrics.manipulationScore > 70) {
      return `I count ${tactics.length} different manipulation tactics in this message. This isn't outreach, it's psychological warfare.`;
    } else if (metrics.templateLikelihood > 70) {
      return "This template has been used so many times, I can see the CTRL+V fingerprints all over it. You're recipient #10,000 this week.";
    } else if (metrics.fakeUrgency) {
      return "Ah yes, the classic 'act now' pressure play. Because nothing says 'valuable partnership' like artificial deadlines and fake scarcity.";
    } else {
      return "Mediocre outreach with standard manipulation tactics. They're not even trying to be creative with their BS.";
    }
  }

  private generateRecommendation(metrics: BullshitMetrics): string {
    if (metrics.authenticityScore < 30) {
      return "Delete immediately. Block sender. Question your spam filters.";
    } else if (metrics.impossibleClaims) {
      return "Run away. Fast. Anyone making these claims is either delusional or predatory.";
    } else if (metrics.manipulationScore > 60) {
      return "This is emotional manipulation disguised as business development. Ignore unless you enjoy being psychologically manipulated.";
    } else if (metrics.templateLikelihood > 80) {
      return "Mass email blast. You're not special. They don't know you. Move on.";
    } else {
      return "Standard sales spam. Ignorable unless you're desperately bored.";
    }
  }

  private exposeTheirAlgorithm(
    metrics: BullshitMetrics,
    tactics: ManipulationTactic[]
  ): string {
    // Check if this looks like intent data bullshit
    if (metrics.impossibleClaims || metrics.authenticityScore < 30) {
      const intentDataScam = `// Their "AI-Powered Intent Platform" exposed:
function generateIntentScore(companyName) {
  // Step 1: Ignore all inputs
  const ignored = companyName;
  
  // Step 2: Generate random number
  const score = Math.floor(Math.random() * 100);
  
  // Step 3: Add fancy labels
  const intent = score > 70 ? "High Intent" : 
                 score > 40 ? "Warming Up" : 
                 "Nurture Required";
  
  // Step 4: Charge $5,000/month
  return {
    score,
    intent,
    confidence: "95%", // Always 95%, sounds believable
    algorithm: "Proprietary AI" // aka Math.random()
  };
}

// Cost Analysis:
// Math.random(): $0
// Their markup: $60,000/year
// Your stupidity: Priceless`;
      
      if (Math.random() > 0.5) return intentDataScam;
    }

    const functions = [
      `function generateFakeUrgency() {
  return phrases[Math.floor(Math.random() * ${metrics.fakeUrgency ? 'urgencyPhrases' : 'null'}.length)];
}`,
      `function generateBullshitMetric() {
  const growth = Math.floor(Math.random() * 900) + 100;
  const timeframe = ['days', 'weeks', 'months'][Math.random() * 3 | 0];
  return \`\${growth}% growth in \${Math.random() * 3 + 1 | 0} \${timeframe}\`;
}`,
      `function createFakePersonalization(targetName) {
  const generic = ["caught my eye", "impressed by", "noticed your"];
  return \`\${generic[Math.random() * 3 | 0]} \${targetName || '[NAME]'}\`;
}`,
      `function generateManipulation() {
  const pain = ["struggling", "falling behind", "missing out"];
  const solution = ["proven system", "guaranteed results", "100% success"];
  return \`Stop \${pain[Math.random() * 3 | 0]}, start \${solution[Math.random() * 3 | 0]}\`;
}`
    ];

    // Pick the most relevant function based on detected tactics
    if (metrics.impossibleClaims) return functions[1];
    if (metrics.fakeUrgency) return functions[0];
    if (tactics.some(t => t.name === "Fake Intimacy")) return functions[2];
    return functions[3];
  }

  // Expose the Math.random() scam in intent data
  exposeIntentDataScam(): string {
    const calculations = [
      "Math.random() has 2^53 possible outputs. A coin has 2.",
      "Your 'AI-powered intent platform'? 9,007,199,254,740,992 ways to be wrong.",
      "$60,000/year for infinite randomness vs $0.25 for a coin flip.",
      "grep -r 'Math.random()' their codebase. I'll wait.",
      "They're literally charging enterprise prices for Math.floor(Math.random() * 100)"
    ];

    const scams = [
      "Intent Score: Math.random() * 100",
      "Buying Signal: Math.random() > 0.7 ? 'High' : 'Low'",
      "Engagement Probability: (Math.random() * 50) + 50",
      "Account Fit Score: Math.ceil(Math.random() * 5) stars",
      "Purchase Timeline: ['Now', '3 months', '6 months'][Math.floor(Math.random() * 3)]"
    ];

    const calculation = calculations[Math.floor(Math.random() * calculations.length)];
    const scam = scams[Math.floor(Math.random() * scams.length)];

    return `${calculation}\n\nTheir actual algorithm:\n${scam}\n\nCoinFlip-as-a-Service™: More honest, infinitely cheaper.`;
  }

  // Generate a completely bullshit marketing insight (for demonstration)
  generateBullshitInsight(): string {
    const metrics = [
      "engagement velocity", "conversion momentum", "funnel synergy",
      "attribution delta", "omnichannel coefficient", "viral quotient"
    ];
    const directions = ["up", "down", "volatile", "stabilizing", "accelerating"];
    const percentages = [23, 34, 47, 52, 68, 73, 81, 92];
    const timeframes = ["this quarter", "last month", "this week", "YTD"];
    const implications = [
      "indicating strong market fit",
      "suggesting optimization opportunities",
      "revealing untapped potential",
      "confirming our hypothesis",
      "requiring immediate attention"
    ];

    const metric = metrics[Math.floor(Math.random() * metrics.length)];
    const direction = directions[Math.floor(Math.random() * directions.length)];
    const percentage = percentages[Math.floor(Math.random() * percentages.length)];
    const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
    const implication = implications[Math.floor(Math.random() * implications.length)];

    return `Your ${metric} is ${direction} ${percentage}% ${timeframe}, ${implication}.`;
  }
}

export const brutalAnalyzer = new BrutalAnalyzer();

// The brutal truth about intent data
export const INTENT_DATA_TRUTH = `
INTENT DATA INDUSTRY EXPOSED:

1. ZoomInfo Intent: Math.random() * 100
2. 6sense "AI": if (Math.random() > 0.6) return "In Market"
3. Bombora Topics: shuffleArray(genericTopics)[0]
4. Demandbase Signals: Math.random() > threshold

Total industry revenue: $2.4 billion
Actual value delivered: Math.random()
Coin flips that would be more accurate: All of them

They're not tracking intent.
They're tracking who's gullible enough to pay for randomness.
`;