import React from 'react';
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
      ? <ChevronUp className="ml-2 h-3 w-3 text-muted-foreground" />
      : <ChevronDown className="ml-2 h-3 w-3 text-muted-foreground" />;
  };

  const headClass = 'h-10 px-2 text-left align-middle font-bold uppercase tracking-wider text-muted-foreground';
  const cellClass = 'p-2 align-middle';

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <th
      className={`${headClass} cursor-pointer select-none hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
      scope="col"
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </th>
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
      <div className="rounded-card bg-background/35 overflow-hidden">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="hover:bg-transparent">
                <th className={`${headClass} w-[50px]`} scope="col">
                  <Checkbox
                    checked={isAllSelected || (isIndeterminate && "indeterminate")}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </th>
                <SortableHead label="ID" columnKey="display_id" />
                <SortableHead label="Username" columnKey="username" />
                <SortableHead label="Email" columnKey="email" />
                <SortableHead label="Role" columnKey="role" />
                <th className={headClass} scope="col">Organization</th>
                <SortableHead label="Provider Type" columnKey="provider_type" />
                <SortableHead label="Verified" columnKey="bvn_verified" />
                <SortableHead label="Joined" columnKey="created_at" />
                <th className={`${headClass} text-right pr-6`} scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const isSelected = selectedIds.includes(user.id);
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className={`transition-colors group ${isSelected ? 'bg-muted' : 'hover:bg-white/5'}`}
                  >
                    <td className={cellClass}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(user.id, checked)}
                        aria-label={`Select ${user.username}`}
                      />
                    </td>
                    <td className={`${cellClass} font-mono text-[10px] font-bold text-muted-foreground`}>
                      {user.display_id || user.profile_display_id || '-'}
                    </td>
                    <td className={`${cellClass} font-bold`}>
                      <div className="flex flex-col">
                        <span className="text-sm">{user.full_name || user.profile_full_name || 'Unknown User'}</span>
                        <span className="text-[10px] text-muted-foreground font-medium lowercase">@{user.username || user.profile_username || 'no-handle'}</span>
                      </div>
                    </td>
                    <td className={`${cellClass} text-muted-foreground`}>{user.email || '-'}</td>
                    <td className={cellClass}>
                      <Badge className={`rounded-pill ${getRoleBadge(user.role)} font-black text-[10px] tracking-widest uppercase px-2 py-0.5`}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className={`${cellClass} text-muted-foreground font-medium text-xs`}>
                      {user.organization_name || '-'}
                    </td>
                    <td className={`${cellClass} text-muted-foreground capitalize`}>{user.provider_type || '-'}</td>
                    <td className={cellClass}>
                      {user.bvn_verified ? (
                        <Badge className="rounded-pill bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 font-black text-[10px] tracking-widest uppercase px-2 py-0.5">Verified</Badge>
                      ) : (
                        <Badge className="rounded-pill bg-white/5 text-muted-foreground/60 font-black text-[10px] tracking-widest uppercase px-2 py-0.5">Pending</Badge>
                      )}
                    </td>
                    <td className={`${cellClass} text-muted-foreground whitespace-nowrap`}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className={cellClass}>
                      <div className={`flex justify-end pr-2 ${isMobile ? 'opacity-100' : 'opacity-100'} transition-opacity`}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-icon hover:bg-white/10 dark:hover:bg-white/10">
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
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => onDelete(user)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {users.length === 0 && (
                <tr>
                  <td colSpan={10} className="h-24 p-2 text-center align-middle text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
