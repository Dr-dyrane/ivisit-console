import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye, Send, CheckCheck, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';

export const EmergencyRequestTableView = ({
  requests,
  onView,
  onDelete,
  onDispatch,
  onComplete,
  getPriorityBadge,
  isMobile = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort,
  currentUser
}) => {
  const canManage = currentUser ? (currentUser.isAdmin() || currentUser.isOrgAdmin()) : false;
  const canDelete = currentUser ? (currentUser.isAdmin() || (typeof currentUser.isProvider === 'function' && currentUser.isProvider())) : false;

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3 text-primary" />
      : <ChevronDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <TableHead
      className={`font-bold uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={requests.length > 0 && selectedIds.length === requests.length}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <SortableHead label="Type" columnKey="emergency_type" />
              <SortableHead label="Priority" columnKey="priority" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="Location" columnKey="location" />
              <SortableHead label="Time" columnKey="created_at" />
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req, index) => (
              <motion.tr
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`border-b border-white/10 hover:bg-white/5 transition-colors group ${selectedIds.includes(req.id) ? 'bg-primary/5' : ''}`}
                onClick={() => isMobile && onView(req)}
              >
                <TableCell className="w-[50px]">
                  <Checkbox
                    checked={selectedIds.includes(req.id)}
                    onCheckedChange={() => onSelect(req.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </TableCell>
                <TableCell className="font-bold">{req.emergency_type || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getPriorityBadge(req.priority)} border-0 font-bold`}>
                    {req.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="squircle-sm bg-muted text-muted-foreground border-0">
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">{req.location || '-'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className={`flex justify-end pr-2 opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                        <DropdownMenuItem onClick={() => onView(req)} className="cursor-pointer font-medium text-xs py-2">
                          <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          View Details
                        </DropdownMenuItem>

                        {/* Dispatch Action */}
                        {canManage && onDispatch && (req.status === 'pending' || (req.status === 'in_progress' && !req.ambulance_id)) && (
                          <DropdownMenuItem onClick={() => onDispatch(req)} className="cursor-pointer font-medium text-xs py-2 text-success focus:text-success focus:bg-success/10">
                            <Send className="mr-2 h-3.5 w-3.5" />
                            Dispatch
                          </DropdownMenuItem>
                        )}

                        {/* Complete Action */}
                        {canManage && onComplete && (req.status === 'accepted' || req.ambulance_id) && req.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => onComplete(req)} className="cursor-pointer font-medium text-xs py-2 text-info focus:text-info focus:bg-info/10">
                            <CheckCheck className="mr-2 h-3.5 w-3.5" />
                            Complete
                          </DropdownMenuItem>
                        )}

                        {canDelete && (
                          <>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => onDelete(req)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
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
      </Card>
    </motion.div>
  );
};
