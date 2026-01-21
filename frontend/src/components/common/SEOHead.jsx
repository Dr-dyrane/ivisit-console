import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

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
