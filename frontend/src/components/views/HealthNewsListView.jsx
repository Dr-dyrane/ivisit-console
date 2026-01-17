import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, EyeOff, Clock, Globe, Tag, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export const HealthNewsListView = ({ healthNews, onView, onEdit, onDelete, onTogglePublish, getStatusBadge, isMobile = false, isAdmin = false }) => {
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
        >
          <Card className="squircle-lg glass shadow-premium p-3 md:p-4 border-0 hover-lift group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10 flex items-center gap-3 md:gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h3 className="font-black text-sm md:text-lg truncate group-hover:text-primary transition-colors">
                    {news.title || 'Untitled Article'}
                  </h3>
                  <div className="flex gap-1 md:gap-2 flex-shrink-0">
                    <Badge className={`squircle-sm ${getStatusBadge(news.published)} border-0 font-black text-xs`}>
                      {news.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge className="squircle-sm bg-info/20 text-info border-0 font-black text-xs">
                      {news.category || 'General'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-primary" />
                    {news.source || 'No source'}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {news.time || 'No time'}
                  </span>
                  <span className="text-border">•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {new Date(news.created_at).toLocaleDateString()}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(news)}
                    className="squircle h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTogglePublish(news)}
                        className="squircle h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-warning/10 hover:text-warning"
                      >
                        {news.published ? <EyeOff className="h-3 w-3 md:h-4 md:w-4" /> : <Eye className="h-3 w-3 md:h-4 md:w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(news)}
                        className="squircle h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(news)}
                        className="squircle h-6 w-6 md:h-8 md:w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
