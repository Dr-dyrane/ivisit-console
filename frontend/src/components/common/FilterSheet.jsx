import { useState, useEffect, useId, useRef } from 'react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Badge } from '../ui/badge';
import { X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const filterInputClassName = 'w-full rounded-button bg-black/5 px-3 py-2.5 text-sm shadow-[0_12px_28px_rgb(0_0_0/0.05)] transition-[background,box-shadow] focus:bg-background/80 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)] dark:bg-white/5 dark:focus:bg-white/[0.08]';
const filterBackdropTransition = { duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] };
const filterSheetTransition = { duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] };

export const FilterSheet = ({
  isOpen,
  onOpenChange,
  filterSchema = [],
  onApply,
  initialValues = {},
  resetValues = null,
  resetLabel = 'Reset',
  title = 'Filters',
  description = 'Adjust this view, then apply the filters.',
  viewToggle = null,
  isMobile = false
}) => {
  const [filters, setFilters] = useState(initialValues);
  const prevInitialValuesRef = useRef();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (JSON.stringify(initialValues) !== JSON.stringify(prevInitialValuesRef.current)) {
      setFilters(initialValues);
      prevInitialValuesRef.current = initialValues;
    }
  }, [initialValues]);

  useEffect(() => {
    if (!isMobile) return;

    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (bottomBar) {
      if (isOpen) {
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

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onOpenChange]);

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
    setFilters(resetValues || initialValues);
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
          <div key={key} className="hidden lg:block space-y-3 px-3 py-3 rounded-inner hover:bg-white/3 transition-colors">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
              <input
                type="text"
                value={currentValue || ''}
                onChange={(e) => handleFilterChange(key, e.target.value)}
                placeholder={filter.placeholder || `Search ${label.toLowerCase()}...`}
                className={`${filterInputClassName} pl-9 pr-8 py-2`}
              />
              {currentValue && (
                <button
                  type="button"
                  aria-label={`Clear ${label}`}
                  onClick={() => handleFilterChange(key, '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-pill hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
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
                <div key={option.value} className="flex items-center gap-3 px-3 py-2.5 rounded-inner hover:bg-white/5 transition-colors cursor-pointer">
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
          <div key={key} className="space-y-3 px-3 py-3 rounded-inner hover:bg-white/3 transition-colors">
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
                <div key={option.value} className="flex items-center gap-3 px-3 py-2.5 rounded-inner hover:bg-white/5 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    id={`${key}-${option.value}`}
                    name={key}
                    value={option.value}
                    checked={currentValue === option.value}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="w-5 h-5 rounded-pill accent-primary"
                  />
                  <Label htmlFor={`${key}-${option.value}`} className="text-sm font-normal cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'date': {
        const startDateId = `${key}-start-date`;
        const endDateId = `${key}-end-date`;

        return (
          <div key={key} className="space-y-3 px-3 py-3 rounded-inner hover:bg-white/3 transition-colors">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={startDateId} className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Start date</Label>
                <input
                  id={startDateId}
                  type="date"
                  value={currentValue?.start || ''}
                  onChange={(e) => handleFilterChange(key, { ...currentValue, start: e.target.value })}
                  className={`${filterInputClassName} appearance-none min-h-[44px]`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={endDateId} className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">End date</Label>
                <input
                  id={endDateId}
                  type="date"
                  value={currentValue?.end || ''}
                  onChange={(e) => handleFilterChange(key, { ...currentValue, end: e.target.value })}
                  className={`${filterInputClassName} appearance-none min-h-[44px]`}
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
                    type="button"
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] bg-black/5 dark:bg-white/5 font-medium rounded-button hover:bg-foreground hover:text-background dark:hover:bg-white dark:hover:text-black transition-all"
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
      }

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <motion.div
        key="filter-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={filterBackdropTransition}
        onClick={() => onOpenChange(false)}
        className="fixed inset-0 z-[60] bg-black/10 backdrop-blur-[2px]"
      />

      <motion.div
        key="filter-sheet-shell"
        initial={isMobile ? { y: '100%' } : { y: -20, opacity: 0 }}
        animate={isMobile ? { y: 0 } : { y: 0, opacity: 1 }}
        transition={filterSheetTransition}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-filter-sheet-shell="true"
        data-testid={isMobile ? 'mobile-filter-sheet' : 'filter-sheet'}
        className={isMobile
          ? "fixed bottom-0 left-0 right-0 z-[70]"
          : "fixed top-16 left-4 right-4 z-[70] mx-auto max-w-2xl"
        }
      >
        <div className={`bg-background/40 backdrop-blur-md shadow-2xl px-2 md:px-6 py-6 ${isMobile ? 'rounded-t-sheet pb-8' : 'rounded-card'}`}>

              {/* Mobile Drag Handle */}
              {isMobile && (
                <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-pill mx-auto mb-6 shrink-0" />
              )}
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 id={titleId} className="text-sm font-bold uppercase tracking-widest">
                    {title}
                  </h2>
                  <p id={descriptionId} className="sr-only">{description}</p>
                </div>
                <div className="flex items-center gap-1">
                  {isMobile && viewToggle && (
                    <div className="flex-shrink-0 pr-3">
                      {viewToggle}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    aria-label="Close filters"
                    className="p-2 hover:bg-white/5 rounded-pill transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filters */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={isMobile
                  ? "space-y-6 max-h-[58dvh] overflow-y-auto scrollbar-hide pb-2"
                  : "grid max-h-[min(68dvh,620px)] grid-cols-2 items-start gap-5 overflow-y-auto scrollbar-hide pb-2"
                }
              >
                {filterSchema.map((filter) => {
                  const content = renderFilterControl(filter);
                  return (
                    <AnimatePresence key={filter.key} mode='popLayout'>
                      {content && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, scale: 0.95 }}
                          animate={{ opacity: 1, height: 'auto', scale: 1 }}
                          exit={{ opacity: 0, height: 0, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          className={filter.type === 'text' ? "col-span-2 overflow-hidden" : "overflow-hidden"}
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
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  className="flex-1 rounded-button bg-black/5 dark:bg-white/5 hover:bg-white/10"
                >
                  {resetLabel}
                </Button>
                <Button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 rounded-button bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                >
                  Apply
                </Button>
              </div>
        </div>
      </motion.div>
    </>
  );
};
