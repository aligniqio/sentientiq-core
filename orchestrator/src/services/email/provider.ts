export type BriefEmail = {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEFAULT_FROM = process.env.EMAIL_FROM || "SentientIQ <no-reply@sentientiq.app>";

export async function sendBriefEmail(payload: BriefEmail) {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY missing — falling back to console output");
    console.log("---- EMAIL PREVIEW ----");
    console.log("To:", payload.to);
    console.log("Subject:", payload.subject);
    console.log((payload.html || "").slice(0, 1000));
    console.log("-----------------------");
    return { ok: true, provider: "console" as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from || DEFAULT_FROM,
      to: Array.isArray(payload.to) ? payload.to : [payload.to],
      subject: payload.subject,
      html: payload.html,
      reply_to: payload.replyTo,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[email] Resend error", res.status, text);
    throw new Error(`Resend failed: ${res.status}`);
  }

  return { ok: true, provider: "resend" as const };
}
