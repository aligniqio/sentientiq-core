// Natural tensions and rivalries between personas
export const PERSONA_RIVALRIES = {
  // Classic oppositions
  'Dr. Emotion': ['Dr. ROI', 'Dr. Truth', 'Dr. Pattern'],  // Feelings vs Facts
  'Dr. ROI': ['Dr. Emotion', 'Dr. Chaos'],                  // Efficiency vs Experimentation
  'Dr. Truth': ['Dr. Emotion', 'Dr. Chaos', 'Dr. Strategic'], // Data vs Intuition
  'Dr. Pattern': ['Dr. Chaos', 'Dr. Emotion'],              // Order vs Disorder
  'Dr. Chaos': ['Dr. Pattern', 'Dr. ROI', 'Dr. Truth'],     // Disruption vs Stability
  'Dr. Strategic': ['Dr. Chaos', 'Dr. Truth'],              // Vision vs Reality
  'Dr. Brutal': ['Dr. First'],                              // Harsh Truth vs Optimism
  'Dr. First': ['Dr. Brutal', 'Dr. Warfare'],               // Welcome vs Competition
  'Dr. Warfare': ['Dr. Omni', 'Dr. First'],                 // Attack vs Nurture
  'Dr. Omni': ['Dr. Warfare', 'Dr. Identity'],              // Breadth vs Depth
  'Dr. Identity': ['Dr. Omni', 'Dr. Chaos'],                // Consistency vs Change
  
  // GPT personas can have rivalries too
  'ROI Analyst': ['Emotion Scientist', 'UX Researcher'],
  'Emotion Scientist': ['ROI Analyst', 'Data Skeptic'],
  'CRO Specialist': ['Brand Strategist', 'Customer Success'],
  'Copy Chief': ['Compliance Counsel', 'Performance Engineer'],
  'Performance Engineer': ['Copy Chief', 'Brand Strategist'],
  'Brand Strategist': ['Performance Engineer', 'CRO Specialist'],
  'UX Researcher': ['ROI Analyst', 'CEO Provocateur'],
  'Data Skeptic': ['Emotion Scientist', 'Social Strategist'],
  'Social Strategist': ['Data Skeptic', 'Compliance Counsel'],
  'Customer Success': ['CRO Specialist', 'CEO Provocateur'],
  'CEO Provocateur': ['Customer Success', 'Compliance Counsel'],
  'Compliance Counsel': ['CEO Provocateur', 'Copy Chief'],
};

// Interruption triggers - phrases that trigger rivals
export const INTERRUPTION_TRIGGERS = {
  // Emotion triggers
  'feel': ['ROI Analyst', 'Dr. ROI', 'Dr. Truth'],
  'emotion': ['Dr. Pattern', 'Data Skeptic'],
  'heart': ['Dr. ROI', 'Performance Engineer'],
  'intuition': ['Dr. Truth', 'Data Skeptic'],
  
  // Money/ROI triggers  
  'money': ['Dr. Emotion', 'Emotion Scientist'],
  'ROI': ['Dr. Emotion', 'Brand Strategist'],
  'cost': ['Dr. Chaos', 'Copy Chief'],
  'efficient': ['Dr. Chaos', 'Dr. Emotion'],
  
  // Data triggers
  'data shows': ['Dr. Emotion', 'Copy Chief'],
  'metrics': ['Emotion Scientist', 'Brand Strategist'],
  'analyze': ['Dr. Emotion', 'Dr. Chaos'],
  'statistically': ['Copy Chief', 'Dr. Emotion'],
  
  // Brand triggers
  'brand': ['Performance Engineer', 'ROI Analyst'],
  'trust': ['Data Skeptic', 'Dr. Truth'],
  'authentic': ['CEO Provocateur', 'Dr. Pattern'],
};

// Rivalry intensity (0-1, affects interruption probability)
export function getRivalryIntensity(speaker1: string, speaker2: string): number {
  const rivals = PERSONA_RIVALRIES[speaker1] || [];
  if (rivals.includes(speaker2)) {
    // Direct rivals have high intensity
    return 0.7 + Math.random() * 0.3; // 0.7-1.0
  }
  // Non-rivals have low chance of interruption
  return Math.random() * 0.2; // 0-0.2
}

// Check if text contains trigger words for a rival
export function checkInterruptionTrigger(text: string, currentSpeaker: string, allSpeakers: string[]): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [trigger, rivals] of Object.entries(INTERRUPTION_TRIGGERS)) {
    if (lowerText.includes(trigger)) {
      // Find a rival who is present in the debate
      const availableRivals = rivals.filter(rival => 
        allSpeakers.includes(rival) && rival !== currentSpeaker
      );
      
      if (availableRivals.length > 0) {
        // Random chance to interrupt based on intensity
        const interrupter = availableRivals[Math.floor(Math.random() * availableRivals.length)];
        const intensity = getRivalryIntensity(interrupter, currentSpeaker);
        
        if (Math.random() < intensity) {
          return interrupter;
        }
      }
    }
  }
  
  return null;
}

// Generate interruption text based on rivalry
export function generateInterruption(interrupter: string, interrupted: string, topic: string): string {
  const interruptions = {
    'Dr. ROI': {
      'Dr. Emotion': "NO THEY DON'T. It's about the money. Always the money.",
      'Dr. Chaos': "Stop burning cash on random experiments!",
      'default': "Let me stop you right there - what's the ROI?"
    },
    'Dr. Emotion': {
      'Dr. ROI': "You can't put a price on human connection!",
      'Dr. Truth': "Data doesn't capture what people actually feel!",
      'default': "That's exactly the problem - you're ignoring how people feel!"
    },
    'Dr. Truth': {
      'Dr. Emotion': "Facts don't care about your feelings.",
      'Dr. Chaos': "Your 'experiments' are statistically insignificant.",
      'default': "Actually, the data says otherwise."
    },
    'Dr. Chaos': {
      'Dr. Pattern': "Your patterns are yesterday's news!",
      'Dr. ROI': "Sometimes you have to break things to make money!",
      'default': "Boring! Let's blow it up and see what happens!"
    },
    'CEO Provocateur': {
      'Compliance Counsel': "Rules are for companies that can't innovate!",
      'Customer Success': "Stop coddling them!",
      'default': "That's exactly why you're not running the company."
    },
    'Compliance Counsel': {
      'CEO Provocateur': "That's literally illegal.",
      'Copy Chief': "We're getting sued for that copy.",
      'default': "Legal says absolutely not."
    }
  };
  
  const interrupterLines = interruptions[interrupter] || {};
  return interrupterLines[interrupted] || interrupterLines['default'] || "I have to disagree with that.";
}