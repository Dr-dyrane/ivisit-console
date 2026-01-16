import React from 'react';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { LayoutGrid, List, Table2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const ViewToggle = ({ value, onChange, size = 'default' }) => {
  const sizeClasses = {
    default: 'h-8 w-8',
    sm: 'h-7 w-7',
    lg: 'h-9 w-9',
  };

  const iconSize = {
    default: 16,
    sm: 14,
    lg: 18,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={onChange}
        className="bg-white/5 border border-white/10 rounded-full p-1 gap-0"
      >
        <ToggleGroupItem
          value="grid"
          aria-label="Grid view"
          className={`${sizeClasses[size]} rounded-full hover:bg-white/10 data-[state=on]:bg-primary/20 data-[state=on]:text-primary`}
        >
          <LayoutGrid size={iconSize[size]} />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="list"
          aria-label="List view"
          className={`${sizeClasses[size]} rounded-full hover:bg-white/10 data-[state=on]:bg-primary/20 data-[state=on]:text-primary`}
        >
          <List size={iconSize[size]} />
        </ToggleGroupItem>
        <ToggleGroupItem
          value="table"
          aria-label="Table view"
          className={`${sizeClasses[size]} rounded-full hover:bg-white/10 data-[state=on]:bg-primary/20 data-[state=on]:text-primary`}
        >
          <Table2 size={iconSize[size]} />
        </ToggleGroupItem>
      </ToggleGroup>
    </motion.div>
  );
};
