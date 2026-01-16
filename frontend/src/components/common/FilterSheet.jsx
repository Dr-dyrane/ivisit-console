import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FilterSheet = ({ isOpen, onOpenChange, filterSchema, onApply, initialValues = {}, viewToggle = null, isMobile = false }) => {
  const [filters, setFilters] = useState(initialValues);

  useEffect(() => {
    setFilters(initialValues);
  }, [initialValues]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onOpenChange(false);
  };

  const handleReset = () => {
    setFilters(initialValues);
  };

  const renderFilterControl = (filter) => {
    const { key, type, label, options, min, max, step } = filter;
    const currentValue = filters[key];

    switch (type) {
      case 'text':
        return (
          <div key={key} className="space-y-3 px-3 py-3 rounded-lg hover:bg-white/3 transition-colors">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleFilterChange(key, e.target.value)}
              placeholder={filter.placeholder || `Search ${label.toLowerCase()}...`}
              className="w-full px-3 py-2 border border-white/10 rounded-lg bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-sm"
            />
          </div>
        );

      case 'multiselect':
        return (
          <div key={key} className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-3">{label}</p>
            <div className="space-y-2">
              {options.map(option => (
                <div key={option.value} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <Checkbox
                    id={`${key}-${option.value}`}
                    checked={(currentValue || []).includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...(currentValue || []), option.value]
                        : (currentValue || []).filter(v => v !== option.value);
                      handleFilterChange(key, newValues);
                    }}
                    className="w-5 h-5"
                  />
                  <Label htmlFor={`${key}-${option.value}`} className="text-sm font-medium cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'range':
        return (
          <div key={key} className="space-y-3 px-3 py-3 rounded-lg hover:bg-white/3 transition-colors">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">{label}</p>
            <Slider
              min={min}
              max={max}
              step={step || 1}
              value={currentValue || [min, max]}
              onValueChange={(value) => handleFilterChange(key, value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{(currentValue || [min, max])[0]}</span>
              <span>{(currentValue || [min, max])[1]}</span>
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={key} className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-3">{label}</p>
            <div className="space-y-2">
              {options.map(option => (
                <div key={option.value} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    id={`${key}-${option.value}`}
                    name={key}
                    value={option.value}
                    checked={currentValue === option.value}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="w-5 h-5 rounded-full accent-primary"
                  />
                  <Label htmlFor={`${key}-${option.value}`} className="text-sm font-medium cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-16 left-4 right-4 z-50 mx-auto max-w-2xl"
          >
            <div className="squircle-xl glass shadow-premium backdrop-blur-2xl p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest">
                    {isMobile ? 'View & Filters' : 'Filters'}
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  {isMobile && viewToggle && (
                    <div className="flex-shrink-0 pr-3">
                      {viewToggle}
                    </div>
                  )}
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 max-h-[50vh] overflow-y-auto scrollbar-hide"
              >
                {filterSchema.map((filter, idx) => (
                  <div key={filter.key}>
                    {renderFilterControl(filter)}
                  </div>
                ))}
              </motion.div>

              {/* Footer - Separated by spacing */}
              <div className="flex gap-3 mt-8 pt-6">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 squircle-lg bg-white/5 hover:bg-white/10"
                >
                  Reset
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1 squircle-lg bg-primary hover:bg-primary/90"
                >
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
