import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, EyeOff, Clock, Globe, Tag, Calendar, FileCheck, File } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const HealthNewsTableView = ({ healthNews, onView, onEdit, onDelete, onTogglePublish, getStatusBadge, isMobile = false, isAdmin = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Title</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Source</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Category</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Status</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Time</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm">Date</TableHead>
                <TableHead className="font-black uppercase tracking-wider text-xs md:text-sm text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {healthNews.map((news, index) => (
                <motion.tr
                  key={news.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-white/10 hover:bg-primary/5 transition-colors group cursor-default"
                >
                  <TableCell className="font-black truncate max-w-[150px] md:max-w-[200px] text-xs md:text-sm">
                    <div className="truncate" title={news.title}>
                      {news.title || 'Untitled'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{news.source || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className="squircle-sm bg-info/20 text-info border-0 font-black text-xs">
                      {news.category || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getStatusBadge(news.published)} border-0 font-black text-xs`}>
                      {news.published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{news.time || '-'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{new Date(news.created_at).toLocaleDateString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
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
                            {news.published ? <FileCheck className="h-3 w-3 md:h-4 md:w-4" /> : <File className="h-3 w-3 md:h-4 md:w-4" />}
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
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </motion.div>
  );
};
