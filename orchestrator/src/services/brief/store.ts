// =============================================================
// File: src/services/brief/store.ts
// Purpose: Lightweight in-memory store for active debates, capturing
//          provenance, quotes, and synthesis. Optional Supabase save.
// Env (optional for persistence):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE or SUPABASE_ANON_KEY
// Table suggestion:
//   create table briefs (
//     id uuid primary key default gen_random_uuid(),
//     request_id text not null,
//     subject text,
//     summary text,
//     ctas jsonb,
//     quotes jsonb,
//     html text,
//     email text,
//     provider text,
//     model text,
//     created_at timestamptz default now()
//   );
// =============================================================
import fs from 'node:fs';
import path from 'node:path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type Quote = { speaker: string; text: string };
export type CTA = { action: string; owner: string; when: string };
export type DebateState = {
  requestId: string;
  subject: string;
  provider?: string;
  model?: string;
  quotes: Quote[]; // best 3–5 quotes
  summary?: string;
  ctas?: CTA[];
};

const debates = new Map<string, DebateState>();

function briefTemplatePath(): string {
  const tryPaths = [
    path.resolve(process.cwd(), 'templates/brief.html'), // when running from src/
    path.resolve(process.cwd(), 'dist/templates/brief.html'), // when running built code
    path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../templates/brief.html'),
  ];
  for (const p of tryPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('brief.html template not found');
}

export function debateInit(requestId: string, meta: { subject: string; provider?: string; model?: string }) {
  debates.set(requestId, {
    requestId,
    subject: meta.subject,
    provider: meta.provider,
    model: meta.model,
    quotes: [],
  });
}

export function debateMaybeQuote(requestId: string, speaker: string, text: string) {
  const s = debates.get(requestId);
  if (!s) return;
  const clean = (text || '').trim();
  if (!clean) return;
  // Only keep short punchy lines and avoid duplicates
  if (clean.length < 220 && !s.quotes.find(q => q.text === clean)) {
    // Favor Emotion/ROI/Strategic first, then others
    const priority = ['Emotion', 'ROI', 'Strategic'];
    const boost = priority.includes(speaker) ? -1 : 0;
    // Push and trim to max 5 quotes
    s.quotes.push({ speaker, text: clean, } as Quote);
    if (s.quotes.length > 5) s.quotes.splice(5);
  }
}

export function debateSetSynthesis(requestId: string, payload: { summary: string; ctas: CTA[] }) {
  const s = debates.get(requestId);
  if (!s) return;
  s.summary = payload.summary;
  s.ctas = payload.ctas;
}

export function getDebate(requestId: string) {
  return debates.get(requestId);
}

export function renderBriefHTML(data: {
  requestId: string;
  subject: string;
  summary: string;
  provider?: string;
  model?: string;
  ctas: CTA[];
  quotes: Quote[];
  appUrl?: string;
  briefUrl?: string;
  engine?: string;
}) {
  const tpl = fs.readFileSync(briefTemplatePath(), 'utf8');
  function esc(x: any) {
    return String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  const date = new Date().toLocaleString();
  const rows = (data.ctas || []).map(c =>
    `<tr><td>${esc(c.action)}</td><td>${esc(c.owner)}</td><td>${esc(c.when)}</td></tr>`
  ).join('');
  const quotes = (data.quotes || []).map(q =>
    `<blockquote><em>${esc(q.speaker)}:</em> ${esc(q.text)}</blockquote>`
  ).join('');
  let html = tpl
    .replace(/{{subject}}/g, esc(data.subject))
    .replace(/{{requestId}}/g, esc(data.requestId))
    .replace(/{{date}}/g, esc(date))
    .replace(/{{engine}}/g, esc(data.engine || 'orchestrator'))
    .replace(/{{provider}}/g, esc(data.provider || '—'))
    .replace(/{{model}}/g, esc(data.model || '—'))
    .replace(/{{summary}}/g, esc(data.summary))
    .replace(/{{briefUrl}}/g, esc(data.briefUrl || ''))
    .replace(/{{appUrl}}/g, esc(data.appUrl || ''));
  html = html.replace(/{{#ctas}}([\s\S]*?){{\/ctas}}/, (_m, block) => block.replace('{{rows}}', rows));
  html = html.replace(/{{#quotes}}([\s\S]*?){{\/quotes}}/, (_m, block) => (data.quotes?.length ? block : ''));
  html = html.replace(/<tbody>[\s\S]*<\/tbody>/, `<tbody>${rows}</tbody>`);
  html = html.replace('<!--QUOTES-->', quotes);
  return html;
}

let supabase: SupabaseClient | null = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY)) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY!
  );
}

export async function persistBriefToSupabase(row: {
  request_id: string;
  subject: string;
  summary: string;
  ctas: CTA[];
  quotes: Quote[];
  html: string;
  email?: string;
  provider?: string;
  model?: string;
}) {
  if (!supabase) return { ok: false, skipped: true } as const;
  const { error } = await supabase.from('briefs').insert(row as any);
  if (error) throw error;
  return { ok: true } as const;
}