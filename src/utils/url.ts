// utils/url.ts - Bulletproof URL utilities (NO new URL() constructor!)
export function normalizeOrigin(u?: string) {
  const win = typeof window !== 'undefined' ? window.location.origin : 'https://sentientiq.ai';
  if (!u) return win;
  let s = (''+u).trim();
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  // if still not host-like, fallback
  if (!/^https?:\/\/[^/\s]+/i.test(s)) return win;
  return s.replace(/\/+$/,'');
}

export function abs(base: string, p?: string) {
  const b = base.replace(/\/+$/,'');
  const path = (p || '/').trim();
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return b + (path.startsWith('/') ? path : '/' + path);
}