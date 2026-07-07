import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
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
          <div className="h-8 w-8 animate-pulse rounded-full bg-primary/25 shadow-[0_0_32px_hsl(var(--primary)/0.25)]" />
        </div>
      ) : (
        <>
          {error && (
            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{error}</p>
            </Card>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">News Overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                    <Newspaper className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Published Feed</span>
                    <p className="text-xs text-muted-foreground">{scopeLabel}</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary">{totalCount}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.published}</p>
                    <p className="text-xs text-muted-foreground">Readable</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                    <Tag className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.categories}</p>
                    <p className="text-xs text-muted-foreground">Categories</p>
                  </div>
                </div>
              </Card>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleFilters}
                className="bg-info/10 hover:bg-info/20 text-info rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Filter Articles"
              >
                <Filter className="h-4 w-4" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleAnalytics}
                className="bg-success/10 hover:bg-success/20 text-success rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="View Analytics"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="font-normal text-xs">Analytics</span>
              </motion.button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Articles</h3>

            <div className="space-y-2">
              {recentNews.map((news) => (
                <Card key={news.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 geo-round bg-success" />
                      <div>
                        <p className="font-normal text-sm truncate max-w-[120px]">{news.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {news.category} - {new Date(news.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-muted/30 text-muted-foreground text-xs">
                      Published
                    </Badge>
                  </div>
                </Card>
              ))}
              {recentNews.length === 0 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No recent articles found
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
