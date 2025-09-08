// =============================================================
// File: src/services/brief/exportBrief.ts
// Purpose: Express handler for POST /v1/debate/export
// Body: { requestId: string, email: string, subject?: string }
// Sends the brief via email and (optionally) persists to Supabase.
// =============================================================
import type { Request, Response } from 'express';
import { getDebate, renderBriefHTML, persistBriefToSupabase } from './store.js';
import { sendBriefEmail } from '../email/provider.js';

export async function exportBriefHandler(req: Request, res: Response) {
  const { requestId, email, subject } = (req.body || {}) as { requestId?: string; email?: string; subject?: string };
  if (!requestId || !email) {
    return res.status(400).json({ ok: false, error: 'requestId and email are required' });
  }
  try {
    const s = getDebate(requestId);
    
    // Hardening: Extract CTAs from summary if missing
    if ((!s?.ctas || !s.ctas.length) && s?.summary) {
      const lines = s.summary.split(/\n+/).filter(Boolean);
      s.ctas = lines.filter(l => /^(\d+\.|-|•)/.test(l)).slice(0, 3).map(l => {
        const action = l.replace(/^(\d+\.|-|•)\s*/, '');
        return { action, owner: 'Owner TBD', when: '2–3 weeks' };
      });
    }
    
    if (!s || !s.summary || !s.ctas) {
      return res.status(409).json({ ok: false, error: 'debate_not_ready', message: 'Summary/CTAs missing or requestId expired' });
    }
    const html = renderBriefHTML({
      requestId: s.requestId,
      subject: subject || s.subject || 'Collective Synthesis',
      summary: s.summary!,
      ctas: s.ctas!,
      quotes: s.quotes || [],
      provider: s.provider,
      model: s.model,
      appUrl: process.env.APP_URL || 'https://sentientiq.app',
      briefUrl: (process.env.APP_URL || 'https://sentientiq.app') + '/library',
      engine: 'orchestrator',
    });

    const emailResp = await sendBriefEmail({ to: email, subject: subject || s.subject || 'Collective Synthesis', html });

    // Optional persistence
    try {
      await persistBriefToSupabase({
        request_id: s.requestId,
        subject: subject || s.subject || 'Collective Synthesis',
        summary: s.summary!,
        ctas: s.ctas!,
        quotes: s.quotes || [],
        html,
        email,
        provider: s.provider,
        model: s.model,
      });
    } catch (e) {
      console.warn('[brief] persist skipped/failed:', (e as Error).message);
    }

    return res.status(200).json({ ok: true, provider: emailResp.provider, requestId: s.requestId });
  } catch (err) {
    console.error('[exportBrief]', err);
    return res.status(500).json({ ok: false, error: 'export_failed' });
  }
}