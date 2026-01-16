import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export const UserListView = ({ users, onView, onEdit, onDelete, getRoleBadge, isMobile = false }) => {
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
          <Card className="squircle-lg glass shadow-sm p-4 border-0 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4 justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-black text-lg truncate group-hover:text-primary transition-colors">
                    {user.username || 'Unknown User'}
                  </h3>
                  <Badge className={`squircle-sm ${getRoleBadge(user.role)} border-0 font-black`}>
                    {user.role}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email || 'No email'} • {user.provider_type || 'N/A'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {user.bvn_verified && (
                  <Badge className="squircle-sm bg-success/20 text-success border-0 px-2">
                    Verified
                  </Badge>
                )}
                <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(user)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(user)}
                    className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(user)}
                    className="squircle h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
