import React, { useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

/**
 * ModalShell — shared wrapper for all entity modals.
 *
 * Handles:
 *  - AnimatePresence + enter/exit animation (spring, scale+y)
 *  - Backdrop (blur, click-to-close)
 *  - ARIA: role="dialog" aria-modal="true" aria-labelledby
 *  - Mobile bottom-bar suppression (#dynamic-bottom-bar)
 *  - Safe-area-aware vertical padding
 *
 * Usage:
 *   <ModalShell isOpen={isOpen} onClose={onClose} size="xl" title="Doctor Profile" icon={<Stethoscope />}>
 *     <div>...your content...</div>
 *   </ModalShell>
 *
 * Props:
 *   isOpen        {boolean}        Controls AnimatePresence visibility
 *   onClose       {function}       Called when backdrop is clicked or close button pressed
 *   title         {string}         Visible heading (used as aria-labelledby target)
 *   subtitle      {string}         Optional subtitle below the title
 *   icon          {ReactNode}      Optional icon element rendered left of title
 *   badge         {ReactNode}      Optional badge rendered right of title (before close)
 *   actions       {ReactNode}      Optional extra controls in the header right zone
 *   footer        {ReactNode}      Optional sticky footer (save/cancel buttons)
 *   size          {'sm'|'md'|'lg'|'xl'|'2xl'}  max-width preset (default 'xl')
 *   className     {string}         Extra classes on the container motion.div
 *   hideClose     {boolean}        Suppress the default close button
 *   managed       {boolean}        When true, children manage their own scroll/layout.
 *                                  Use for complex modals with form + internal scroll area.
 *                                  When false (default), children are wrapped in overflow-y-auto.
 *   children      {ReactNode}      Body content (or full layout when managed=true)
 */
export const ModalShell = ({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    badge,
    actions,
    footer,
    size = 'xl',
    className = '',
    hideClose = false,
    managed = false,
    children,
}) => {
    const labelId = useId();

    // Suppress mobile bottom bar while modal is open
    useEffect(() => {
        const bottomBar = document.getElementById('dynamic-bottom-bar');
        if (!bottomBar) return;
        const prev = bottomBar.style.display;
        if (isOpen) bottomBar.style.display = 'none';
        return () => { bottomBar.style.display = prev; };
    }, [isOpen]);

    const maxWidthClass = {
        sm:  'max-w-sm',
        md:  'max-w-md',
        lg:  'max-w-2xl',
        xl:  'max-w-5xl',
        '2xl': 'max-w-7xl',
    }[size] ?? 'max-w-5xl';

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
                    style={{
                        paddingTop:    'max(12px, var(--safe-top, 0px))',
                        paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))',
                    }}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/30 backdrop-blur-md"
                        onClick={() => onClose()}
                    />

                    {/* Container */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? labelId : undefined}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={`relative z-10 w-full ${maxWidthClass} overflow-hidden rounded-modal shadow-2xl flex flex-col bg-background ${className}`}
                        style={{
                            maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)',
                        }}
                    >
                        {/* Header */}
                        {(title || icon || badge || actions || !hideClose) && (
                            <div className="flex items-center justify-between p-4 md:p-6 pb-3 md:pb-4 shrink-0">
                                {/* Left: icon + title/subtitle */}
                                <div className="flex items-center gap-3 min-w-0">
                                    {icon && (
                                        <div className="p-2 md:p-2.5 bg-primary/10 rounded-icon shrink-0">
                                            {icon}
                                        </div>
                                    )}
                                    {title && (
                                        <div className="min-w-0">
                                            <h2
                                                id={labelId}
                                                className="text-base md:text-xl font-semibold tracking-tight text-foreground/90 truncate"
                                            >
                                                {title}
                                            </h2>
                                            {subtitle && (
                                                <p className="text-xs md:text-sm text-muted-foreground truncate">
                                                    {subtitle}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right: badge + extra actions + close */}
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                    {badge}
                                    {actions}
                                    {!hideClose && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => onClose()}
                                            className="h-9 w-9 rounded-full bg-muted/50 hover:bg-muted transition-colors p-0"
                                            aria-label="Close"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Body — simple scroll (default) or managed layout */}
                        {managed ? (
                            // Managed: children control their own scroll/form/footer layout
                            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                                {children}
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
                                    {children}
                                </div>
                                {/* Optional sticky footer */}
                                {footer && (
                                    <div className="shrink-0 border-t border-border/50 p-4 md:p-6 pt-3 md:pt-4">
                                        {footer}
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ModalShell;
