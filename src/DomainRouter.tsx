import { Suspense, lazy } from 'react';
import { isAppHost } from './utils/isAppHost';

// Lazy chunks so the other side never loads
const Marketing = lazy(() => import('./marketing/MarketingEntry'));
const ProductApp = lazy(() => import('./product/App'));

export default function DomainRouter() {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isApp = isAppHost(host);

  return (
    <Suspense fallback={<div style={{padding:20}}>Loading…</div>}>
      {isApp ? <ProductApp /> : <Marketing />}
    </Suspense>
  );
}