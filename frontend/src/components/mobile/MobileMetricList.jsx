import React, { useState } from 'react';
import { ChevronRight, Check, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MobileSectionHeader
 * Minimal authority header for mobile sections
 */
export const MobileSectionHeader = ({ label, color = 'hsl(var(--primary))', count, onSelectAll, isAllSelected }) => (
    <div className="px-1 pt-6 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full opacity-50" style={{ backgroundColor: color }} />
            <h5 className="text-[10px] font-normal uppercase tracking-[0.2em] text-muted-foreground/60">
                {label}
            </h5>
        </div>
        <div className="flex items-center gap-2">
            {onSelectAll && (
                <button
                    onClick={onSelectAll}
                    className="w-10 h-10 flex items-center justify-center rounded-2xl apple-glass-heavy border-0 active:scale-90 transition-all text-primary/60 hover:text-primary"
                    aria-label={isAllSelected ? 'Deselect All' : 'Select All'}
                >
                    {isAllSelected ? (
                        <CheckSquare size={18} className="text-primary" />
                    ) : (
                        <Square size={18} className="text-primary/30" />
                    )}
                </button>
            )}
            {count !== undefined && (
                <span className="text-[10px] font-medium text-muted-foreground/40 bg-white/5 px-2 py-1 rounded-lg">
                    {count}
                </span>
            )}
        </div>
    </div>
);

/**
 * MobileMetricRow
 * Single row for a metric or navigation item on mobile
 * Canon #3: Reveal Gradually
 * Canon #28: Feels Touchable
 */
export const MobileMetricRow = ({
    icon: Icon,
    label,
    value,
    statusIndicators = [], // Array of { icon, color, label }
    onClick,
    color = 'hsl(var(--primary))',
    description,
    expandedContent,
    isExpanded,
    onExpand,
    itemId,
    isSelected,
    onSelect,
    selectionMode
}) => {
    const handleInteraction = (e) => {
        if (selectionMode && onSelect) {
            onSelect(itemId);
        } else if (expandedContent) {
            onExpand?.(itemId);
        } else if (onClick) {
            onClick(e);
        }
    };

    const handleLongPress = (e) => {
        if (onSelect) {
            e.preventDefault();
            onSelect(itemId);
        }
    };

    return (
        <motion.div
            layout
            initial={false}
            className="w-full flex flex-col mb-2 last:mb-0"
        >
            <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={handleInteraction}
                onContextMenu={handleLongPress}
                className={`w-full flex items-center gap-3 p-3 apple-glass-heavy border-0 rounded-2xl relative overflow-hidden group transition-colors ${isSelected ? 'bg-primary/10 ring-1 ring-primary/20' : isExpanded ? 'bg-muted/80' : 'bg-muted/50 active:bg-muted/70'
                    }`}
            >
                {/* 2px Left Accent - The only differentiator */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[2px] opacity-60"
                    style={{ backgroundColor: color }}
                />

                <div
                    className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 relative z-10 shadow-md transition-all duration-300 ${isSelected ? 'scale-110' : ''}`}
                    style={{
                        background: `radial-gradient(circle at 30% 30%, ${color.replace(/\)$/, ' / 0.2)')}, ${color.replace(/\)$/, ' / 0.1)')})`,
                        boxShadow: isSelected ? `0 0 15px ${color.replace(/\)$/, ' / 0.4)')}` : 'none',
                        border: isSelected ? `1.5px solid ${color}` : 'none'
                    }}
                >
                    {Icon && <Icon size={16} className="opacity-95" style={{ color }} />}

                    <AnimatePresence>
                        {isSelected && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-background z-20"
                            >
                                <Check size={10} className="text-white stroke-[4px]" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-[8px] font-thin uppercase tracking-[0.15em] mb-0.5 truncate text-muted-foreground/80">
                        {label}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-normal tracking-tight text-foreground/95 truncate">{value}</span>
                        <div className="flex items-center gap-2 ml-auto">
                            {statusIndicators.map((indicator, idx) => (
                                <div
                                    key={idx}
                                    title={indicator.label}
                                    className="flex items-center justify-center transition-all"
                                >
                                    {indicator.icon && <indicator.icon size={16} style={{ color: indicator.color || 'white' }} className="opacity-95" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {(onClick || expandedContent) && (
                    <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        className="opacity-20 group-active:opacity-40"
                    >
                        <ChevronRight size={14} />
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{
                            height: { type: 'spring', stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        className="bg-primary/[0.04] overflow-hidden rounded-b-2xl -mt-2 pt-2"
                    >
                        <div className="p-3 pt-4 text-[11px] text-muted-foreground/80 tracking-tight leading-relaxed font-normal">
                            {expandedContent}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
