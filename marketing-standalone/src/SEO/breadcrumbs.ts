export type Crumb = { name: string; url: string };

export function crumbsFromPath(siteUrl: string, path: string): Crumb[] {
  const parts = path.split('?')[0].split('/').filter(Boolean);
  const acc: Crumb[] = [{ name: 'Home', url: siteUrl + '/' }];
  let current = siteUrl + '/';
  for (const p of parts) {
    current += (current.endsWith('/') ? '' : '/') + p;
    acc.push({ name: p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), url: current });
  }
  return acc;
}
