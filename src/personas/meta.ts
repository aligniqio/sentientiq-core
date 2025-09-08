export type PersonaMeta = {
  id: string;            // stable id in your system
  name: string;          // UI label
  role: string;          // small subtitle
  creds: string[];       // 2-3 short chips
  voice: string;         // 1-line personality injection
  alt?: string;          // optional 2nd line on hover
};

export const PERSONA_META: Record<string, PersonaMeta> = {
  strategic: {
    id: 'strategic',
    name: 'Dr. Strategic',
    role: 'Chief Marketing Officer',
    creds: ['GM strategy', 'Portfolio bets'],
    voice: 'Orchestrates the go-to-market portfolio; picks a single bet and sequencing.'
  },
  emotion: {
    id: 'emotion',
    name: 'Dr. Emotion',
    role: 'Consumer Psychology',
    creds: ['Plutchik model', 'Behavioral design'],
    voice: 'Turns fear→trust at key moments; designs emotional guardrails.'
  },
  pattern: {
    id: 'pattern',
    name: 'Dr. Pattern',
    role: 'Data Science Lead',
    creds: ['Anomaly detect', 'Cohort maps'],
    voice: 'Finds non-obvious trends and leading indicators; flags hidden regressions.'
  },
  identity: {
    id: 'identity',
    name: 'Dr. Identity',
    role: 'CDP Architect',
    creds: ['Data unification', 'Audience graph'],
    voice: 'Resolves who is who; keeps the story consistent across surfaces.'
  },
  chaos: {
    id: 'chaos',
    name: 'Dr. Chaos',
    role: 'Creative Mutation',
    creds: ['A/B at scale', 'Message search'],
    voice: 'Mutates copy/creative to find breakout angles fast.'
  },
  roi: {
    id: 'roi',
    name: 'Dr. ROI',
    role: 'Budget Optimization',
    creds: ['Unit econ', 'Pricing science'],
    voice: 'Finds the money; protects margin with ARPU floors and payback math.'
  },
  warfare: {
    id: 'warfare',
    name: 'Dr. Warfare',
    role: 'Competitive Intelligence',
    creds: ['Battlecards', 'Win/loss'],
    voice: 'Exposes competitor weak points and counter-moves this sprint.'
  },
  omni: {
    id: 'omni',
    name: 'Dr. Omni',
    role: 'Channel Optimizer',
    creds: ['Orchestration', 'Attribution sanity'],
    voice: 'Routes effort across channels; kills wasted loops.'
  },
  first: {
    id: 'first',
    name: 'Dr. First',
    role: 'Onboarding Intelligence',
    creds: ['Activation', 'Time-to-value'],
    voice: 'Engineers first-run joy; removes the "first 3 seconds" friction.'
  },
  truth: {
    id: 'truth',
    name: 'Dr. Truth',
    role: 'Attribution Science',
    creds: ['Causality', 'Model checks'],
    voice: 'Calls BS on false lifts; sets kill criteria for experiments.'
  },
  brutal: {
    id: 'brutal',
    name: 'Dr. Brutal',
    role: 'Sage Intelligence',
    creds: ['Reality checks', 'Risk'],
    voice: 'Says the quiet part; forces trade-offs and stop rules.'
  },
  context: {
    id: 'context',
    name: 'Dr. Context',
    role: 'Learning Engine',
    creds: ['Pattern memory', 'RAG'],
    voice: 'Learns from every interaction; promotes proven moves to defaults.'
  }
};