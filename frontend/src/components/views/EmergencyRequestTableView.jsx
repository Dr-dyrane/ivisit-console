import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const EmergencyRequestTableView = ({ requests, onView, onDelete, getPriorityBadge, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-bold uppercase tracking-wider">Type</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Priority</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Location</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Time</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req, index) => (
              <motion.tr
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
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
                <TableCell className="text-muted-foreground truncate">{req.location || '-'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {req.created_at ? new Date(req.created_at).toLocaleTimeString() : 'Just now'}
                </TableCell>
                <TableCell>
                  <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(req)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(req)}
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
