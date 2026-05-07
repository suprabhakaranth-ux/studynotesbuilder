import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description?: string;
  type?: 'website' | 'article';
  canonicalUrl?: string;
  publishedTime?: string;
  modifiedTime?: string;
  section?: string;
  keywords?: string;
  author?: string;
}

export const SEOHead = ({
  title,
  description = "Study notes and educational content organized by subjects and chapters.",
  type = 'website',
  canonicalUrl,
  publishedTime,
  modifiedTime,
  section,
  keywords,
  author = "Study Notes Library",
}: SEOHeadProps) => {
  const siteName = "Study Notes Library";
  const fullTitle = `${title} | ${siteName}`;

  const jsonLd = type === 'article'
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        ...(publishedTime && { "datePublished": publishedTime }),
        ...(modifiedTime && { "dateModified": modifiedTime }),
        "author": { "@type": "Person", "name": author },
        "publisher": {
          "@type": "Organization",
          "name": siteName,
        },
        ...(canonicalUrl && { "mainEntityOfPage": canonicalUrl }),
        ...(section && { "articleSection": section }),
        ...(keywords && { "keywords": keywords }),
      }
    : {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": title,
        "description": description,
        "provider": { "@type": "Organization", "name": siteName },
      };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {type === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === 'article' && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {type === 'article' && section && (
        <meta property="article:section" content={section} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />

      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
};
