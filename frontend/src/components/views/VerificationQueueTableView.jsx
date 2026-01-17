import React from 'react';
import { getAvatarUrl, getAvatarFallback } from '../../lib/avatarUtils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Eye, Trash2, CheckCircle, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const VerificationQueueTableView = ({ providers, onView, onDelete, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg glass shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-black uppercase tracking-wider">User</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Email</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Role</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Joined</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider, index) => (
              <motion.tr
                key={provider.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 squircle-sm">
                      <AvatarImage src={getAvatarUrl(provider)} />
                      <AvatarFallback className="font-black bg-primary/10 text-primary text-xs">
                        {getAvatarFallback(provider)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-black">{provider.username || 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{provider.email || '-'}</TableCell>
                <TableCell className="capitalize font-semibold">{provider.role || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${provider.bvn_verified ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'} border-0 font-black flex gap-1`}>
                    {provider.bvn_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {provider.bvn_verified ? 'Verified' : 'Pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{new Date(provider.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(provider)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(provider)}
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
