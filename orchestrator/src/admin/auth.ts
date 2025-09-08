// orchestrator/src/admin/auth.ts
import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@clerk/clerk-sdk-node';

// ---- Clerk config (env-driven) ----
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';
const CLERK_AUDIENCE = process.env.CLERK_AUDIENCE || 'https://api.sentientiq.app';
const CLERK_AUTHORIZED_PARTY = process.env.CLERK_AUTHORIZED_PARTY || 'sentientiq.app';

// ---- Supabase admin client (optional) ----
const supabaseAdmin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing token' });

    if (!CLERK_SECRET_KEY) {
      return res.status(500).json({ error: 'clerk misconfigured' });
    }

    // ✅ Verify with supported options (no `issuer` here)
    const claims = await verifyToken(token, {
      secretKey: CLERK_SECRET_KEY,
      audience: [CLERK_AUDIENCE],                // what your API expects as aud
      authorizedParties: [CLERK_AUTHORIZED_PARTY] // which frontend can mint (azp)
      // clockSkewInMs: 30000,                   // optional
    });

    const clerkSub = (claims as any)?.sub as string | undefined;
    if (!clerkSub) return res.status(401).json({ error: 'invalid token (no sub)' });

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'admin service unavailable' });
    }

    // Check super-admin flag in Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id,is_super_admin')
      .eq('clerk_id', clerkSub)
      .maybeSingle();

    if (error) {
      // You can log error.message if desired
      return res.status(500).json({ error: 'admin lookup failed' });
    }
    if (!data?.is_super_admin) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Attach admin identity to request for downstream handlers
    (req as any).admin = { userId: data.id, clerkSub };
    return next();
  } catch (e: any) {
    return res
      .status(401)
      .json({ error: 'invalid token', detail: String(e?.message || e) });
  }
}

// Helper to check if admin middleware is available
export function hasAdminCapability(): boolean {
  return Boolean(supabaseAdmin && CLERK_SECRET_KEY);
}
