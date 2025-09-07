import { useLocation } from 'react-router-dom';

/** Derives canonical URL and site URL (ai vs app) at runtime. */
export function useSeoBasics() {
  const loc = useLocation();
  const host = typeof window !== 'undefined' ? window.location.host : 'sentientiq.ai';
  // Force marketing vs app by domain
  const isMarketing = host.endsWith('sentientiq.ai') || host.includes('localhost:5173-ai');
  const siteUrl = isMarketing ? 'https://sentientiq.ai' : 'https://sentientiq.app';
  const path = loc.pathname + (loc.search || '');
  const canonical = new URL(path || '/', siteUrl).toString();
  return { siteUrl, path, canonical, isMarketing };
}
