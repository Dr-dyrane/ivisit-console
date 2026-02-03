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
import { Edit, Trash2, Eye, ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const UserTableView = ({
  users,
  onView,
  onEdit,
  onDelete,
  onSchedule,
  selectedIds = [], // Array of selected user IDs
  onSelect,        // (id) => void
  onSelectAll,     // (checked) => void
  sortConfig,      // { key: string, direction: 'asc' | 'desc' }
  onSort,          // (key) => void
  isMobile = false
}) => {

  const handleSelectAll = (checked) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (onSelect) {
      onSelect(id, checked);
    }
  };

  const isAllSelected = users.length > 0 && selectedIds.length === users.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < users.length;

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
                  checked={isAllSelected || (isIndeterminate && "indeterminate")}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHead label="ID" columnKey="display_id" />
              <SortableHead label="Username" columnKey="username" />
              <SortableHead label="Email" columnKey="email" />
              <SortableHead label="Role" columnKey="role" />
              <SortableHead label="Provider Type" columnKey="provider_type" />
              <SortableHead label="Verified" columnKey="bvn_verified" />
              <SortableHead label="Joined" columnKey="created_at" />
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-white/10 transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-white/5'}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(user.id, checked)}
                      aria-label={`Select ${user.username}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] font-bold text-primary/80">
                    {user.display_id || '-'}
                  </TableCell>
                  <TableCell className="font-bold">{user.full_name || user.username || 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                  <TableCell>
                    <Badge className={`squircle-sm ${user.role === 'admin' ? 'bg-warning/20 text-warning' :
                      user.role === 'provider' ? 'bg-success/20 text-success' :
                        'bg-info/20 text-info'
                      } border-0 font-bold`}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">{user.provider_type || '-'}</TableCell>
                  <TableCell>
                    {user.bvn_verified ? (
                      <Badge className="squircle-sm bg-success/20 text-success border-0">Verified</Badge>
                    ) : (
                      <Badge className="squircle-sm bg-muted text-muted-foreground border-0">Pending</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className={`flex justify-end pr-2 ${isMobile ? 'opacity-100' : 'opacity-100'} transition-opacity`}>
                      {/* Always visible now, relying on Dropdown for clutter control.
                             Or we can keep hover opacity. Apple style usually keeps it visible or subtle.
                             Let's revert to standard visibility for "More" icon. */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                          <DropdownMenuItem onClick={() => onView(user)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(user)} className="cursor-pointer font-medium text-xs py-2">
                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Edit User
                          </DropdownMenuItem>
                          {user.role === 'provider' && onSchedule && (
                            <DropdownMenuItem onClick={() => onSchedule(user)} className="cursor-pointer font-medium text-xs py-2">
                              <CalendarDays className="mr-2 h-3.5 w-3.5 text-purple-500" />
                              Schedule Shift
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => onDelete(user)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};

