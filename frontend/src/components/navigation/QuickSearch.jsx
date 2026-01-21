import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Clock, TrendingUp, Loader2, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '../ui/dialog';
import { searchService } from '../../services/searchService';

const categoryColors = {
  'Doctors': '#8B5CF6',
  'Hospitals': '#3B82F6',
  'Ambulances': '#EF4444',
  'Visits': '#10B981',
  'Emergency Requests': '#F59E0B',
  'Users': '#06B6D4',
};

export const QuickSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const loadRecentsAndTrending = useCallback(async () => {
    const [recents, trending] = await Promise.all([
      searchService.getRecentSearches(8),
      searchService.getTrendingSearches(8)
    ]);
    setRecentSearches(recents);
    setTrendingSearches(trending);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadRecentsAndTrending();
    }
  }, [isOpen, loadRecentsAndTrending]);

  const handleSearch = useCallback(async (q) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const { results: searchResults } = await searchService.searchAll(q);
    setResults(searchResults);
    setLoading(false);
  }, []);

  const handleSelect = useCallback((result) => {
    searchService.recordSelection(query, result.type, result.id);
    navigate(result.path);
    onClose();
    setQuery('');
  }, [query, navigate, onClose]);

  const handleRecentClick = useCallback((recentQuery) => {
    handleSearch(recentQuery);
  }, [handleSearch]);

  const handleTrendingClick = useCallback((trendingQuery) => {
    handleSearch(trendingQuery);
  }, [handleSearch]);

  const showResults = query.trim().length >= 2;
  const showPlaceholder = !showResults && recentSearches.length > 0;

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
      <DialogContent className="p-0 overflow-hidden bg-transparent border-0 shadow-2xl max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background/80 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col max-h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b border-white/5">
            <Search className="w-5 h-5 text-muted-foreground mr-3" />
            <input
              autoFocus
              className="flex-1 h-12 bg-transparent border-0 outline-none text-lg placeholder:text-muted-foreground/50 font-normal"
              placeholder="Search doctors, hospitals, visits, emergencies..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search query"
            />
            {loading && <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />}
            {query && (
              <button onClick={() => handleSearch('')} className="p-1 hover:bg-white/5 rounded-lg" aria-label="Clear search">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
            <div className="hidden sm:flex gap-2 ml-4">
              <kbd className="h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-normal text-muted-foreground flex">
                <span className="text-xs">ESC</span>
              </kbd>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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

              {showResults && !loading && results.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-12 text-center px-6"
                >
                  <Search className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                </motion.div>
              )}

              {showResults && results.length > 0 && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-4 py-4 space-y-6"
                >
                  {results.map((category) => (
                    <div key={category.category}>
                      <div className="flex items-center gap-2 mb-3 px-2">
                        {categoryColors[category.category] && (
                          <div
                            className="w-2 h-2 rounded-full"
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ backgroundColor: categoryColors[category.category] + '15' }}
                            >
                              {item.avatar ? (
                                <img src={item.avatar} alt={item.title || 'Item avatar'} className="w-full h-full rounded-lg object-cover" />
                              ) : (
                                <div
                                  className="w-full h-full rounded-lg flex items-center justify-center text-white font-semibold text-xs"
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
                                ⭐ {item.rating}
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
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
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group text-left"
                          >
                            <span
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-white font-semibold text-xs flex-shrink-0"
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
