import fs from 'fs';

describe('QuickSearch shell dialog contract', () => {
  const source = () => fs.readFileSync('src/components/navigation/QuickSearch.jsx', 'utf8');
  const searchServiceSource = () => fs.readFileSync('src/services/searchService.js', 'utf8');
  const hardgateSource = () => fs.readFileSync('scripts/check-ui-surface-hardgate.js', 'utf8');

  it('keeps the shared search dialog accessible and hardgated', () => {
    const quickSearch = source();
    const hardgate = hardgateSource();

    expect(quickSearch).toContain("import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';");
    expect(quickSearch).toContain('<DialogTitle className="sr-only">Search</DialogTitle>');
    expect(quickSearch).toContain('<DialogDescription className="sr-only" data-shell-search-description="true">');
    expect(quickSearch).toContain('Search across console records and open the matching result.');
    expect(quickSearch).toContain('style={{ borderWidth: 0 }}');
    expect(quickSearch).toContain('aria-label="Search query"');
    expect(quickSearch).toContain('aria-label="Clear search"');
    expect(quickSearch).toContain('Rating {item.rating}');
    expect(quickSearch).not.toContain('border-0');
    expect(quickSearch).not.toContain('outline-none');
    expect(quickSearch).not.toContain('rounded border');
    expect(quickSearch).not.toMatch(/\u2b50/);
    expect(hardgate).toContain('src/components/navigation/QuickSearch.jsx');
  });

  it('keeps global search labels aligned with the Requests route canon', () => {
    const quickSearch = source();
    const searchService = searchServiceSource();

    expect(quickSearch).toContain("'Requests': 'hsl(var(--warning))'");
    expect(quickSearch).toContain('placeholder="Search doctors, hospitals, visits, requests..."');
    expect(searchService).toContain("category: 'Requests'");
    expect(searchService).toContain("title: e.service_type || 'Unknown request'");
    expect(quickSearch).not.toContain("'Emergency Requests':");
    expect(quickSearch).not.toContain('visits, emergencies');
    expect(searchService).not.toContain("category: 'Emergency Requests'");
    expect(searchService).not.toContain("'Unknown Emergency'");
  });
});
