import React from 'react';
import { Button } from '../ui/button';
import { Eye, Clock, Globe, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export const HealthNewsListView = ({ healthNews, onView, onFocus, getStatusBadge, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {healthNews.map((news, index) => (
        <motion.div
          key={news.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
          onClick={() => onFocus?.(news)}
          className="group cursor-pointer rounded-card bg-background/35 backdrop-blur-xs p-3 md:p-4 transition-colors hover:bg-muted/30"
        >
          <div className="flex items-center gap-3 md:gap-4 justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 mb-2">
                <h3 className="font-bold text-sm md:text-lg truncate transition-colors group-hover:text-foreground">
                  {news.title || 'Untitled Article'}
                </h3>
                <div className="flex gap-1 md:gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(news.published)}`}>
                    {news.published ? 'Published' : 'Draft'}
                  </span>
                  <span className="inline-flex items-center rounded-pill bg-sky-500/16 px-2 py-0.5 text-[10px] font-semibold text-sky-500">
                    {news.category || 'General'}
                  </span>
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  {news.source || 'No source'}
                </span>
                <span className="text-muted-foreground/40">-</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {news.time || 'No time'}
                </span>
                <span className="text-muted-foreground/40">-</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  {news.created_at ? new Date(news.created_at).toLocaleDateString() : 'No date'}
                </span>
              </p>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(news)}
                  className="rounded-inner h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-muted/40 hover:text-foreground"
                  aria-label={`View ${news.title || 'article'}`}
                >
                  <Eye className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
