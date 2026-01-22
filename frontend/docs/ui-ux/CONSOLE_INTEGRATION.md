# Console Search & Trending Data Integration Guide

## Overview

This guide explains how the **iVisit Patient App** consumes search analytics and trending data from the **iVisit Console** to power the discovery experience. The console generates valuable insights about what healthcare professionals and administrators are searching for, and the patient app leverages this data to surface trending searches and provide intelligent suggestions.

## Architecture & Data Flow

### 1. Console-Side (Admin Dashboard)

The console tracks:
- **Search History**: Every search query with timestamp and result count
- **Search Selections**: Which results users click on, enabling analytics
- **Trending Searches**: Aggregated via RPC function that ranks queries by frequency

**Tables:**
- `search_history` - Tracks all searches performed
- `search_selections` - Tracks which results were selected
- RPC Function: `get_trending_searches(days_back, limit_count)` - Returns trending queries

**Core Service:**
```typescript
// searchService.js methods available:
searchAll(query, limit)          // Multi-entity search
searchDoctors(query, limit)      // Search doctors
searchHospitals(query, limit)    // Search hospitals
searchAmbulances(query, limit)   // Search ambulances
searchVisits(query, limit)       // Search visits
searchEmergencies(query, limit)  // Search emergency requests
searchUsers(query, limit)        // Search users
trackSearch(query, resultCount)  // Tracks searches in DB
getRecentSearches(limit)         // User's last N searches
getTrendingSearches(limit, days) // Top searches by frequency
recordSelection(query, type, id) // Tracks which results were clicked
```

### 2. Patient App-Side (Discovery Feature)

The patient app consumes this data through:
- **discoveryService**: Fetches trending data from console via API
- **SearchContext**: Caches recent and trending queries locally
- **SuggestiveContent**: Displays trending searches and quick actions

**Flow:**
```
Console API → discoveryService.getTrendingSearches()
    ↓
SearchContext (localStorage cache)
    ↓
SuggestiveContent (displays in Trending tab)
    ↓
User clicks trending search → recordSelection tracked back to console
```

---

## Patient App Implementation

### Step 1: Set Up API Endpoint in Console

The console needs to expose a public API endpoint for trending data (non-authenticated):

**Endpoint:** `GET /api/trending-searches`

**Query Parameters:**
- `limit` (optional): Number of results (default: 8, max: 20)
- `days` (optional): Days back to look (default: 7, max: 30)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "query": "cardiologist",
      "count": 145,
      "rank": 1
    },
    {
      "query": "hospital near me",
      "count": 98,
      "rank": 2
    },
    {
      "query": "emergency bed",
      "count": 87,
      "rank": 3
    }
  ],
  "timestamp": "2024-01-15T23:39:18Z"
}
```

### Step 2: Create Discovery Service

**File:** `services/discoveryService.js`

```javascript
import { API_BASE_URL } from '../config/api';

export const discoveryService = {
  /**
   * Fetch trending searches from console
   * @param {Object} options
   * @param {number} options.limit - Max results (default: 8)
   * @param {number} options.days - Days back (default: 7)
   * @returns {Promise<Array>} Array of trending search objects
   */
  async getTrendingSearches({ limit = 8, days = 7 } = {}) {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (days) params.append('days', days);

      const response = await fetch(
        `${API_BASE_URL}/api/trending-searches?${params.toString()}`
      );

      if (!response.ok) {
        console.warn('Failed to fetch trending searches:', response.status);
        return [];
      }

      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching trending searches:', error);
      return [];
    }
  },

  /**
   * Track when a user selects/searches for something
   * Sends data back to console for analytics
   * @param {Object} data
   * @param {string} data.query - Search query performed
   * @param {string} data.source - Where search came from ('trending', 'recent', 'manual')
   * @param {string} data.resultType - Type of result selected ('doctor', 'hospital', etc.)
   * @param {string} data.resultId - ID of selected result
   */
  async trackSearchSelection({
    query,
    source = 'search_screen',
    resultType,
    resultId,
  }) {
    try {
      await fetch(`${API_BASE_URL}/api/search-selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          source,
          result_type: resultType,
          result_id: resultId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('Failed to track search selection:', error);
      // Silent fail - don't interrupt user experience
    }
  },

  /**
   * Cache trending searches to reduce API calls
   * (Optional - implement if you have a cache service)
   */
  async getCachedTrendingSearches(cacheService, maxAge = 3600000) {
    const cached = await cacheService.get('trending_searches');
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }

    const fresh = await this.getTrendingSearches();
    await cacheService.set('trending_searches', {
      data: fresh,
      timestamp: Date.now(),
    });

    return fresh;
  },
};
```

### Step 3: Integrate with SearchContext

**File:** `contexts/SearchContext.jsx`

Enhance existing SearchContext to include trending data:

```javascript
import { discoveryService } from '../services/discoveryService';

export const SearchProvider = ({ children }) => {
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentQueries, setRecentQueries] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(false);

  // Fetch trending searches on app startup
  useEffect(() => {
    const loadTrendingSearches = async () => {
      setTrendingLoading(true);
      const trending = await discoveryService.getTrendingSearches({
        limit: 8,
        days: 7,
      });
      setTrendingSearches(trending);
      setTrendingLoading(false);
    };

    loadTrendingSearches();

    // Refresh trending searches every 30 minutes
    const interval = setInterval(loadTrendingSearches, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load recent queries from localStorage (existing functionality)
  useEffect(() => {
    const stored = localStorage.getItem('recentSearchQueries');
    if (stored) {
      setRecentQueries(JSON.parse(stored));
    }
  }, []);

  const value = {
    trendingSearches,
    recentQueries,
    trendingLoading,
    commitQuery: (query) => {
      // Track selection
      discoveryService.trackSearchSelection({
        query,
        source: 'search_screen',
      });

      // Store in recent
      setRecentQueries((prev) => {
        const filtered = prev.filter((q) => q !== query);
        const updated = [query, ...filtered].slice(0, 12);
        localStorage.setItem(
          'recentSearchQueries',
          JSON.stringify(updated)
        );
        return updated;
      });
    },
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
```

### Step 4: Update SuggestiveContent Component

**File:** `components/search/SuggestiveContent.jsx`

Display trending searches from console:

```javascript
import { useSearch } from '../../contexts/SearchContext';
import { discoveryService } from '../../services/discoveryService';

export default function SuggestiveContent() {
  const { trendingSearches, trendingLoading } = useSearch();
  const [activeTab, setActiveTab] = useState('quick_actions');

  const handleTrendingSelect = (trendingQuery) => {
    // Track that user clicked on a trending search
    discoveryService.trackSearchSelection({
      query: trendingQuery.query,
      source: 'trending_tab',
      resultType: 'trending_search',
      resultId: trendingQuery.query,
    });

    // Perform the search
    setSearchQuery(trendingQuery.query);
  };

  return (
    <View>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => setActiveTab('quick_actions')}
          style={[
            styles.tab,
            activeTab === 'quick_actions' && styles.activeTab,
          ]}
        >
          <Text>Quick Actions</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('trending')}
          style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
        >
          <Text>Trending</Text>
        </Pressable>
      </View>

      {/* Content */}
      {activeTab === 'quick_actions' && <QuickActions />}

      {activeTab === 'trending' && (
        <TrendingSearches
          searches={trendingSearches}
          loading={trendingLoading}
          onSelect={handleTrendingSelect}
        />
      )}
    </View>
  );
}

function TrendingSearches({ searches, loading, onSelect }) {
  if (loading) {
    return <ActivityIndicator />;
  }

  if (!searches.length) {
    return (
      <Text style={styles.emptyText}>
        No trending searches yet. Be the first to search!
      </Text>
    );
  }

  return (
    <ScrollView>
      {searches.map((item, index) => (
        <Pressable
          key={item.query}
          onPress={() => onSelect(item)}
          style={styles.trendingItem}
        >
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>#{item.rank}</Text>
          </View>
          <View style={styles.trendingContent}>
            <Text style={styles.trendingQuery}>{item.query}</Text>
            <Text style={styles.trendingCount}>
              {item.count} searches
            </Text>
          </View>
          <Icon name="chevron-right" />
        </Pressable>
      ))}
    </ScrollView>
  );
}
```

### Step 5: Track User Interactions

Update components to report back to console when users interact with search results:

```javascript
// When user opens a hospital from search results
const openHospitalDetails = (hospital) => {
  discoveryService.trackSearchSelection({
    query: currentSearchQuery,
    source: 'search_results',
    resultType: 'hospital',
    resultId: hospital.id,
  });

  navigateTo(`/hospital/${hospital.id}`);
};

// When user books an appointment after searching
const bookAppointment = (doctor, hospital) => {
  discoveryService.trackSearchSelection({
    query: currentSearchQuery,
    source: 'booking_flow',
    resultType: 'doctor',
    resultId: doctor.id,
  });

  // Continue booking flow...
};
```

---

## Console API Implementation

The console needs to expose these endpoints. Add to your Express/Node backend:

### Endpoint 1: GET /api/trending-searches

```javascript
// routes/api/trending.js
import express from 'express';
import { searchService } from '../../services/searchService.js';

const router = express.Router();

router.get('/trending-searches', async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit) || 8,
      20
    );
    const days = Math.min(
      parseInt(req.query.days) || 7,
      30
    );

    const trending = await searchService.getTrendingSearches(limit, days);

    res.json({
      success: true,
      data: trending,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

### Endpoint 2: POST /api/search-selections

```javascript
// routes/api/selections.js
import express from 'express';
import { supabase } from '../../config/supabase.js';

const router = express.Router();

router.post('/search-selections', async (req, res) => {
  try {
    const {
      query,
      source,
      result_type,
      result_id,
      timestamp,
    } = req.body;

    // Optional: Get user from IP/session if auth is available
    // For now, we track anonymous selections

    await supabase.from('search_selections').insert([
      {
        query: query.toLowerCase(),
        result_type,
        result_id,
        source: source || 'patient_app',
        created_at: timestamp || new Date().toISOString(),
      },
    ]);

    res.json({ success: true });
  } catch (error) {
    console.error('Selection tracking error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## Data Categories & Colors

The console uses consistent colors for different search categories:

| Category | Color | Hex | Icon |
|----------|-------|-----|------|
| Doctors | Purple | #8B5CF6 | Stethoscope |
| Hospitals | Blue | #3B82F6 | Building2 |
| Ambulances | Red | #EF4444 | Ambulance |
| Visits | Green | #10B981 | Calendar |
| Emergency Requests | Amber | #F59E0B | AlertTriangle |
| Users | Cyan | #06B6D4 | Users |

Use these colors in the patient app when displaying search results from trending to maintain visual consistency.

---

## Caching Strategy

To minimize API calls and improve performance:

1. **First Load**: Fetch trending searches on app startup
2. **Cache Duration**: Store for 30 minutes in memory/localStorage
3. **Refresh**: Auto-refresh every 30 minutes or when user opens Search screen
4. **Manual Refresh**: Show "swipe to refresh" option
5. **Fallback**: If API fails, show cached or return empty (graceful degradation)

```javascript
// Example cache implementation
const trendingCache = {
  data: null,
  timestamp: null,
  maxAge: 30 * 60 * 1000, // 30 minutes

  isValid() {
    return (
      this.data &&
      Date.now() - this.timestamp < this.maxAge
    );
  },

  async get() {
    if (this.isValid()) {
      return this.data;
    }

    try {
      this.data = await discoveryService.getTrendingSearches();
      this.timestamp = Date.now();
      return this.data;
    } catch (error) {
      console.error('Failed to fetch trending:', error);
      return this.data || []; // Return stale cache if available
    }
  },
};
```

---

## Analytics & Feedback Loop

The integration creates a valuable feedback loop:

1. **Console Admin** searches for a doctor → tracked in `search_history`
2. **Admin** clicks on result → tracked in `search_selections`
3. **Trending aggregation** identifies popular searches
4. **Patient App** displays trending → encourages users to search for popular healthcare providers
5. **Patient** clicks trending search → tracked in `search_selections`
6. **Analytics Dashboard** (future) shows what patients are interested in

This helps:
- **Hospitals & Doctors**: Understand patient interest patterns
- **App Team**: Optimize search rankings and discovery
- **Patients**: Find popular, highly-sought providers

---

## Error Handling & Resilience

The patient app should gracefully handle network failures:

```javascript
async getTrendingSearches() {
  try {
    // Make request with timeout
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      5000
    ); // 5 second timeout

    const response = await fetch(
      `${API_BASE_URL}/api/trending-searches`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    // Log but don't crash
    console.warn('Trending fetch failed:', error);

    // Return cached data if available
    return getCachedTrendingSearches() || [];
  }
}
```

---

## Testing

### Test Cases for Patient App

```javascript
describe('Trending Searches Integration', () => {
  test('Should fetch trending searches on app load', async () => {
    const trending = await discoveryService.getTrendingSearches();
    expect(Array.isArray(trending)).toBe(true);
  });

  test('Should track search selection', async () => {
    await discoveryService.trackSearchSelection({
      query: 'cardiologist',
      source: 'trending_tab',
      resultType: 'doctor',
      resultId: '123',
    });
    // Verify the selection was recorded (check console DB)
  });

  test('Should cache trending data', async () => {
    const first = await getTrendingSearches();
    const second = await getTrendingSearches();
    expect(first).toEqual(second); // Should return cache
  });

  test('Should handle network failures gracefully', async () => {
    // Mock failed response
    const result = await getTrendingSearches();
    expect(result).toEqual([]); // Should return empty array
  });
});
```

---

## Configuration

### Console Environment Variables

```env
# Console (.env)
TRENDING_SEARCH_API_PORT=3001
TRENDING_SEARCH_ENABLED=true
TRENDING_SEARCH_CACHE_TTL=1800 # 30 minutes in seconds
```

### Patient App Environment Variables

```env
# Patient App (.env)
CONSOLE_API_URL=https://api.ivisit-console.com
TRENDING_SEARCH_LIMIT=8
TRENDING_SEARCH_DAYS=7
DISCOVERY_ENABLED=true
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Trending searches not appearing | Check console API is running; verify `TRENDING_SEARCH_ENABLED=true` |
| Old trending data cached | Clear localStorage and restart; adjust `maxAge` in cache |
| Network timeouts | Increase timeout threshold; implement exponential backoff |
| RPC function not found | Run SQL migrations in SEARCH_SETUP.md |
| Selections not tracked | Verify patient app has internet; check API endpoint is accessible |

---

## Future Enhancements

1. **Personalized Trending**: Show trending searches in user's city/region
2. **Search Suggestions**: Real-time autocomplete based on trending + recent
3. **Analytics Dashboard**: View what patients are searching for
4. **Recommendation Engine**: Suggest hospitals/doctors based on trending + user preferences
5. **Seasonal Trends**: Detect seasonal health searches (flu season, allergies, etc.)
6. **Search Ads**: Premium hospitals/doctors can sponsor search terms (optional monetization)

---

## Support & Questions

For implementation questions or issues:
1. Check the SEARCH_SETUP.md for database requirements
2. Review searchService.js for available methods
3. Test endpoints with curl or Postman first
4. Enable debug logging: `localStorage.setItem('debug_trending', 'true')`
5. Check browser DevTools Network tab for API responses
