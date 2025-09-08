import type { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyToken } from '@clerk/clerk-sdk-node';

const supabaseAdmin = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

export async function adminAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'missing token' });

    // Verify token with Clerk
    const claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      issuer: process.env.CLERK_ISSUER || 'https://clerk.com'
    });
    const clerkSub = claims.sub as string;

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'admin service unavailable' });
    }

    // Check if user is super admin in Supabase
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id,is_super_admin')
      .eq('clerk_id', clerkSub)
      .maybeSingle();

    if (error || !data?.is_super_admin) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // Attach admin identity to request
    (req as any).admin = { userId: data.id, clerkSub };
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'invalid token', detail: String(e?.message || e) });
  }
}

// Helper to check if admin middleware is available
export function hasAdminCapability(): boolean {
  return !!(supabaseAdmin && process.env.CLERK_SECRET_KEY);
}