import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const VisitTableView = ({ visits, onView, onEdit, onDelete, getStatusBadge, isMobile = false }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-black uppercase tracking-wider">Visit ID</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Type</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Scheduled</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.map((visit, index) => (
              <motion.tr
                key={visit.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
                <TableCell className="font-black">#{visit.id?.slice(-6) || 'N/A'}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-black`}>
                    {visit.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{visit.visit_type || '-'}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(visit.scheduled_at || visit.created_at)}</TableCell>
                <TableCell>
                  <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(visit)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(visit)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(visit)}
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
