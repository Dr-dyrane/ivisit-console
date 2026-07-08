import React from 'react';
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
import { motion } from 'framer-motion';

const GRID_TEMPLATE = 'grid-cols-[40px_minmax(70px,0.6fr)_minmax(150px,1.3fr)_minmax(150px,1.3fr)_minmax(90px,0.6fr)_minmax(120px,0.9fr)_minmax(100px,0.7fr)_minmax(90px,0.6fr)_minmax(90px,0.6fr)_64px]';

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
      ? <ChevronUp className="ml-2 h-3 w-3 text-muted-foreground" />
      : <ChevronDown className="ml-2 h-3 w-3 text-muted-foreground" />;
  };

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <button
      type="button"
      className={`flex items-center font-semibold tracking-[0.14em] text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      {label}
      <SortIcon columnKey={columnKey} />
    </button>
  );

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
      case 'provider': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-200';
      case 'patient': return 'bg-sky-500/15 text-sky-700 dark:text-sky-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="rounded-card bg-background/30 overflow-hidden p-3">
        {/* Header row */}
        <div className={`grid ${GRID_TEMPLATE} items-center gap-2 px-3 pb-3 pt-2 text-[10px]`}>
          <div className="flex items-center">
            <Checkbox
              checked={isAllSelected || (isIndeterminate && "indeterminate")}
              onCheckedChange={handleSelectAll}
              aria-label="Select all"
            />
          </div>
          <SortableHead label="ID" columnKey="display_id" />
          <SortableHead label="Username" columnKey="username" />
          <SortableHead label="Email" columnKey="email" />
          <SortableHead label="Role" columnKey="role" />
          <span className="font-semibold tracking-[0.14em] text-muted-foreground">Organization</span>
          <SortableHead label="Provider Type" columnKey="provider_type" />
          <SortableHead label="Verified" columnKey="bvn_verified" />
          <SortableHead label="Joined" columnKey="created_at" />
          <span className="justify-self-end font-semibold tracking-[0.14em] text-muted-foreground">Actions</span>
        </div>

        {/* Data rows */}
        {users.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            No users found.
          </div>
        ) : (
          users.map((user, index) => {
            const isSelected = selectedIds.includes(user.id);
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`grid ${GRID_TEMPLATE} items-center gap-2 rounded-inner px-3 py-3 transition-colors group ${isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'}`}
              >
                {/* Select */}
                <div className="flex items-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectOne(user.id, checked)}
                    aria-label={`Select ${user.username}`}
                  />
                </div>
                {/* ID */}
                <div className="font-mono text-[10px] font-bold text-muted-foreground truncate">
                  {user.display_id || user.profile_display_id || '-'}
                </div>
                {/* Username */}
                <div className="flex flex-col min-w-0 font-bold">
                  <span className="text-sm truncate">{user.full_name || user.profile_full_name || 'Unknown User'}</span>
                  <span className="text-[10px] text-muted-foreground font-medium lowercase truncate">@{user.username || user.profile_username || 'no-handle'}</span>
                </div>
                {/* Email */}
                <div className="text-muted-foreground text-sm truncate">{user.email || '-'}</div>
                {/* Role */}
                <div className="min-w-0">
                  <span className={`inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold ${getRoleBadge(user.role)}`}>
                    {user.role}
                  </span>
                </div>
                {/* Organization */}
                <div className="text-muted-foreground font-medium text-xs truncate">
                  {user.organization_name || '-'}
                </div>
                {/* Provider Type */}
                <div className="text-muted-foreground capitalize text-sm truncate">{user.provider_type || '-'}</div>
                {/* Verified */}
                <div className="min-w-0">
                  {user.bvn_verified ? (
                    <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">Verified</span>
                  ) : (
                    <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground/60">Pending</span>
                  )}
                </div>
                {/* Joined */}
                <div className="text-muted-foreground text-sm whitespace-nowrap">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                </div>
                {/* Actions */}
                <div className="justify-self-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-icon hover:bg-muted/30">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px] rounded-inner bg-background/70">
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
                          <CalendarDays className="mr-2 h-3.5 w-3.5 text-sky-600 dark:text-sky-200" />
                          Schedule Shift
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="bg-muted" />
                      <DropdownMenuItem onClick={() => onDelete(user)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
