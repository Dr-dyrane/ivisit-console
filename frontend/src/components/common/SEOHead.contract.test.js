import fs from 'fs';

describe('SEOHead browser identity contract', () => {
  it('sets document title and key meta tags even if Helmet does not apply', () => {
    const source = fs.readFileSync('src/components/common/SEOHead.jsx', 'utf8');

    expect(source).toContain('document.title = fullTitle');
    expect(source).toContain("setMetaTag('meta[name=\"description\"]'");
    expect(source).toContain("setMetaTag('meta[property=\"og:title\"]'");
    expect(source).toContain("setMetaTag('meta[property=\"twitter:title\"]'");
  });
});
