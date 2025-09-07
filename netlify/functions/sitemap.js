exports.handler = async () => {
  const siteUrl = process.env.SITE_URL || 'https://sentientiq.ai';
  const routes = ['/', '/pricing', '/faq', '/legal/privacy', '/legal/terms'];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${routes.map(p=>`<url><loc>${siteUrl}${p}</loc><changefreq>weekly</changefreq><priority>${p==='/'?'1.0':'0.7'}</priority></url>`).join('')}
  </urlset>`;
  return { statusCode: 200, headers: { 'content-type': 'application/xml; charset=utf-8' }, body };
};
