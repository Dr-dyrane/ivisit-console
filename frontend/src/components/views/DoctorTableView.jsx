import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const DoctorTableView = ({ doctors, onView, onEdit, onDelete, getStatusBadge, isMobile = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg glass shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="font-black uppercase tracking-wider">Name</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Specialization</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Hospital</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Experience</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Rating</TableHead>
              <TableHead className="font-black uppercase tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor, index) => (
              <motion.tr
                key={doctor.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className="border-b border-white/10 hover:bg-white/5 transition-colors group"
              >
                <TableCell className="font-black">{doctor.name || 'Unknown'}</TableCell>
                <TableCell>{doctor.specialization || 'General Practitioner'}</TableCell>
                <TableCell className="text-muted-foreground">{doctor.hospitals?.name || '-'}</TableCell>
                <TableCell className="font-semibold">{doctor.experience || '0'}y</TableCell>
                <TableCell>
                  <Badge className={`squircle-sm ${getStatusBadge(doctor.status)} border-0 font-black`}>
                    {doctor.status}
                  </Badge>
                </TableCell>
                <TableCell className="font-black">{doctor.rating || 'N/A'}</TableCell>
                <TableCell>
                  <div className={`flex gap-1 ${isMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(doctor)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(doctor)}
                      className="squircle h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(doctor)}
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
