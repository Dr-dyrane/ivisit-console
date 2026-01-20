import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { supabase } from '../../lib/supabase';
import {
  Newspaper,
  Eye,
  EyeOff,
  TrendingUp,
  Filter,
  Plus,
  BarChart3,
  Tag
} from 'lucide-react';

export const HealthNewsPanel = () => {
  // Use real data logic similar to the page, or simplified stats
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    categories: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: total },
          { count: published },
          { count: draft },
          { data: categories }
        ] = await Promise.all([
          supabase.from('health_news').select('id', { count: 'exact' }).limit(0),
          supabase.from('health_news').select('id', { count: 'exact' }).eq('published', true).limit(0),
          supabase.from('health_news').select('id', { count: 'exact' }).eq('published', false).limit(0),
          supabase.from('health_news').select('category')
        ]);

        const uniqueCategories = new Set(categories?.map(c => c.category)).size;

        setStats({
          total: total || 0,
          published: published || 0,
          draft: draft || 0,
          categories: uniqueCategories || 0
        });
      } catch (error) {
        console.error('Error fetching health news stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Subscribe to changes
    const channel = supabase
      .channel('health_news_panel_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'health_news' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-4 space-y-4">
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!loading && (
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
                    <p className="text-xs text-muted-foreground">All health news</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">{stats.total}</Badge>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-success/20 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.published}</p>
                    <p className="text-xs text-muted-foreground">Live</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-3 border-0 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 geo-round bg-warning/20 flex items-center justify-center">
                    <EyeOff className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{stats.draft}</p>
                    <p className="text-xs text-muted-foreground">Drafts</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="bg-background/50 backdrop-blur-xs squircle-lg p-4 border-0 shadow-premium">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 geo-round bg-info/20 flex items-center justify-center">
                    <Tag className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight">Active Categories</span>
                    <p className="text-xs text-muted-foreground">Topics covered</p>
                  </div>
                </div>
                <Badge className="bg-info/20 text-info border-0">{stats.categories}</Badge>
              </div>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Quick Actions</h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  const event = new CustomEvent('openHealthNewsModal');
                  window.dispatchEvent(event);
                }}
                className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-primary/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm text-left"
              >
                <Plus className="h-4 w-4 text-primary" />
                <span className="font-bold tracking-tight text-primary">Create News</span>
              </button>

              <button
                onClick={() => {
                  const event = new CustomEvent('openFilters');
                  window.dispatchEvent(event);
                }}
                className="w-full p-3 geo-sharp bg-background/50 backdrop-blur-xs hover:bg-info/20 transition-all duration-300 flex items-center gap-3 border-0 shadow-sm text-left"
              >
                <Filter className="h-4 w-4 text-info" />
                <span className="font-bold tracking-tight text-info">Filter & Search</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};
