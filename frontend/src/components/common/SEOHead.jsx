import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const setMetaTag = (selector, attributes) => {
    let node = document.head.querySelector(selector);
    if (!node) {
        node = document.createElement('meta');
        document.head.appendChild(node);
    }

    Object.entries(attributes).forEach(([name, value]) => {
        node.setAttribute(name, value);
    });
};

export const SEOHead = ({
    title,
    description = "A comprehensive healthcare management console for the iVisit platform.",
    keywords = "healthcare, management, ambulance, hospital, doctor, visits, emergency, ivisit",
    image = "/og-image.jpg"
}) => {
    const location = useLocation();
    const fullTitle = `${title} | iVisit Console`;

    // Construct canonical URL properly (assuming hosted on domain.com, adjusting for local dev)
    const siteUrl = 'https://console.ivisit.ng'; // Or pull from env
    const canonicalUrl = `${siteUrl}${location.pathname}`;

    useEffect(() => {
        if (typeof document === 'undefined') return;

        document.title = fullTitle;
        setMetaTag('meta[name="description"]', { name: 'description', content: description });
        setMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords });
        setMetaTag('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
        setMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
        setMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
        setMetaTag('meta[property="twitter:title"]', { property: 'twitter:title', content: fullTitle });
        setMetaTag('meta[property="twitter:description"]', { property: 'twitter:description', content: description });
        setMetaTag('meta[property="twitter:url"]', { property: 'twitter:url', content: canonicalUrl });
    }, [canonicalUrl, description, fullTitle, keywords]);

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={canonicalUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />
        </Helmet>
    );
};
