import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Edit, Trash2, Eye, EyeOff, Clock, Globe, Tag, Calendar, FileCheck, File, MoreHorizontal } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const HealthNewsTableView = ({ healthNews, onView, onEdit, onDelete, onTogglePublish, getStatusBadge, isMobile = false, isAdmin = false, selectedIds = [], onSelect, onSelectAll }) => {
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
                <TableHead className="w-12 text-[10px] font-bold uppercase tracking-wider text-xs md:text-sm py-4">
                  <Checkbox
                    checked={selectedIds.length === healthNews.length && healthNews.length > 0}
                    onCheckedChange={(checked) => onSelectAll(checked)}
                    aria-label="Select all"
                  />
                </TableHead>
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
                  className="border-b border-white/10 hover:bg-primary/5 transition-colors group cursor-default"
                >
                  <TableCell className="py-4">
                    <Checkbox
                      checked={selectedIds.includes(news.id)}
                      onCheckedChange={(checked) => onSelect(news.id, checked)}
                      aria-label={`Select news ${news.title}`}
                    />
                  </TableCell>
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
                    <Badge className="squircle-sm bg-info/20 text-info border-0 font-bold text-xs">
                      {news.category || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getStatusBadge(news.published)} border-0 font-bold text-xs`}>
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
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                          <DropdownMenuItem onClick={() => onView(news)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => onTogglePublish(news)} className="cursor-pointer font-medium text-xs py-2 text-warning focus:text-warning focus:bg-warning/10">
                                {news.published ? <FileCheck className="mr-2 h-3.5 w-3.5" /> : <File className="mr-2 h-3.5 w-3.5" />}
                                {news.published ? 'Unpublish' : 'Publish'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit(news)} className="cursor-pointer font-medium text-xs py-2">
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => onDelete(news)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
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
