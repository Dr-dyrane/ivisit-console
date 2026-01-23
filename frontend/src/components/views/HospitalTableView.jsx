import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye, Star, MoreHorizontal, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import { useAuth } from '../../contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';

export const HospitalTableView = ({
  hospitals,
  onView,
  onEdit,
  onDelete,
  getStatusBadge,
  isMobile = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  sortConfig,
  onSort
}) => {
  const { isAdmin, isProvider } = useAuth();
  const canManage = isAdmin() || isProvider();

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
              {canManage && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={hospitals.length > 0 && selectedIds.length === hospitals.length}
                    onCheckedChange={onSelectAll}
                  />
                </TableHead>
              )}
              <SortableHead label="Name" columnKey="name" />
              <SortableHead label="Address" columnKey="address" />
              <SortableHead label="Status" columnKey="status" />
              <SortableHead label="Beds" columnKey="available_beds" />
              <SortableHead label="Fleet" columnKey="ambulances_count" />
              <SortableHead label="Rating" columnKey="rating" />
              <TableHead className="font-bold uppercase tracking-wider text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hospitals.map((hospital, index) => (
              <motion.tr
                key={hospital.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                className={`border-b border-white/10 hover:bg-white/5 transition-colors group ${selectedIds.includes(hospital.id) ? 'bg-primary/5' : ''}`}
                onClick={() => isMobile && onView(hospital)}
              >
                {canManage && (
                  <TableCell className="w-[50px]">
                    <Checkbox
                      checked={selectedIds.includes(hospital.id)}
                      onCheckedChange={() => onSelect(hospital.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                <TableCell className="font-bold">{hospital.name || 'Unknown'}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">{hospital.address || '-'}</TableCell>
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
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className={`flex justify-end pr-2 opacity-100 transition-opacity`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[160px] rounded-xl bg-background/70 backdrop-blur-xl border-white/10 shadow-premium">
                        <DropdownMenuItem onClick={() => onView(hospital)} className="cursor-pointer font-medium text-xs py-2">
                          <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                          View Details
                        </DropdownMenuItem>
                        {canManage && (
                          <>
                            <DropdownMenuItem onClick={() => onEdit(hospital)} className="cursor-pointer font-medium text-xs py-2">
                              <Edit className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                              Edit Hospital
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuItem onClick={() => onDelete(hospital)} className="cursor-pointer font-medium text-xs py-2 text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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
