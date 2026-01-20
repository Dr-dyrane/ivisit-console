import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Star } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const HospitalTableView = ({ hospitals, onView, onEdit, onDelete, getStatusBadge, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-bold uppercase tracking-wider">Name</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Address</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Beds</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Fleet</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Rating</TableHead>
              <TableHead className="font-bold uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hospitals.map((hospital, index) => (
              <motion.tr
                key={hospital.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
                <TableCell className="font-bold">{hospital.name || 'Unknown'}</TableCell>
                <TableCell className="text-muted-foreground truncate">{hospital.address || '-'}</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getStatusBadge(hospital.status)} border-0 font-bold`}>
                    {hospital.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{hospital.available_beds || '0'}</TableCell>
                <TableCell className="font-medium">{hospital.ambulances_count || '0'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="font-bold">{hospital.rating || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(hospital)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(hospital)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(hospital)}
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
