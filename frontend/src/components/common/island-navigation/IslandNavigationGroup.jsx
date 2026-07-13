import React from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';
import { IslandNavigationItem } from './IslandNavigationItem';

export const IslandNavigationGroup = ({
  groupConfig,
  isBroad,
  onNavigate,
  onToggle,
  openGroups,
  pathname,
}) => {
  if (!groupConfig) return null;

  const { id, label, icon: GroupIcon, items } = groupConfig;
  const isOpen = openGroups.includes(id);
  const isAnyChildActive = items.some((item) => item.path === pathname);

  if (!isBroad) {
    return (
      <div className="w-full space-y-1">
        <div className="flex justify-center px-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onToggle(id)}
                aria-expanded={isOpen}
                data-desktop-nav-group={id}
                className={`w-10 h-10 rounded-button transition-colors flex items-center justify-center ${isAnyChildActive ? 'bg-[hsl(var(--spark)/0.12)] text-[hsl(var(--spark)/0.92)] font-medium' : 'text-muted-foreground/60 hover:bg-muted/50 hover:text-foreground'}`}
                aria-label={`Toggle ${label} group`}
              >
                <GroupIcon className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background rounded-pill px-4 py-2 font-bold tracking-wide shadow-xl">
              {label}
            </TooltipContent>
          </Tooltip>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-1"
            >
              <div className="flex justify-center mb-1">
                <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
              </div>
              {items.map((item) => (
                <IslandNavigationItem
                  key={item.id}
                  isBroad={isBroad}
                  isCentered
                  item={item}
                  onNavigate={onNavigate}
                  pathname={pathname}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      <div className="px-3">
        <button
          type="button"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Hide' : 'Show'} ${label}`}
          data-desktop-nav-group={id}
          className={`w-full flex items-center h-10 px-3 rounded-button transition-colors ${isAnyChildActive && !isOpen ? 'bg-[hsl(var(--spark)/0.12)] text-[hsl(var(--spark)/0.92)] font-medium' : 'text-muted-foreground/60 hover:text-foreground'}`}
        >
          <GroupIcon className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence>
            {isBroad && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-[11px] font-bold uppercase tracking-widest flex-1 text-left">
                {label}
              </motion.span>
            )}
          </AnimatePresence>
          <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? '' : '-rotate-90'}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-1"
          >
            {items.map((item) => (
              <IslandNavigationItem
                key={item.id}
                isBroad={isBroad}
                isSubItem
                item={item}
                onNavigate={onNavigate}
                pathname={pathname}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
