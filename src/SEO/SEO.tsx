import React from 'react';
import { Helmet } from 'react-helmet-async';
import { normalizeOrigin, abs } from '../utils/url';

type Breadcrumb = { name: string; url: string };
type QA = { question: string; answer: string };

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  path?: string;              // e.g. "/pricing"
  canonical?: string;         // override full URL
  noindex?: boolean;          // true for auth/account pages
  locale?: string;            // "en_US"
  type?: 'website' | 'article' | 'product';
  siteUrl?: string;           // "https://sentientiq.ai" (marketing) or ".app" (app)
  siteName?: string;          // "SentientIQ"
  twitterSite?: string;       // "@sentientiq"
  twitterCreator?: string;    // "@sentientiq"
  hreflangs?: { href: string; hrefLang: string }[];
  breadcrumbs?: Breadcrumb[];
  faq?: QA[];                 // only pass on pages where FAQs are visible
  article?: {
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    section?: string;
    tags?: string[];
  };
  product?: {
    name?: string;
    offers?: { price: string; currency: string }[]; // keep truthful
  };
  preconnectStripe?: boolean; // true on pricing/checkout pages
}

const SEO: React.FC<SEOProps> = ({
  title = 'SentientIQ – Emotional Intelligence for Digital Commerce',
  description = 'Measure real human emotions from real behavior. Replace "intent" guesses with Plutchik-grade emotional intelligence.',
  image = '/og-image.svg',
  imageAlt = 'SentientIQ emotional intelligence visualization',
  path = '/',
  canonical,
  noindex = false,
  locale = 'en_US',
  type = 'website',
  siteUrl = import.meta.env.VITE_SITE_URL || 'https://sentientiq.ai',
  siteName = 'SentientIQ',
  twitterSite = '@sentientiq',
  twitterCreator = '@sentientiq',
  hreflangs,
  breadcrumbs,
  faq,
  article,
  product,
  preconnectStripe = false
}) => {
  const base = normalizeOrigin(siteUrl);
  const canonicalUrl = canonical || abs(base, path || '/');
  const absoluteImage = image && /^https?:\/\//i.test(image) ? image : abs(base, image || '/og-image.svg');
  const robots = noindex
    ? 'noindex, nofollow, noimageindex, noarchive, nosnippet'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  // --- JSON-LD graphs --- NO new URL() anywhere!
  const orgId = base + '#organization';
  const websiteId = base + '#website';
  const webPageId = `${canonicalUrl}#webpage`;

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': orgId,
    name: siteName,
    url: base,
    logo: abs(base, '/logo.svg'),
    sameAs: ['https://twitter.com/sentientiq', 'https://www.linkedin.com/company/sentientiq']
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': websiteId,
    url: base,
    name: siteName,
    publisher: { '@id': orgId },
    potentialAction: [{
      '@type': 'SearchAction',
      target: base + '/search?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }]
  };

  const webPageSchema: any = {
    '@context': 'https://schema.org',
    '@type': type === 'article' ? 'Article' : 'WebPage',
    '@id': webPageId,
    url: canonicalUrl,
    name: title,
    isPartOf: { '@id': websiteId },
    primaryImageOfPage: { '@type': 'ImageObject', url: absoluteImage },
    description,
    inLanguage: locale.replace('_', '-')
  };

  if (type === 'article' && article) {
    Object.assign(webPageSchema, {
      author: article.author ? { '@type': 'Person', name: article.author } : undefined,
      datePublished: article.publishedTime,
      dateModified: article.modifiedTime,
      articleSection: article.section,
      keywords: article.tags
    });
  }

  const breadcrumbSchema = breadcrumbs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          item: b.url
        }))
      }
    : null;

  const productSchema = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: product.name || siteName,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: product.offers?.map(o => ({
          '@type': 'Offer',
          price: o.price,
          priceCurrency: o.currency,
          url: canonicalUrl
        }))
      }
    : null;

  const faqSchema = faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map(q => ({
          '@type': 'Question',
          name: q.question,
          acceptedAnswer: { '@type': 'Answer', text: q.answer }
        }))
      }
    : null;

  const jsonLd = [organizationSchema, websiteSchema, webPageSchema, breadcrumbSchema, productSchema, faqSchema]
    .filter(Boolean);

  return (
    <Helmet>
      {/* Primary */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonicalUrl} />

      {/* hreflang (optional) */}
      {hreflangs?.map(({ href, hrefLang }) => (
        <link key={hrefLang} rel="alternate" hrefLang={hrefLang} href={href} />
      ))}
      {/* x-default fallback */}
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />
      <meta property="og:image:secure_url" content={absoluteImage} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {article?.modifiedTime && <meta property="og:updated_time" content={article.modifiedTime} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={twitterSite} />
      <meta name="twitter:creator" content={twitterCreator} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
      <meta name="twitter:image:alt" content={imageAlt} />

      {/* Useful, modern-only meta */}
      <meta name="theme-color" content="#667eea" />
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/logo.svg" />
      <link rel="manifest" href="/site.webmanifest" />

      {/* Optional preconnects (gate with prop to avoid wasted sockets) */}
      {preconnectStripe && (
        <>
          <link rel="preconnect" href="https://js.stripe.com" />
          <link rel="preconnect" href="https://api.stripe.com" />
        </>
      )}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

      {/* JSON-LD Graph */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default SEO;
