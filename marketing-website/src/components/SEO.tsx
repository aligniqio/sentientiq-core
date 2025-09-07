import { Helmet } from 'react-helmet-async';

type Breadcrumb = { name: string; url: string };
type QA = { question: string; answer: string };

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  path?: string;
  canonical?: string;
  noindex?: boolean;
  locale?: string;
  type?: 'website' | 'article' | 'product';
  siteUrl?: string;
  siteName?: string;
  twitterSite?: string;
  twitterCreator?: string;
  preconnectStripe?: boolean; 
  breadcrumbs?: Breadcrumb[];
  faq?: QA[];
}

const SEO: React.FC<SEOProps> = ({
  title = 'SentientIQ – Emotional Intelligence for Marketing',
  description = 'Replace intent guesswork with real emotions.',
  image = '/og-image.png',
  imageAlt = 'SentientIQ emotional intelligence visualization',
  path = '/',
  canonical,
  noindex = false,
  locale = 'en_US',
  type = 'website',
  siteUrl = 'https://sentientiq.ai',
  siteName = 'SentientIQ',
  twitterSite = '@sentientiq',
  twitterCreator = '@sentientiq',
  breadcrumbs,
  faq
}) => {
  const canonicalUrl = canonical || new URL(path, siteUrl).toString();
  const absoluteImage = image.startsWith('http') ? image : new URL(image, siteUrl).toString();
  const robots = noindex
    ? 'noindex, nofollow, noimageindex, noarchive, nosnippet'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  const orgId = `${siteUrl}#org`;
  const websiteId = `${siteUrl}#website`;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': orgId,
      name: siteName,
      url: siteUrl,
      logo: new URL('/logo.png', siteUrl).toString(),
      sameAs: ['https://twitter.com/sentientiq','https://www.linkedin.com/company/sentientiq']
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      url: siteUrl,
      name: siteName,
      publisher: { '@id': orgId },
      potentialAction: [{
        '@type': 'SearchAction',
        target: `${siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }]
    },
    {
      '@context': 'https://schema.org',
      '@type': type === 'article' ? 'Article' : 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: title,
      description,
      primaryImageOfPage: { '@type': 'ImageObject', url: absoluteImage },
      isPartOf: { '@id': websiteId },
      inLanguage: locale.replace('_','-')
    },
    breadcrumbs?.length ? {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name, item: b.url
      }))
    } : null,
    faq?.length ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(q => ({
        '@type': 'Question',
        name: q.question,
        acceptedAnswer: { '@type': 'Answer', text: q.answer }
      }))
    } : null
  ].filter(Boolean);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      <link rel="preconnect" href="https://js.stripe.com" />
      <link rel="preconnect" href="https://api.stripe.com" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default SEO;
