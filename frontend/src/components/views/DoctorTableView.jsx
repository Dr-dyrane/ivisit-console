import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { Edit, Trash2, Eye, ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, Star, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const DoctorTableView = ({
  doctors,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  onSchedule,
  selectedIds = [], // Array of selected doctor IDs
  onSelect,        // (id) => void
  onSelectAll,     // (checked) => void
  sortConfig,      // { key: string, direction: 'asc' | 'desc' }
  onSort,          // (key) => void
  isMobile = false
}) => {

  const handleSelectAll = (checked) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const handleSelectOne = (id, checked) => {
    if (onSelect) {
      onSelect(id, checked);
    }
  };

  const selectedCountOnPage = doctors.filter(d => selectedIds.includes(d.id)).length;
  const isAllSelected = doctors.length > 0 && selectedCountOnPage === doctors.length;
  const isIndeterminate = selectedCountOnPage > 0 && selectedCountOnPage < doctors.length;

  const SortIcon = ({ columnKey }) => {
    if (sortConfig?.key !== columnKey) return <ArrowUpDown className="ml-2 h-3 w-3 text-muted-foreground/30" />;
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="ml-2 h-3 w-3 text-primary" />
      : <ChevronDown className="ml-2 h-3 w-3 text-primary" />;
  };

  const SortableHead = ({ label, columnKey, className = "" }) => (
    <TableHead
      className={`font-bold uppercase tracking-wider cursor-pointer select-none hover:bg-white/5 transition-colors ${className}`}
      onClick={() => onSort && onSort(columnKey)}
    >
      <div className="flex items-center">
        {label}
        <SortIcon columnKey={columnKey} />
      </div>
    </TableHead>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Card className="squircle-lg bg-background/35 backdrop-blur-xs shadow-premium border-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected || (isIndeterminate && "indeterminate")}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHead label="ID" columnKey="display_id" />
              <SortableHead label="Name" columnKey="name" />
              <SortableHead label="Specialization" columnKey="specialization" />
              <TableHead className="font-bold uppercase tracking-wider">Hospital</TableHead>
              <SortableHead label="Exp" columnKey="experience" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="Rating" columnKey="rating" />
              <SortableHead label="Joined" columnKey="created_at" />
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doctor, index) => {
              const isSelected = selectedIds.includes(doctor.id);
              return (
                <motion.tr
                  key={doctor.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-white/10 transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-white/5'}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(doctor.id, checked)}
                      aria-label={`Select ${doctor.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-[10px] font-bold text-primary/80">
                    {doctor.display_id || '-'}
                  </TableCell>
                  <TableCell className="font-bold">{doctor.name || 'Unknown'}</TableCell>
                  <TableCell>{doctor.specialization || 'General Practitioner'}</TableCell>
                  <TableCell className="text-muted-foreground">{doctor.hospitals?.name || '-'}</TableCell>
                  <TableCell className="font-medium">{doctor.experience || '0'}y</TableCell>
                  <TableCell>
                    <Badge className={`squircle-sm ${getStatusBadge(doctor.status)} border-0 font-bold`}>
                      {doctor.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-bold">
                      <Star className="h-3.5 w-3.5 text-warning fill-warning" />
                      {doctor.rating || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                    {doctor.created_at ? new Date(doctor.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <div className={`flex justify-end pr-2 ${isMobile ? 'opacity-100' : 'opacity-100'} transition-opacity`}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                          <DropdownMenuItem onClick={() => onView(doctor)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(doctor)} className="cursor-pointer font-medium text-xs py-2">
                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Edit Doctor
                          </DropdownMenuItem>
                          {onSchedule && (
                            <DropdownMenuItem onClick={() => onSchedule(doctor)} className="cursor-pointer font-medium text-xs py-2">
                              <CalendarDays className="mr-2 h-3.5 w-3.5 text-purple-500" />
                              Schedule Shift
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => onDelete(doctor)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
            {doctors.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No doctors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};
