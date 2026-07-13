import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../ui/tooltip';

export const IslandNavigationItem = ({
  isBroad,
  isCentered = false,
  isSubItem = false,
  item,
  onNavigate,
  pathname,
}) => {
  const isActive = pathname === item.path;
  const buttonContent = (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`flex items-center h-10 rounded-button transition-all duration-300 relative overflow-hidden group ${isCentered ? 'w-10 justify-center' : `w-full ${isSubItem ? 'pl-9' : 'px-3'}`}`}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
      data-desktop-nav-item={item.id}
      data-state={isActive ? 'active' : 'idle'}
    >
      <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'text-[hsl(var(--spark)/0.92)] scale-110' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'}`} />
      {isBroad && !isCentered && (
        <AnimatePresence>
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="ml-3 text-sm font-normal truncate transition-colors duration-300"
            style={{ color: isActive ? 'hsl(var(--spark))' : 'hsl(var(--muted-foreground))' }}
          >
            {item.label}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  );

  return (
    <div className={`relative flex items-center ${isCentered ? 'justify-center' : 'w-full'} px-3`}>
      {isActive && !isCentered && (
        <motion.div
          layoutId="activeRail"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[hsl(var(--spark)/0.75)] rounded-pill"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        />
      )}

      {!isBroad ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonContent}
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={20} className="bg-foreground/35 backdrop-blur-md text-background rounded-pill px-4 py-2 font-bold tracking-wide shadow-xl">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : buttonContent}
    </div>
  );
};
