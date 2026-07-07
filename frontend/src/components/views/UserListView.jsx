import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';

export const UserListView = ({ users, onView, onEdit, onDelete, onSchedule, isMobile = false }) => {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'bg-warning/20 text-warning';
      case 'provider': return 'bg-success/20 text-success';
      case 'patient': return 'bg-info/20 text-info';
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
          <div className="rounded-card bg-background/35 backdrop-blur-xs shadow-sm p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col gap-1 mb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                      {user.full_name || user.profile_full_name || 'Unknown User'}
                    </h3>
                    <Badge className={`rounded-pill ${getRoleBadge(user.role)} font-bold`}>
                      {user.role}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium lowercase">@{user.username || user.profile_username || 'no-handle'}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email || 'No email'} / {user.organization_name || 'N/A'} / {user.provider_type || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {user.bvn_verified && (
                  <Badge className="rounded-pill bg-success/20 text-success px-2">
                    Verified
                  </Badge>
                )}
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(user)}
                    className="rounded-icon h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="rounded-icon h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {user.role === 'provider' && onSchedule && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onSchedule(user)}
                      className="rounded-icon h-8 w-8 p-0 hover:bg-info/10 hover:text-info"
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
