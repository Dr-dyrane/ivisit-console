import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Edit, Trash2, Eye, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown, User, Stethoscope } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { getStandardizedPatient } from '../../utils/patientUtils';
import { getStandardizedHospital } from '../../utils/hospitalUtils';

export const VisitTableView = ({
  visits,
  onView,
  onEdit,
  onDelete,
  isMobile = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-500';
      case 'in_progress': return 'bg-orange-500/20 text-orange-500';
      case 'completed': return 'bg-green-500/20 text-green-500';
      case 'cancelled': return 'bg-red-500/20 text-red-500';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const isAllSelected = visits.length > 0 && visits.every(v => selectedIds.includes(v.id));
  const isIndeterminate = visits.some(v => selectedIds.includes(v.id)) && !isAllSelected;

  const SortableHead = ({ label, sortKey, className = "" }) => {
    const isSorted = sortConfig?.key === sortKey;
    const direction = isSorted ? sortConfig.direction : null;

    return (
      <TableHead
        className={`font-bold uppercase tracking-wider cursor-pointer select-none hover:text-primary transition-colors ${className}`}
        onClick={() => onSort && onSort(sortKey)}
      >
        <div className="flex items-center gap-2">
          {label}
          {isSorted ? (
            direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </div>
      </TableHead>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected || (isIndeterminate ? "indeterminate" : false)}
                  onCheckedChange={onSelectAll}
                />
              </TableHead>
              <SortableHead label="Visit ID" sortKey="id" />
              <SortableHead label="Patient" sortKey="user_id" />
              <SortableHead label="Hospital" sortKey="hospital_id" />
              <SortableHead label="Status" sortKey="status" />
              <SortableHead label="Type" sortKey="visit_type" />
              <SortableHead label="Cost" sortKey="cost" />
              <SortableHead label="Location" sortKey="room_number" />
              <SortableHead label="Date" sortKey="date" />
              <TableHead className="w-[80px] font-bold uppercase tracking-wider text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  No visits found.
                </TableCell>
              </TableRow>
            ) : (
              visits.map((visit, index) => (
                <motion.tr
                  key={visit.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-white/10 transition-colors ${selectedIds.includes(visit.id) ? 'bg-primary/5' : 'hover:bg-white/5'}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(visit.id)}
                      onCheckedChange={() => onSelect(visit.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs font-bold text-muted-foreground">
                    #{visit.id?.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {(() => {
                        const patient = getStandardizedPatient(visit);
                        return (
                          <>
                            <span className="font-semibold text-sm flex items-center gap-1.5">
                              <User className="w-3 h-3 text-primary/70" />
                              {patient.name}
                            </span>
                            {patient.email && (
                              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {patient.email}
                              </span>
                            )}
                            {(visit.doctor || visit.doctor_name) && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Stethoscope className="w-3 h-3" />
                                {visit.doctor || visit.doctor_name || 'Unassigned'}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {(() => {
                        const hospital = getStandardizedHospital(visit);
                        return (
                          <>
                            <span className="font-medium text-sm">{hospital.name}</span>
                            {visit.room_number && (
                              <span className="text-xs text-muted-foreground">
                                Room {visit.room_number}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`squircle-sm ${getStatusBadge(visit.status)} border-0 font-bold uppercase text-[10px]`}>
                      {visit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-white/10">
                      {visit.visit_type || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-medium opacity-80">{visit.cost || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {(() => {
                        const hospital = getStandardizedHospital(visit);
                        return (
                          <>
                            <span className="text-xs font-bold text-foreground/90 mb-0.5">{hospital.name}</span>
                            <div className="flex items-center gap-1.5">
                              {visit.room_number && <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm">{visit.room_number}</Badge>}
                              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={hospital.address}>{hospital.address}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(visit.date || visit.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] squircle-xl border-white/10 bg-background/80 backdrop-blur-xl">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onView(visit)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(visit)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Visit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
                        <DropdownMenuItem onClick={() => onDelete(visit)} className="text-destructive focus:text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};
