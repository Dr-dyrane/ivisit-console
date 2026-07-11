import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import {
  Newspaper,
  Calendar,
  Tag,
  Filter,
  BarChart3,
} from 'lucide-react';

const EMPTY_STATS = {
  total: 0,
  published: 0,
  draft: 0,
  categories: 0,
};

export const HealthNewsPanel = ({ healthNewsContext = null }) => {
  const stats = healthNewsContext?.stats || EMPTY_STATS;
  const recentNews = healthNewsContext?.recentNews || healthNewsContext?.articles?.slice(0, 3) || [];
  const loading = healthNewsContext?.loading ?? !healthNewsContext;
  const error = healthNewsContext?.errorMessage || null;
  const totalCount = healthNewsContext?.count ?? stats.total ?? recentNews.length;
  const scopeLabel = healthNewsContext?.hasFilters ? 'Filtered feed' : 'Curated source links';

  const handleFilters = () => {
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  const handleAnalytics = () => {
    window.dispatchEvent(new CustomEvent('openAnalyticsModal'));
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-pulse rounded-icon bg-muted/40" />
        </div>
      ) : (
        <>
          {error && (
            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{error}</p>
            </Card>
          )}

          {/* No entrance motion (MOTION canon section 3): panel data is simply present. */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">News overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs rounded-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-icon bg-sky-500/15">
                    <Newspaper className="h-5 w-5 text-sky-500" />
                  </div>
                  <div>
                    <span className="font-bold">Published Feed</span>
                    <p className="text-xs text-muted-foreground">{scopeLabel}</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-sky-500/15 text-sky-700 dark:text-sky-200">{totalCount}</span>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-icon bg-emerald-500/15">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.published}</p>
                    <p className="text-xs text-muted-foreground">Readable</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-icon bg-amber-500/15">
                    <Tag className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.categories}</p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Panel actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleFilters}
                className="flex flex-col items-center gap-2 rounded-inner bg-sky-500/10 p-3 text-sky-700 transition-colors hover:bg-sky-500/18 dark:text-sky-200"
                title="Filter Articles"
              >
                <Filter className="h-4 w-4" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleAnalytics}
                className="flex flex-col items-center gap-2 rounded-inner bg-emerald-500/10 p-3 text-emerald-700 transition-colors hover:bg-emerald-500/18 dark:text-emerald-200"
                title="View Analytics"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="font-normal text-xs">Analytics</span>
              </motion.button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent articles</h3>

            <div className="space-y-2">
              {recentNews.map((news) => (
                <Card key={news.id} className="bg-background/50 backdrop-blur-xs rounded-card p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-icon bg-emerald-500/15 text-emerald-500">
                        <Newspaper className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-normal text-sm truncate max-w-[120px]">{news.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {news.category} - {new Date(news.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-xs font-medium bg-muted/30 text-muted-foreground">
                      Published
                    </span>
                  </div>
                </Card>
              ))}
              {recentNews.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No recent articles found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
