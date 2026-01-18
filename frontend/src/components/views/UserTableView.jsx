import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const UserTableView = ({ users, onView, onEdit, onDelete, getRoleBadge, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-black uppercase tracking-wider">Username</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Role</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Provider Type</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Verified</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user, index) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
                <TableCell className="font-black">{user.username || 'Unknown'}</TableCell>
                <TableCell className="text-muted-foreground">{user.email || '-'}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getRoleBadge(user.role)} border-0 font-black`}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.provider_type || '-'}</TableCell>
                <TableCell>
                  {user.bvn_verified ? (
                    <Badge className="squircle-sm bg-success/20 text-success border-0">✓</Badge>
                  ) : (
                    <Badge className="squircle-sm bg-muted text-muted-foreground border-0">-</Badge>
                  )}
                </TableCell>
                <TableCell>
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
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};
