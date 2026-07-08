import React from 'react';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const UserListView = ({ users, onView, onEdit, onDelete, onSchedule, onFocus, isMobile = false }) => {
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
      className="space-y-2"
    >
      {users.map((user, index) => (
        <motion.div
          key={user.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div
            onClick={() => onFocus?.(user)}
            className="cursor-pointer rounded-card bg-background/30 p-4 transition-colors hover:bg-muted/30 group"
          >
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg truncate group-hover:text-foreground transition-colors">
                      {user.full_name || user.profile_full_name || 'Unknown User'}
                    </h3>
                    <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium lowercase">@{user.username || user.profile_username || 'no-handle'}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email || 'No email'} / {user.organization_name || 'N/A'} / {user.provider_type || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {user.bvn_verified && (
                  <span className="inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">
                    Verified
                  </span>
                )}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(user)}
                    className="rounded-icon h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="rounded-icon h-8 w-8 p-0 hover:bg-muted hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.role === 'provider' && onSchedule && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSchedule(user)}
                      className="rounded-icon h-8 w-8 p-0 hover:bg-sky-500/15 hover:text-sky-700 dark:hover:text-sky-200"
                    >
                      <CalendarDays className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="rounded-icon h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};
