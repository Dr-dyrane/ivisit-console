import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Eye, Clock, Globe, Calendar, MoreHorizontal } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const HealthNewsTableView = ({
  healthNews,
  onView,
  getStatusBadge,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/18 hover:bg-transparent">
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Title</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Source</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Category</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Status</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Time</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Date</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {healthNews.map((news, index) => (
                <motion.tr
                  key={news.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="shadow-[inset_0_-2px_0_hsl(var(--foreground)/0.04)] hover:bg-primary/5 transition-colors group cursor-default"
                >
                  <TableCell className="font-bold truncate max-w-[150px] md:max-w-[200px] text-xs md:text-sm">
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
                    <Badge className="squircle-sm bg-info/20 text-info font-bold text-xs">
                      {news.category || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getStatusBadge(news.published)} font-bold text-xs`}>
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
                      <span className="truncate">
                        {news.created_at ? new Date(news.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl shadow-premium">
                          <DropdownMenuItem onClick={() => onView(news)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
