import React from 'react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Eye, Clock, Globe, Calendar, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const GRID_TEMPLATE =
  'grid-cols-[minmax(160px,2fr)_minmax(120px,1fr)_minmax(96px,0.7fr)_minmax(96px,0.7fr)_minmax(90px,0.6fr)_minmax(110px,0.7fr)_64px]';

export const HealthNewsTableView = ({
  healthNews,
  onView,
  onFocus,
  getStatusBadge,
}) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rounded-card bg-background/30 overflow-hidden p-3">
        {/* Header row */}
        <div className={`grid ${GRID_TEMPLATE} items-center gap-2 px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
          <span>Title</span>
          <span>Source</span>
          <span>Category</span>
          <span>Status</span>
          <span>Time</span>
          <span>Date</span>
          <span className="justify-self-end">Actions</span>
        </div>

        {/* Data rows */}
        {healthNews.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No health news found.
          </div>
        ) : (
          healthNews.map((news, index) => (
            <motion.div
              key={news.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onFocus?.(news)}
              className={`grid ${GRID_TEMPLATE} cursor-pointer items-center gap-2 rounded-inner px-3 py-3 transition-colors hover:bg-muted/30`}
            >
              {/* Title */}
              <div className="min-w-0 font-bold text-xs md:text-sm">
                <div className="truncate" title={news.title}>
                  {news.title || 'Untitled'}
                </div>
              </div>
              {/* Source */}
              <div className="flex items-center gap-1 min-w-0 text-muted-foreground text-xs md:text-sm">
                <Globe className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">{news.source || '-'}</span>
              </div>
              {/* Category */}
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-pill bg-sky-500/16 px-2 py-0.5 text-[10px] font-semibold text-sky-500">
                  {news.category || 'General'}
                </span>
              </div>
              {/* Status */}
              <div className="min-w-0">
                <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(news.published)}`}>
                  {news.published ? 'Published' : 'Draft'}
                </span>
              </div>
              {/* Time */}
              <div className="flex items-center gap-1 min-w-0 text-muted-foreground text-xs md:text-sm">
                <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">{news.time || '-'}</span>
              </div>
              {/* Date */}
              <div className="flex items-center gap-1 min-w-0 text-muted-foreground text-xs md:text-sm">
                <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                <span className="truncate">
                  {news.created_at ? new Date(news.created_at).toLocaleDateString() : '-'}
                </span>
              </div>
              {/* Actions */}
              <div className="justify-self-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-pill hover:bg-muted/40">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/80 backdrop-blur-xl shadow-sm">
                    <DropdownMenuItem onClick={() => onView(news)} className="cursor-pointer font-medium text-xs py-2">
                      <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};
