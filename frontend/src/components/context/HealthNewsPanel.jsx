import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import {
  Newspaper,
  Eye,
  EyeOff,
  TrendingUp,
  Filter,
  Plus
} from 'lucide-react';

export const HealthNewsPanel = () => {
  // Mock data for health news analytics - in real implementation, this would come from useHealthNews hook
  const newsStats = {
    total: 45,
    published: 32,
    draft: 13,
    thisWeek: 8,
    categories: 6
  };

  const handleCreateNews = () => {
    // Trigger create modal on health news page
    const event = new CustomEvent('openHealthNewsModal');
    window.dispatchEvent(event);
  };

  const handleViewFilters = () => {
    // Trigger filter sheet open on health news page
    const event = new CustomEvent('openFilters');
    window.dispatchEvent(event);
  };

  return (
    <div className="p-4 space-y-4">
      {/* News Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-3 bg-background/50 border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total News</span>
            <Newspaper className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-foreground">{newsStats.total}</div>
          <div className="text-xs text-muted-foreground">All time articles</div>
        </Card>
      </motion.div>

      {/* Published vs Draft */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-2"
      >
        <Card className="p-3 bg-background/50 border-border/30">
          <div className="flex items-center justify-between mb-1">
            <Eye className="h-3 w-3 text-success" />
            <span className="text-xs text-success font-normal">Published</span>
          </div>
          <div className="text-lg font-semibold">{newsStats.published}</div>
        </Card>
        <Card className="p-3 bg-background/50 border-border/30">
          <div className="flex items-center justify-between mb-1">
            <EyeOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-normal">Draft</span>
          </div>
          <div className="text-lg font-semibold">{newsStats.draft}</div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-3 bg-background/50 border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">This Week</span>
            <TrendingUp className="h-4 w-4 text-info" />
          </div>
          <div className="text-xl font-semibold text-foreground">{newsStats.thisWeek}</div>
          <div className="text-xs text-muted-foreground">New articles</div>
        </Card>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-3 bg-background/50 border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories</span>
            <Filter className="h-4 w-4 text-warning" />
          </div>
          <div className="text-xl font-semibold text-foreground">{newsStats.categories}</div>
          <div className="text-xs text-muted-foreground">Active categories</div>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Quick Actions</div>
          <div className="space-y-1">
            <div
              onClick={handleCreateNews}
              className="p-2 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-primary" />
                <span className="text-xs font-normal">Create News</span>
              </div>
            </div>
            <div
              onClick={handleViewFilters}
              className="p-2 rounded-lg bg-background/30 border border-border/20 hover:bg-background/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-normal">View All Filters</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
