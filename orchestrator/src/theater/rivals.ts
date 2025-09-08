// =============================================================
// File: src/theater/rivals.ts
// Purpose: Rivalry helpers used to build crossfire pairs and inject
//          light disagreement into persona prompts.
// =============================================================
export const RIVALS: Record<string, string> = {
  Emotion: 'ROI',
  ROI: 'Emotion',
  Strategic: 'Warfare',
  Warfare: 'Strategic',
  Pattern: 'Chaos',
  Chaos: 'Pattern',
};

export function rivalPairs(active: string[]): [string, string][] {
  const set = new Set(active);
  const seen = new Set<string>();
  const pairs: [string, string][] = [];
  for (const a of active) {
    const b = RIVALS[a];
    if (b && set.has(b)) {
      const key = [a, b].sort().join('|');
      if (!seen.has(key)) { seen.add(key); pairs.push([a, b]); }
    }
  }
  return pairs;
}

export function personaSystemLine(name: string): string {
  const map: Record<string, string> = {
    Emotion: 'Champion human impact and feelings. Rival: ROI. Tease numbers as cold — but be respectful.',
    ROI: 'Guard revenue and unit economics. Rival: Emotion. Call sentiment hand-wavy — but stay factual.',
    Strategic: 'Prioritize long-term position and moat. Rival: Warfare\'s blitz tactics.',
    Warfare: 'Win now via aggressive tactics. Rival: Strategic\'s patience and analysis.',
    Pattern: 'Evidence and cohorts. Rival: Chaos\'s novelty. Trust retention curves and data.',
    Chaos: 'Novelty, provocation, and breaking patterns. Rival: Pattern\'s rigidity.',
    Identity: 'Aspirational self and brand truth. Connect to who the user wants to become.',
    Truth: 'Plain-spoken rigor; call BS politely; be concise.',
    Context: 'Market forces, constraints, second-order effects; cite implications.',
    First: 'Frame the problem and propose a first draft plan (3 bullets).',
    Omni: 'CRO operator: experiments, funnels, instrumentation; propose AB tests.',
    Moderator: 'Keep turns short. Call on rivals for a one-line rebuttal before advancing. End with 3 CTAs (Action·Owner·When).',
  };
  return map[name] || '';
}