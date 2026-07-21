import fs from 'fs';
import { getAccessibleNav } from '../../config/navigation';
import {
  filterSearchResultsByNavigation,
  isSearchDestinationAccessible,
  normalizeSearchDestinationPath,
} from '../../services/searchService';

const searchResults = [
  { category: 'Doctors', items: [{ id: 'doctor', path: '/doctors?id=doctor' }] },
  { category: 'Hospitals', items: [{ id: 'hospital', path: '/hospitals?id=hospital' }] },
  { category: 'Ambulances', items: [{ id: 'ambulance', path: '/ambulances?id=ambulance' }] },
  { category: 'Visits', items: [{ id: 'visit', path: '/visits?id=visit' }] },
  { category: 'Requests', items: [{ id: 'request', path: '/emergencies?id=request' }] },
  { category: 'Users', items: [{ id: 'user', path: '/users?id=user' }] },
];

const visibleIdsFor = (profile) => filterSearchResultsByNavigation(
  searchResults,
  getAccessibleNav(profile, () => true)
).flatMap(category => category.items.map(item => item.id));

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

  it('renders search failures, preserves successful categories, and ignores stale out-of-order responses', () => {
    const quickSearch = source();
    const searchService = searchServiceSource();
    const projectionMethods = searchService.slice(
      searchService.indexOf('async searchDoctors'),
      searchService.indexOf('async trackSearch')
    );

    expect(quickSearch).toContain('const [searchError, setSearchError] = useState(null)');
    expect(quickSearch).toContain('const requestSeqRef = useRef(0)');
    expect(quickSearch).toContain('const requestSeq = requestSeqRef.current + 1;');
    expect(quickSearch).toContain('if (requestSeq !== requestSeqRef.current) return;');
    expect(quickSearch).toContain('if (requestSeq === requestSeqRef.current)');
    expect(quickSearch).toContain("setSearchError('Search is temporarily unavailable. Try again.')");
    expect(quickSearch).toContain('role="alert"');
    expect(quickSearch).toContain('Search unavailable');
    expect(quickSearch).toContain('onClick={() => handleSearch(query)}');
    expect(quickSearch).toContain('!loading && !searchError && visibleResults.length === 0');
    expect(quickSearch).toContain('!loading && !searchError && visibleResults.length > 0');
    expect(quickSearch).toContain('const [searchIssues, setSearchIssues] = useState([])');
    expect(quickSearch).toContain('const visibleSearchIssues = useMemo(');
    expect(quickSearch).toContain('Some result groups could not be loaded. The results shown are still available.');
    expect(quickSearch).toContain('const [suggestionsError, setSuggestionsError] = useState(null)');
    expect(quickSearch).toContain('Promise.allSettled([');
    expect(quickSearch).toContain('Search suggestions are unavailable right now. You can still search.');
    expect(quickSearch).toContain('Search the Console');
    expect(searchService).toContain('const projections = await Promise.allSettled([');
    expect(searchService).toContain("errors.push({ category: category.category, path: category.path });");
    expect(searchService).toContain('results,\n        errors,');
    expect(searchService).not.toContain('return { results: [], total: 0, error };');
    expect((projectionMethods.match(/if \(error\) throw error;/g) || [])).toHaveLength(6);
  });

  it('filters query-string destinations through the active navigation authority', () => {
    const quickSearch = source();

    expect(normalizeSearchDestinationPath('/users/?id=user#details')).toBe('/users');
    expect(normalizeSearchDestinationPath('emergencies?id=request')).toBe('/emergencies');
    expect(normalizeSearchDestinationPath(null)).toBeNull();

    expect(visibleIdsFor({ role: 'viewer' })).toEqual([]);
    expect(visibleIdsFor({ role: 'provider' })).toEqual(['visit', 'request']);
    expect(visibleIdsFor({ role: 'provider', provider_type: 'driver' })).toEqual(['request']);
    expect(visibleIdsFor({ role: 'admin' })).toEqual([
      'doctor',
      'hospital',
      'ambulance',
      'visit',
      'request',
      'user',
    ]);

    const providerNav = getAccessibleNav({ role: 'provider' }, () => true);
    expect(isSearchDestinationAccessible('/users?id=user', providerNav)).toBe(false);
    expect(isSearchDestinationAccessible('/emergencies?id=request', providerNav)).toBe(true);

    expect(quickSearch).toContain("import { getAccessibleNav } from '../../config/navigation';");
    expect(quickSearch).not.toContain("from '../../config/routes'");
    expect(quickSearch).toContain('if (!isSearchDestinationAccessible(result?.path, accessibleNav)) return;');
    expect(quickSearch).toContain('{visibleResults.map((category) => (');
  });
});
