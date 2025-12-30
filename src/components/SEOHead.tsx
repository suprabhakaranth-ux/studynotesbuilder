import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title: string;
  description?: string;
  type?: 'website' | 'article';
  canonicalUrl?: string;
}

export const SEOHead = ({ 
  title, 
  description = "Study notes and educational content organized by subjects and chapters.",
  type = 'website',
  canonicalUrl
}: SEOHeadProps) => {
  const siteName = "StudyBuilder Library";
  const fullTitle = `${title} | ${siteName}`;
  
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Structured Data for Educational Content */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LearningResource",
          "name": title,
          "description": description,
          "provider": {
            "@type": "Organization",
            "name": siteName
          }
        })}
      </script>
    </Helmet>
  );
};
