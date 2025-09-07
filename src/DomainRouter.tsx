import { Suspense, lazy } from 'react';

// Lazy chunks so the other side never loads
const Marketing = lazy(() => import('./marketing/MarketingSite'));
const ProductApp = lazy(() => import('./product/App'));

const isAppHost = (h: string) =>
  h === 'localhost' || /\.sentientiq\.app$/i.test(h);

export default function DomainRouter() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isApp = isAppHost(host);

  return (
    <Suspense fallback={<div style={{padding:20}}>Loading…</div>}>
      {isApp ? <ProductApp /> : <Marketing />}
    </Suspense>
  );
}