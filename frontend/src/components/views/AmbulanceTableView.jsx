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
import { Edit, Trash2, Eye, ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, MapPin, CalendarDays } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';

export const AmbulanceTableView = ({
  ambulances,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  onSchedule,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort,
  isMobile = false
}) => {

  const handleSelectAll = (checked) => {
    if (onSelectAll) onSelectAll(checked);
  };

  const handleSelectOne = (id, checked) => {
    if (onSelect) onSelect(id, checked);
  };

  const selectedCountOnPage = ambulances.filter(a => selectedIds.includes(a.id)).length;
  const isAllSelected = ambulances.length > 0 && selectedCountOnPage === ambulances.length;
  const isIndeterminate = selectedCountOnPage > 0 && selectedCountOnPage < ambulances.length;

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
              <SortableHead label="Unit" columnKey="call_sign" />
              <SortableHead label="Type" columnKey="type" />
              <SortableHead label="Vehicle" columnKey="vehicle_number" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="ETA" columnKey="eta" />
              <SortableHead label="Rating" columnKey="rating" />
              <TableHead className="font-bold uppercase tracking-wider">Station</TableHead>
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ambulances.map((ambulance, index) => {
              const isSelected = selectedIds.includes(ambulance.id);
              return (
                <motion.tr
                  key={ambulance.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`border-b border-white/10 transition-colors group ${isSelected ? 'bg-primary/5' : 'hover:bg-white/5'}`}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectOne(ambulance.id, checked)}
                      aria-label={`Select ${ambulance.call_sign}`}
                    />
                  </TableCell>
                  <TableCell className="font-bold">{ambulance.call_sign || 'Unknown'}</TableCell>
                  <TableCell>{ambulance.type || 'Standard'}</TableCell>
                  <TableCell className="text-muted-foreground">{ambulance.vehicle_number || '-'}</TableCell>
                  <TableCell>
                    <Badge className={`squircle-sm ${getStatusBadge(ambulance.status)} border-0 font-bold`}>
                      {ambulance.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{ambulance.eta || 'N/A'}</TableCell>
                  <TableCell className="font-bold">{ambulance.rating || 'N/A'}</TableCell>
                  <TableCell className="text-muted-foreground">{ambulance.hospital || 'HQ'}</TableCell>
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
                          <DropdownMenuItem onClick={() => onView(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                            <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                            <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                            Edit Unit
                          </DropdownMenuItem>
                          {onSchedule && (
                            <DropdownMenuItem onClick={() => onSchedule(ambulance)} className="cursor-pointer font-medium text-xs py-2">
                              <CalendarDays className="mr-2 h-3.5 w-3.5 text-purple-500" />
                              Schedule Crew
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/5" />
                          <DropdownMenuItem onClick={() => onDelete(ambulance)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
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
            {ambulances.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No ambulances found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </motion.div>
  );
};
