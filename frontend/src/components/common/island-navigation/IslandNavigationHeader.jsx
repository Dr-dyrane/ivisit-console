import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const IslandNavigationHeader = ({ isBroad, isNotHome, onBack }) => (
  <div className="h-[63px] flex-shrink-0 flex items-center px-4">
    <div className="relative flex items-center w-full">
      <AnimatePresence mode="wait">
        {isNotHome ? (
          <motion.button
            key="back"
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            onClick={onBack}
            className="w-10 h-10 rounded-button bg-muted/50 flex items-center justify-center text-foreground hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
        ) : (
          <motion.div
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-icon bg-primary/10 flex items-center justify-center flex-shrink-0">
              <img src="/logo.png" alt="logo" className="w-5 h-5 object-contain" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isBroad && isNotHome && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ml-3 text-xs font-semibold text-muted-foreground">
          Go Back
        </motion.span>
      )}

      {isBroad && !isNotHome && (
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="ml-3 flex flex-col leading-none">
          <span className="text-2xl font-bold tracking-tighter">
            iVisit<span className="text-primary text-base">.</span>{' '}
            <span className="text-primary text-sm font-normal italic uppercase">Console</span>
          </span>
        </motion.div>
      )}
    </div>
  </div>
);
