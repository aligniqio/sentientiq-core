import { LucideIcon } from 'lucide-react';
import { 
  Map, Brain, TrendingUp, Fingerprint, Zap, DollarSign,
  Crosshair, Globe, Compass, Search, Skull, Layers
} from 'lucide-react';

export type PersonaMeta = {
  id: string;            // stable id in your system
  name: string;          // UI label
  role: string;          // small subtitle
  creds: string[];       // 2-3 short chips
  voice: string;         // 1-line personality injection
  alt?: string;          // optional 2nd line on hover
  icon?: LucideIcon;     // visual identity
  color?: string;        // signature color for UI
};

export const PERSONA_META: Record<string, PersonaMeta> = {
  strategic: {
    id: 'strategic',
    name: 'Dr. Strategic',
    role: 'Chief Marketing Officer',
    creds: ['GM strategy', 'Portfolio bets'],
    voice: 'Orchestrates the go-to-market portfolio; picks a single bet and sequencing.',
    icon: Map,
    color: '#9333ea' // purple
  },
  emotion: {
    id: 'emotion',
    name: 'Dr. Emotion',
    role: 'Consumer Psychology',
    creds: ['Plutchik model', 'Behavioral design'],
    voice: 'Turns fear→trust at key moments; designs emotional guardrails.',
    icon: Brain,
    color: '#ec4899' // pink
  },
  pattern: {
    id: 'pattern',
    name: 'Dr. Pattern',
    role: 'Data Science Lead',
    creds: ['Anomaly detect', 'Cohort maps'],
    voice: 'Finds non-obvious trends and leading indicators; flags hidden regressions.',
    icon: TrendingUp,
    color: '#3b82f6' // blue
  },
  identity: {
    id: 'identity',
    name: 'Dr. Identity',
    role: 'CDP Architect',
    creds: ['Data unification', 'Audience graph'],
    voice: 'Resolves who is who; keeps the story consistent across surfaces.',
    icon: Fingerprint,
    color: '#10b981' // emerald
  },
  chaos: {
    id: 'chaos',
    name: 'Dr. Chaos',
    role: 'Creative Mutation',
    creds: ['A/B at scale', 'Message search'],
    voice: 'Mutates copy/creative to find breakout angles fast.',
    icon: Zap,
    color: '#f97316' // orange
  },
  roi: {
    id: 'roi',
    name: 'Dr. ROI',
    role: 'Budget Optimization',
    creds: ['Unit econ', 'Pricing science'],
    voice: 'Finds the money; protects margin with ARPU floors and payback math.',
    icon: DollarSign,
    color: '#f59e0b' // amber
  },
  warfare: {
    id: 'warfare',
    name: 'Dr. Warfare',
    role: 'Competitive Intelligence',
    creds: ['Battlecards', 'Win/loss'],
    voice: 'Exposes competitor weak points and counter-moves this sprint.',
    icon: Crosshair,
    color: '#ef4444' // red
  },
  omni: {
    id: 'omni',
    name: 'Dr. Omni',
    role: 'Channel Optimizer',
    creds: ['Orchestration', 'Attribution sanity'],
    voice: 'Routes effort across channels; kills wasted loops.',
    icon: Globe,
    color: '#14b8a6' // teal
  },
  maverick: {
    id: 'maverick',
    name: 'Dr. Maverick',
    role: 'Contrarian VC',
    creds: ['Anti-consensus', '100x returns'],
    voice: 'Bets against the crowd; finds alpha where others see failure.',
    icon: Compass,
    color: '#6366f1' // indigo
  },
  truth: {
    id: 'truth',
    name: 'Dr. Truth',
    role: 'Attribution Science',
    creds: ['Causality', 'Model checks'],
    voice: 'Calls BS on false lifts; sets kill criteria for experiments.',
    icon: Search,
    color: '#6b7280' // gray
  },
  brutal: {
    id: 'brutal',
    name: 'Dr. Brutal',
    role: 'Sage Intelligence',
    creds: ['Reality checks', 'Risk'],
    voice: 'Says the quiet part; forces trade-offs and stop rules.',
    icon: Skull,
    color: '#8b5cf6' // violet
  },
  context: {
    id: 'context',
    name: 'Dr. Context',
    role: 'Learning Engine',
    creds: ['Pattern memory', 'RAG'],
    voice: 'Learns from every interaction; promotes proven moves to defaults.',
    icon: Layers,
    color: '#22c55e' // green
  }
};