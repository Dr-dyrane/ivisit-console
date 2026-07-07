import React, { useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';

const modalBackdropTransition = { duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] };
const modalShellTransition = { duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] };

/**
 * ModalShell - shared wrapper for all entity modals.
 *
 * Handles:
 *  - Bounded opening motion (fade, scale+y)
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
 *   isOpen        {boolean}        Controls dialog visibility
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

    // Keep app chrome out of the visual stack while a dialog owns focus.
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return undefined;

        const chromeNodes = Array.from(document.querySelectorAll('[data-modal-chrome="true"], #dynamic-bottom-bar'));
        const previous = chromeNodes.map((node) => ({
            node,
            opacity: node.style.opacity,
            pointerEvents: node.style.pointerEvents,
            visibility: node.style.visibility,
            ariaHidden: node.getAttribute('aria-hidden'),
        }));

        chromeNodes.forEach((node) => {
            node.style.opacity = '0';
            node.style.pointerEvents = 'none';
            node.style.visibility = 'hidden';
            node.setAttribute('aria-hidden', 'true');
        });

        return () => {
            previous.forEach(({ node, opacity, pointerEvents, visibility, ariaHidden }) => {
                node.style.opacity = opacity;
                node.style.pointerEvents = pointerEvents;
                node.style.visibility = visibility;
                if (ariaHidden === null) {
                    node.removeAttribute('aria-hidden');
                } else {
                    node.setAttribute('aria-hidden', ariaHidden);
                }
            });
        };
    }, [isOpen]);

    const maxWidthClass = {
        sm:  'max-w-sm',
        md:  'max-w-md',
        lg:  'max-w-2xl',
        xl:  'max-w-5xl',
        '2xl': 'max-w-7xl',
    }[size] ?? 'max-w-5xl';

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[420] flex items-center justify-center p-3 sm:p-4"
            style={{
                paddingTop:    'max(12px, var(--safe-top, 0px))',
                paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))',
            }}
        >
            {/* Backdrop */}
            <motion.div
                key="modal-shell-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={modalBackdropTransition}
                className="absolute inset-0 bg-background/88 backdrop-blur-2xl dark:bg-black/80"
                onClick={() => onClose()}
            />

            {/* Container */}
            <motion.div
                key="modal-shell-surface"
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? labelId : undefined}
                data-modal-shell="true"
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={modalShellTransition}
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
                                        <p className="text-xs leading-snug text-muted-foreground whitespace-normal md:text-sm md:truncate">
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

                {/* Body - simple scroll (default) or managed layout */}
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
                            <div className="shrink-0 bg-foreground/[0.035] p-4 shadow-[inset_0_18px_32px_-30px_rgb(0_0_0/0.30)] dark:bg-white/[0.045] md:p-6 pt-3 md:pt-4">
                                {footer}
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default ModalShell;
