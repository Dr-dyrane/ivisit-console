import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Edit, Trash2, Eye, Clock, User, Stethoscope, Hospital, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export const VisitListView = ({
  visits,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  isMobile = false,
  selectedIds = [],
  onSelect
}) => {
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
      className="space-y-3"
    >
      {visits.map((visit, index) => (
        <motion.div
          key={visit.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <Card className={`squircle-lg bg-background/35 backdrop-blur-xs shadow-sm p-4 border-white/5 hover:shadow-md transition-all group ${selectedIds.includes(visit.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
            <div className="flex items-center gap-4 justify-between">

              {/* Selection & Icon */}
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedIds.includes(visit.id)}
                  onCheckedChange={() => onSelect(visit.id)}
                  className="border-white/20"
                />
                <div className={`p-2 rounded-xl ${visit.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              {/* Info Block */}
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-4">

                {/* ID & Status */}
                <div>
                  <h3 className="font-bold text-base group-hover:text-primary transition-colors flex items-center gap-2 flex-wrap">
                    Visit #{visit.id?.slice(0, 8)}
                    <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-bold text-[10px] uppercase`}>
                      {visit.status}
                    </Badge>
                    {visit.cost && (
                      <Badge variant="secondary" className="squircle-sm border-0 font-mono text-[10px] bg-white/10 text-foreground/80">
                        {visit.cost}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                    {formatDate(visit.date || visit.created_at)}
                    {visit.room_number && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span>Rm {visit.room_number}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Patient */}
                <div className="hidden md:block">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Patient</span>
                  <div className="flex items-center gap-2 font-semibold text-sm truncate">
                    <User className="w-3 h-3 text-muted-foreground shrink-0" />
                    {visit.patient?.username || visit.user_id?.slice(0, 8) || 'Unknown'}
                  </div>
                </div>

                {/* Doctor */}
                <div className="hidden md:block">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Doctor</span>
                  <div className="flex items-center gap-2 font-semibold text-sm truncate">
                    <Stethoscope className="w-3 h-3 text-muted-foreground shrink-0" />
                    {visit.doctor?.name || visit.doctor || visit.doctor_name || 'Unassigned'}
                  </div>
                </div>

                {/* Hospital */}
                <div className="hidden md:block">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Facility</span>
                  <div className="flex items-center gap-2 font-semibold text-sm truncate">
                    <Hospital className="w-3 h-3 text-muted-foreground shrink-0" />
                    {visit.hospital?.name || visit.hospital_name || visit.hospital || 'Unknown Facility'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Mobile Info toggle logic here if needed, but keeping simple */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/10 rounded-full">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="squircle-xl border-white/10 bg-background/80 backdrop-blur-xl">
                    <DropdownMenuItem onClick={() => onView(visit)}>
                      <Eye className="mr-2 h-4 w-4" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(visit)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={() => onDelete(visit)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};
