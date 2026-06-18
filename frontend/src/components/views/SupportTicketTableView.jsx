import React from 'react';
import { motion } from 'framer-motion';
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
import { Card } from '../ui/card';
import {
  Edit,
  Trash2,
  UserCheck,
  Calendar,
  MessageSquare,
  Clock,
  MoreHorizontal
} from 'lucide-react';

export const SupportTicketTableView = ({
  tickets,
  onView,
  onEdit,
  onDelete,
  onAssign,
  getStatusConfig,
  getPriorityColor,
  isAdmin,
  isMobile,
  selectedIds = [],
  onSelect,
  onSelectAll
}) => {
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
                <TableHead className="w-12 font-bold uppercase tracking-wider text-xs md:text-sm py-4">
                  <Checkbox
                    checked={selectedIds.length === tickets.length && tickets.length > 0}
                    onCheckedChange={(checked) => onSelectAll(checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Subject</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Category</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Priority</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Status</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Assigned</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm">Created</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-xs md:text-sm text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket, index) => (
                <motion.tr
                  key={ticket.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors group"
                >
                  <TableCell className="py-4">
                    <Checkbox
                      checked={selectedIds.includes(ticket.id)}
                      onCheckedChange={(checked) => onSelect(ticket.id, checked)}
                      aria-label={`Select ticket ${ticket.subject}`}
                    />
                  </TableCell>
                  <TableCell className="font-bold truncate max-w-[150px] md:max-w-[200px] text-xs md:text-sm">
                    <div className="truncate" title={ticket.subject}>
                      {ticket.subject || 'No Subject'}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className="squircle-sm bg-info/20 text-info border-0 font-bold text-xs">
                      {ticket.category || 'general'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getPriorityColor(ticket.priority)} border-0 font-bold text-xs`}>
                      {ticket.priority || 'normal'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <Badge className={`squircle-sm ${getStatusConfig(ticket.status).badgeClass} border-0 font-bold text-xs`}>
                      {ticket.status?.replace('_', ' ') || 'open'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span className="truncate">{ticket.assigned_to || 'Unassigned'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs md:text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                      <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
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
                          <DropdownMenuItem onClick={() => onView(ticket)} className="cursor-pointer font-medium text-xs py-2">
                            <MessageSquare className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          {isAdmin && (
                            <>
                              <DropdownMenuItem onClick={() => onEdit(ticket)} className="cursor-pointer font-medium text-xs py-2">
                                <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => onDelete(ticket.id)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
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
