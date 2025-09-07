import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Helmet } from 'react-helmet-async';
const SEO = ({ title = 'SentientIQ – Emotional Intelligence for Marketing', description = 'Replace intent guesswork with real emotions.', image = '/og-image.png', imageAlt = 'SentientIQ emotional intelligence visualization', path = '/', canonical, noindex = false, locale = 'en_US', type = 'website', siteUrl = 'https://sentientiq.ai', siteName = 'SentientIQ', twitterSite = '@sentientiq', twitterCreator = '@sentientiq', breadcrumbs, faq }) => {
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
            sameAs: ['https://twitter.com/sentientiq', 'https://www.linkedin.com/company/sentientiq']
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
            inLanguage: locale.replace('_', '-')
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
    return (_jsxs(Helmet, { children: [_jsx("title", { children: title }), _jsx("meta", { name: "description", content: description }), _jsx("meta", { name: "robots", content: robots }), _jsx("link", { rel: "canonical", href: canonicalUrl }), _jsx("meta", { property: "og:type", content: type }), _jsx("meta", { property: "og:site_name", content: siteName }), _jsx("meta", { property: "og:locale", content: locale }), _jsx("meta", { property: "og:url", content: canonicalUrl }), _jsx("meta", { property: "og:title", content: title }), _jsx("meta", { property: "og:description", content: description }), _jsx("meta", { property: "og:image", content: absoluteImage }), _jsx("meta", { property: "og:image:alt", content: imageAlt }), _jsx("meta", { property: "og:image:width", content: "1200" }), _jsx("meta", { property: "og:image:height", content: "630" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:site", content: twitterSite }), _jsx("meta", { name: "twitter:creator", content: twitterCreator }), _jsx("meta", { name: "twitter:title", content: title }), _jsx("meta", { name: "twitter:description", content: description }), _jsx("meta", { name: "twitter:image", content: absoluteImage }), _jsx("meta", { name: "twitter:image:alt", content: imageAlt }), _jsx("link", { rel: "preconnect", href: "https://js.stripe.com" }), _jsx("link", { rel: "preconnect", href: "https://api.stripe.com" }), _jsx("link", { rel: "preconnect", href: "https://fonts.googleapis.com" }), _jsx("link", { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }), _jsx("script", { type: "application/ld+json", children: JSON.stringify(jsonLd) })] }));
};
export default SEO;
