import React from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

export const BulkActionBar = ({ selectedCount, onClear, children }) => {
    return (
        <LayoutGroup>
            <AnimatePresence>
                {selectedCount > 0 && (
                    <motion.div
                        initial={{ x: 50, opacity: 0, scale: 0.9 }}
                        animate={{ x: 0, opacity: 1, scale: 1 }}
                        exit={{ x: 50, opacity: 0, scale: 0.9 }}
                        className="fixed top-1/2 -translate-y-1/2 right-6 z-50 flex flex-col items-center gap-3 p-2 bg-background/15 backdrop-blur-sm shadow-none rounded-pill"
                    >
                        <div className="bg-primary text-primary-foreground text-[10px] font-bold h-6 min-w-[24px] px-1.5 rounded-pill flex items-center justify-center shadow-sm mb-1">
                            {selectedCount}
                        </div>

                        {children}

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClear}
                            className="h-8 w-8 rounded-pill hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                            title="Clear Selection"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </LayoutGroup>
    );
};
