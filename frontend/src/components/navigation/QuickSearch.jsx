import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Search, Clock, TrendingUp, Loader2, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { getAccessibleNav } from '../../config/navigation';
import { useAuth } from '../../contexts/AuthContext';
import {
  CopilotActionButton,
  createQuickSearchAskRequest,
} from '../../features/copilot';
import {
  filterSearchResultsByNavigation,
  isSearchDestinationAccessible,
  searchService,
} from '../../services/searchService';

const categoryColors = {
  'Doctors': 'hsl(var(--primary))',
  'Hospitals': 'hsl(var(--info))',
  'Ambulances': 'hsl(var(--destructive))',
  'Visits': 'hsl(var(--success))',
  'Requests': 'hsl(var(--warning))',
  'Users': 'hsl(var(--secondary))',
};

export const QuickSearch = ({ isOpen, onClose }) => {
  const { profile, can } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchIssues, setSearchIssues] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const requestSeqRef = useRef(0);
  const suggestionsSeqRef = useRef(0);
  const navigate = useNavigate();
  const accessibleNav = useMemo(
    () => profile ? getAccessibleNav(profile, can) : null,
    [can, profile]
  );
  const visibleResults = useMemo(
    () => filterSearchResultsByNavigation(results, accessibleNav),
    [accessibleNav, results]
  );
  const visibleSearchIssues = useMemo(
    () => searchIssues.filter((issue) => isSearchDestinationAccessible(issue?.path, accessibleNav)),
    [accessibleNav, searchIssues]
  );
  const visibleResultsCopilotRequest = useMemo(() => createQuickSearchAskRequest({
    query,
    resultGroups: visibleResults,
  }), [query, visibleResults]);

  const loadRecentsAndTrending = useCallback(async () => {
    const requestSeq = suggestionsSeqRef.current + 1;
    suggestionsSeqRef.current = requestSeq;
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    const [recents, trending] = await Promise.allSettled([
      searchService.getRecentSearches(8),
      searchService.getTrendingSearches(8)
    ]);
    if (requestSeq !== suggestionsSeqRef.current) return;

    setRecentSearches(recents.status === 'fulfilled' ? recents.value : []);
    setTrendingSearches(trending.status === 'fulfilled' ? trending.value : []);
    if (recents.status === 'rejected' || trending.status === 'rejected') {
      setSuggestionsError('Search suggestions are unavailable right now. You can still search.');
    }
    setSuggestionsLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRecentsAndTrending();
    }
  }, [isOpen, loadRecentsAndTrending]);

  const handleSearch = useCallback(async (q) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    setQuery(q);
    setSearchError(null);

    if (q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { results: searchResults, errors: projectionErrors = [] } = await searchService.searchAll(q);
      if (requestSeq !== requestSeqRef.current) return;

      setResults(searchResults);
      setSearchIssues(projectionErrors);
    } catch {
      if (requestSeq !== requestSeqRef.current) return;

      setResults([]);
      setSearchIssues([]);
      setSearchError('Search is temporarily unavailable. Try again.');
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleSelect = useCallback((result) => {
    if (!isSearchDestinationAccessible(result?.path, accessibleNav)) return;

    requestSeqRef.current += 1;
    setLoading(false);
    setSearchError(null);
    setResults([]);
    setSearchIssues([]);
    searchService.recordSelection(query, result.type, result.id);
    navigate(result.path);
    onClose();
    setQuery('');
  }, [accessibleNav, query, navigate, onClose]);

  const handleRecentClick = useCallback((recentQuery) => {
    handleSearch(recentQuery);
  }, [handleSearch]);

  const handleTrendingClick = useCallback((trendingQuery) => {
    handleSearch(trendingQuery);
  }, [handleSearch]);

  const showResults = query.trim().length >= 2;
  const showPlaceholder = !showResults;

  useEffect(() => {
    if (!isOpen) {
      requestSeqRef.current += 1;
      suggestionsSeqRef.current += 1;
      setLoading(false);
      setSuggestionsLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-2 overflow-hidden bg-transparent shadow-2xl max-w-3xl" style={{ borderWidth: 0 }}>
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only" data-shell-search-description="true">
          Search across console records and open the matching result.
        </DialogDescription>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background dark:bg-background/10 backdrop-blur-sm rounded-card flex flex-col max-h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center px-6 py-4">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <input
              autoFocus
              className="flex-1 h-12 bg-transparent text-xs md:text-lg placeholder:text-muted-foreground/50 font-normal focus-visible:shadow-[0_10px_32px_-24px_hsl(var(--primary)/0.8)]"
              placeholder="Search doctors, hospitals, visits, requests..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search query"
              aria-invalid={Boolean(searchError)}
            />
            {loading && <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
            {query && (
              <button onClick={() => handleSearch('')} className="p-1 hover:bg-white/5 rounded-button" aria-label="Clear search">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="hidden sm:flex gap-2 ml-4">
              <kbd className="h-6 select-none items-center gap-1 rounded-icon bg-muted px-1.5 font-mono text-[10px] font-normal text-muted-foreground flex">
                <span className="text-xs">ESC</span>
              </kbd>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar" aria-busy={loading}>
            <AnimatePresence mode="wait">
              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center"
                >
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Searching...</p>
                </motion.div>
              )}

              {showResults && !loading && searchError && (
                <motion.div
                  key="error"
                  role="alert"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 py-12 text-center"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-icon bg-destructive/[0.08]">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Search unavailable</p>
                  <p className="mt-1 text-xs text-muted-foreground">We could not load results right now.</p>
                  <button
                    type="button"
                    onClick={() => handleSearch(query)}
                    className="mt-3 rounded-button bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Try again
                  </button>
                </motion.div>
              )}

              {showResults && !loading && !searchError && visibleResults.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center px-6"
                >
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
                </motion.div>
              )}

              {showResults && !loading && !searchError && visibleSearchIssues.length > 0 && (
                <div
                  role="status"
                  className="mx-6 mb-2 rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
                >
                  Some result groups could not be loaded. The results shown are still available.
                </div>
              )}

              {showResults && !loading && !searchError && visibleResults.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-4 space-y-6"
                >
                  <div className="px-2">
                    <CopilotActionButton
                      label="Ask Copilot about these results"
                      compact
                      request={visibleResultsCopilotRequest}
                      onBeforeOpen={onClose}
                    />
                    <p className="mt-2 px-1 text-xs leading-5 text-muted-foreground">
                      Uses only the results currently visible here.
                    </p>
                  </div>
                  {visibleResults.map((category) => (
                    <div key={category.category}>
                      <div className="flex items-center gap-2 mb-3 px-2">
                        {categoryColors[category.category] && (
                          <div
                            className="w-2 h-2 rounded-pill"
                            style={{ backgroundColor: categoryColors[category.category] }}
                          />
                        )}
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          {category.category}
                        </h3>
                        <span className="text-xs font-medium text-muted-foreground/60">
                          {category.items.length}
                        </span>
                      </div>

                      <div className="space-y-1">
                        {category.items.map((item) => (
                          <motion.button
                            key={item.id}
                            whileHover={{ x: 4 }}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button hover:bg-white/5 transition-colors group text-left"
                          >
                            <div
                              className="w-9 h-9 rounded-icon flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ backgroundColor: categoryColors[category.category] + '15' }}
                            >
                              {item.avatar ? (
                                <img src={item.avatar} alt={item.title || 'Item avatar'} className="w-full h-full rounded-icon object-cover" />
                              ) : (
                                <div
                                  className="w-full h-full rounded-icon flex items-center justify-center text-white font-semibold text-xs"
                                  style={{ backgroundColor: categoryColors[category.category] }}
                                >
                                  {item.title?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {item.title || 'Untitled'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.subtitle || 'No description available'}
                              </p>
                            </div>

                            {item.rating && (
                              <span className="text-xs font-semibold text-muted-foreground">
                                Rating {item.rating}
                              </span>
                            )}

                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {showPlaceholder && !loading && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-4 space-y-6"
                >
                  {suggestionsLoading && (
                    <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground" role="status">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading search suggestions...
                    </div>
                  )}

                  {suggestionsError && !suggestionsLoading && (
                    <div className="rounded-inner bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100" role="status">
                      <p>{suggestionsError}</p>
                      <button
                        type="button"
                        onClick={loadRecentsAndTrending}
                        className="mt-2 rounded-button bg-amber-500/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-amber-500/15 focus-visible:bg-amber-500/15 active:scale-[0.98]"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {!suggestionsLoading && !suggestionsError && recentSearches.length === 0 && trendingSearches.length === 0 && (
                    <div className="px-2 py-8 text-center">
                      <Search className="mx-auto mb-2 h-7 w-7 text-muted-foreground/45" />
                      <p className="text-sm font-medium text-foreground">Search the Console</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Type at least two characters to find an available record.</p>
                    </div>
                  )}
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Recent Searches
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {recentSearches.map((item, idx) => (
                          <motion.button
                            key={`recent-${idx}`}
                            whileHover={{ x: 4 }}
                            onClick={() => handleRecentClick(item.query)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button hover:bg-white/5 transition-colors group text-left"
                          >
                            <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="flex-1 font-normal text-sm text-foreground">{item.query}</span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Searches */}
                  {trendingSearches.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 px-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Trending This Week
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {trendingSearches.map((item, idx) => (
                          <motion.button
                            key={`trending-${idx}`}
                            whileHover={{ x: 4 }}
                            onClick={() => handleTrendingClick(item.query)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-button hover:bg-white/5 transition-colors group text-left"
                          >
                            <span
                              className="w-6 h-6 rounded-icon flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            >
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-normal text-sm text-foreground">{item.query}</p>
                              <p className="text-xs text-muted-foreground">{item.count} searches</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickSearch;
