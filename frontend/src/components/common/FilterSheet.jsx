import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const FilterSheet = ({ isOpen, onOpenChange, filterSchema = [], onApply, initialValues = {}, viewToggle = null, isMobile = false }) => {
  const [filters, setFilters] = useState(initialValues);
  const prevInitialValuesRef = useRef();

  useEffect(() => {
    // Only update filters if initialValues actually changed (deep comparison)
    if (JSON.stringify(initialValues) !== JSON.stringify(prevInitialValuesRef.current)) {
      setFilters(initialValues);
      prevInitialValuesRef.current = initialValues;
    }
  }, [initialValues]);

  // Handle Dynamic Bottom Bar visibility on mobile
  useEffect(() => {
    if (!isMobile) return;

    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (bottomBar) {
      if (isOpen) {
        // Store original display if needed, but usually flex or block
        bottomBar.style.display = 'none';
      } else {
        bottomBar.style.display = '';
      }
    }

    return () => {
      if (bottomBar) {
        bottomBar.style.display = '';
      }
    };
  }, [isOpen, isMobile]);

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
    const { key, type, label, options, min, max, step, dependsOn } = filter;
    const currentValue = filters[key];

    // Smart Conditional Logic
    if (dependsOn) {
      const dependencyValue = filters[dependsOn.key];
      // Dependency is NOT met if:
      // 1. Dependency value is empty/null
      if (!dependencyValue || (Array.isArray(dependencyValue) && dependencyValue.length === 0)) {
        return null;
      }
      // 2. Dependency value (array) does NOT include the required value
      if (Array.isArray(dependencyValue) && !dependencyValue.includes(dependsOn.value)) {
        return null;
      }
      // 3. Dependency value (single) does NOT match required value
      if (!Array.isArray(dependencyValue) && dependencyValue !== dependsOn.value) {
        return null;
      }
    }

    switch (type) {
      case 'text':
        return (
          <div key={key} className="hidden lg:block space-y-3 px-3 py-3 rounded-lg hover:bg-white/3 transition-colors">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                value={currentValue || ''}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                placeholder={filter.placeholder || `Search ${label.toLowerCase()}...`}
                className="w-full pl-9 pr-8 py-2 border-0 rounded-lg bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary/20 text-sm"
              />
              {currentValue && (
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        );

      case 'multiselect':
        return (
          <div key={key} className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3">{label}</p>
            <div className="space-y-2">
              {(options || []).map(option => (
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
                  <Label htmlFor={`${key}-${option.value}`} className="text-sm font-normal cursor-pointer">
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
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
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
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-3">{label}</p>
            <div className="space-y-2">
              {(options || []).map(option => (
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
                  <Label htmlFor={`${key}-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'date':
        return (
          <div key={key} className="space-y-3 px-3 py-3 rounded-lg hover:bg-white/3 transition-colors">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Start Date</Label>
                <input
                  type="date"
                  value={currentValue?.start || ''}
                  onChange={(e) => handleFilterChange(key, { ...currentValue, start: e.target.value })}
                  className="w-full px-3 py-2.5 border-0 rounded-xl bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary/20 text-sm appearance-none min-h-[44px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">End Date</Label>
                <input
                  type="date"
                  value={currentValue?.end || ''}
                  onChange={(e) => handleFilterChange(key, { ...currentValue, end: e.target.value })}
                  className="w-full px-3 py-2.5 border-0 rounded-xl bg-black/5 dark:bg-white/5 focus:outline-none focus:ring-1 focus:ring-primary/20 text-sm appearance-none min-h-[44px]"
                />
              </div>

              {/* Smart Date Presets */}
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  { label: 'Today', days: 0 },
                  { label: '7 Days', days: 7 },
                  { label: '30 Days', days: 30 }
                ].map(preset => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    className="h-8 text-[11px] bg-black/5 dark:bg-white/5 font-medium rounded-lg hover:bg-primary hover:text-primary-foreground transition-all border-none"
                    onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(start.getDate() - preset.days);
                      handleFilterChange(key, {
                        start: start.toISOString().split('T')[0],
                        end: end.toISOString().split('T')[0]
                      });
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
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
            className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[2px]"
          />

          <motion.div
            initial={isMobile ? { y: '100%' } : { y: -20, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%' } : { y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={isMobile
              ? "fixed bottom-0 left-0 right-0 z-[70]"
              : "fixed top-16 left-4 right-4 z-[70] mx-auto max-w-2xl"
            }
          >
            <div className={`bg-background/40 backdrop-blur-md shadow-2xl px-2 md:px-6 py-6 ${isMobile ? 'rounded-t-[48px] pb-8' : 'squircle-xl'}`}>

              {/* Mobile Drag Handle */}
              {isMobile && (
                <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
              )}
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest">
                    {isMobile ? 'Filters' : 'Filters'}
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
                {filterSchema.map((filter, idx) => {
                  const content = renderFilterControl(filter);
                  return (
                    <AnimatePresence key={filter.key} mode='popLayout'>
                      {content && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className="overflow-hidden"
                        >
                          {content}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  );
                })}
              </motion.div>

              {/* Footer - Separated by spacing */}
              <div className="flex gap-3 mt-8 pt-6">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 squircle-lg bg-black/5 dark:bg-white/5 hover:bg-white/10 border-none"
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
