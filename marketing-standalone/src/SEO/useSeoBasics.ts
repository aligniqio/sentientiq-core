import { useLocation } from 'react-router-dom';
import { normalizeOrigin, abs } from '../utils/url';

/** Derives canonical URL and site URL (ai vs app) at runtime. */
export function useSeoBasics() {
  const loc = useLocation();
  const host = typeof window !== 'undefined' ? window.location.host : 'sentientiq.ai';
  // Force marketing vs app by domain
  const isMarketing = host.endsWith('sentientiq.ai') || host.includes('localhost:5173-ai');
  const siteUrl = isMarketing ? 'https://sentientiq.ai' : 'https://sentientiq.app';
  const path = loc.pathname + (loc.search || '');
  // Use centralized URL utils - no new URL()
  const canonical = abs(normalizeOrigin(siteUrl), path);
  return { siteUrl, path, canonical, isMarketing };
}
