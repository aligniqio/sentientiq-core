// =============================================================
// File: src/services/email/provider.ts
// Purpose: Send the Executive Brief via email (Postmark by default),
//          with a safe console fallback if not configured.
// Env:
//   POSTMARK_TOKEN=server-XXXX
//   POSTMARK_STREAM=outbound (optional)
//   EMAIL_FROM=no-reply@sentientiq.app
// =============================================================
import { ServerClient } from 'postmark';

export type BriefEmail = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

const POSTMARK_TOKEN = process.env.POSTMARK_TOKEN;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'no-reply@sentientiq.app';

export async function sendBriefEmail(payload: BriefEmail) {
  if (!POSTMARK_TOKEN) {
    console.warn('[email] POSTMARK_TOKEN missing — falling back to console output');
    console.log('---- EMAIL PREVIEW ----');
    console.log('To:', payload.to);
    console.log('Subject:', payload.subject);
    console.log(payload.html.slice(0, 1000));
    console.log('-----------------------');
    return { ok: true, provider: 'console' as const };
  }
  const client = new ServerClient(POSTMARK_TOKEN);
  await client.sendEmail({
    From: payload.from || DEFAULT_FROM,
    To: payload.to,
    Subject: payload.subject,
    HtmlBody: payload.html,
    MessageStream: process.env.POSTMARK_STREAM || 'outbound',
  });
  return { ok: true, provider: 'postmark' as const };
}