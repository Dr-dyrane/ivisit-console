import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  Newspaper,
  Calendar,
  Tag,
  Plus,
  Filter,
  BarChart3,
  Download,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const HealthNewsPanel = () => {
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    categories: 0
  });
  const [recentNews, setRecentNews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [
        { count: total },
        { count: published },
        { count: draft },
        { data: categories },
        { data: recent }
      ] = await Promise.all([
        supabase.from('health_news').select('id', { count: 'exact' }).limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).eq('published', true).limit(0),
        supabase.from('health_news').select('id', { count: 'exact' }).eq('published', false).limit(0),
        supabase.from('health_news').select('category'),
        supabase.from('health_news')
          .select('id, title, published, category, created_at')
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const uniqueCategories = new Set(categories?.map(c => c.category)).size;

      setStats({
        total: total || 0,
        published: published || 0,
        draft: draft || 0,
        categories: uniqueCategories || 0
      });
      setRecentNews(recent || []);
    } catch (error) {
      console.error('Error fetching health news stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Real-time subscription
    const channel = supabase
      .channel('health_news_panel_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'health_news' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = () => {
    window.dispatchEvent(new CustomEvent('openHealthNewsModal'));
  };

  const handleFilters = () => {
    window.dispatchEvent(new CustomEvent('openFilters'));
  };

  return (
    <div className="p-4 space-y-4">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* News Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">News Overview</h3>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-primary/20 flex items-center justify-center">
                    <Newspaper className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Total Articles</span>
                    <p className="text-xs text-muted-foreground">All time content</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">{stats.total}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.published}</p>
                    <p className="text-xs text-muted-foreground">Published</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
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

          {/* Quick Actions */}
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
                onClick={handleCreate}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Create New Article"
              >
                <Plus className="h-4 w-4" />
                <span className="font-normal text-xs">Create</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleFilters}
                className="bg-info/10 hover:bg-info/20 text-info border border-info/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Filter & Search"
              >
                <Filter className="h-4 w-4" />
                <span className="font-normal text-xs">Filter</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                title="Preview"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="font-normal text-xs">Preview</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                className="bg-muted/10 hover:bg-muted/20 text-muted-foreground border border-muted/20 rounded-xl p-3 flex flex-col items-center gap-2 transition-colors"
                disabled
                title="Export (Coming Soon)"
              >
                <Download className="h-4 w-4" />
                <span className="font-normal text-xs">Export</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Recent News */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Recent Articles</h3>

            <div className="space-y-2">
              {recentNews.map((news) => (
                <Card key={news.id} className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 geo-round ${news.published ? 'bg-success' : 'bg-warning'}`} />
                      <div>
                        <p className="font-normal text-sm truncate max-w-[120px]">{news.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {news.category} • {new Date(news.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {news.published ? 'Live' : 'Draft'}
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
