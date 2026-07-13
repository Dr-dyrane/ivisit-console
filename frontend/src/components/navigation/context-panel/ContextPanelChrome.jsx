import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Sparkles, X } from 'lucide-react';

export const ContextPanelAccessDenied = () => (
  <div className="p-0 md:p-6 scrollbar-hide">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-destructive/20 rounded-icon flex items-center justify-center mx-auto mb-6">
        <Lock className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="font-bold text-xl mb-2 text-foreground">No access</h3>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        You do not have access to this panel.
      </p>
      <div className="text-xs text-muted-foreground font-medium">
        Ask an admin if this should be available.
      </div>
    </motion.div>
  </div>
);

const ContextPanelHeader = ({ useMockData }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
    className="relative"
  >
    <div className="px-0 pt-4 pb-2 md:px-6">
      <div className="flex items-center justify-end gap-3">
        {!useMockData && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="h-2 w-2 rounded-pill bg-emerald-500"
            aria-hidden="true"
          />
        )}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('closeContextPanel'))}
          className="hidden h-9 w-9 items-center justify-center rounded-pill surface-card text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 md:flex"
          type="button"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  </motion.div>
);

export const ContextPanelFrame = ({ children, useMockData }) => (
  <div className="h-full flex flex-col rounded-card" data-context-panel-content="true">
    <div className="hidden md:block">
      <ContextPanelHeader useMockData={useMockData} />
    </div>
    <div className="flex-1 overflow-y-auto px-0 pb-6 md:px-4 md:pb-6">
      {children}
    </div>
  </div>
);

export const ContextPanelEmpty = () => (
  <div className="p-2 md:p-6 scrollbar-hide">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 bg-primary/20 rounded-icon flex items-center justify-center mx-auto mb-6">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h3 className="font-bold text-xl mb-2 text-foreground">Page help</h3>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
        Open a page to see related details and actions.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="flex items-center justify-center gap-2"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-normal text-primary uppercase tracking-wider">Ready</span>
      </motion.div>
    </motion.div>
  </div>
);
