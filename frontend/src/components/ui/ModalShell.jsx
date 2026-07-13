import React, { useCallback, useEffect, useId, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './button';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const modalBackdropTransition = { duration: 0.18, ease: [0.21, 0.47, 0.32, 0.98] };
const modalShellTransition = { duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] };

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusable = (container) => {
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
    );
};

/**
 * useFocusTrap — keyboard-accessibility for hand-rolled dialogs.
 *
 * When `active`, it:
 *  - listens for Escape and invokes `onEscape` (the dialog's close handler),
 *  - traps Tab / Shift+Tab focus within `containerRef` (wrapping at the ends),
 *  - autofocuses the first focusable element (or the container itself),
 *  - restores focus to the previously-focused element on cleanup.
 *
 * No visual/DOM changes: the container just needs `tabIndex={-1}` so it can
 * receive focus when it holds no focusable children.
 */
export const useFocusTrap = (containerRef, active, onEscape) => {
    const restoreRef = useRef(null);

    const handleKeyDown = useCallback(
        (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                onEscape?.();
                return;
            }

            if (event.key !== 'Tab') return;

            const container = containerRef.current;
            if (!container) return;

            const focusable = getFocusable(container);
            if (focusable.length === 0) {
                event.preventDefault();
                container.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const activeEl = document.activeElement;

            if (event.shiftKey) {
                if (activeEl === first || !container.contains(activeEl)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (activeEl === last || !container.contains(activeEl)) {
                event.preventDefault();
                first.focus();
            }
        },
        [containerRef, onEscape],
    );

    useEffect(() => {
        if (!active || typeof document === 'undefined') return undefined;

        restoreRef.current = document.activeElement;

        const container = containerRef.current;
        // Autofocus after the container has mounted/painted.
        const raf = window.requestAnimationFrame(() => {
            const target = containerRef.current;
            if (!target) return;
            const focusable = getFocusable(target);
            (focusable[0] ?? target).focus();
        });

        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            window.cancelAnimationFrame(raf);
            document.removeEventListener('keydown', handleKeyDown, true);

            const toRestore = restoreRef.current;
            if (toRestore && typeof toRestore.focus === 'function' && document.contains(toRestore)) {
                toRestore.focus();
            }
            restoreRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, handleKeyDown]);
};

/**
 * ModalShell - shared wrapper for all entity modals.
 *
 * Handles:
 *  - Responsive presentation: centered dialog on desktop, bottom-anchored
 *    sheet on mobile (< 768px) with a grab handle and swipe-down-to-dismiss
 *  - Bounded opening motion (fade + scale/y on desktop, slide-up on mobile),
 *    reduced-motion aware (fade only)
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
 *   ariaLabel     {string}         Accessible dialog name when no title is passed
 *                                  (headerless sheets draw their own heading)
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
    ariaLabel,
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
    const containerRef = useRef(null);

    // Mobile (< 768px) gets a bottom-anchored sheet; desktop keeps the centered dialog.
    const { isMobile } = useBreakpoint();
    // Respect prefers-reduced-motion: fade only, no slide / scale.
    const reduceMotion = useReducedMotion();

    // Keyboard accessibility: Escape-to-close, focus trap, autofocus, focus restore.
    useFocusTrap(containerRef, isOpen, onClose);

    useEffect(() => {
        if (!isOpen || typeof window === 'undefined') return;
        window.dispatchEvent(new Event('modal-opened'));
    }, [isOpen]);

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

    // Desktop widths run one tier more generous than mobile-derived sizing so desktop
    // dialogs aren't cramped (the small/medium modals were the tight ones).
    const maxWidthClass = {
        sm:  'max-w-md',
        md:  'max-w-lg',
        lg:  'max-w-3xl',
        xl:  'max-w-5xl',
        '2xl': 'max-w-7xl',
    }[size] ?? 'max-w-5xl';

    if (!isOpen) return null;

    // --- Responsive presentation -------------------------------------------------
    // Desktop: centered dialog (unchanged) — fade + gentle scale/y settle.
    // Mobile:  bottom-anchored sheet — full-width, top-rounded, slide up from below.
    // Reduced motion: fade only in both cases (no slide / scale).
    const surfaceInitial = reduceMotion
        ? { opacity: 0 }
        : isMobile
            ? { opacity: 1, y: '100%' }
            : { opacity: 0, scale: 0.96, y: 16 };
    const surfaceAnimate = reduceMotion
        ? { opacity: 1 }
        : isMobile
            ? { opacity: 1, y: 0 }
            : { opacity: 1, scale: 1, y: 0 };
    // No exit animation: the shell has no framer presence wrapper, so it unmounts
    // via `if (!isOpen) return null` — exit props would be dead code.

    // Swipe-down-to-dismiss (mobile only): close once dragged past a threshold or
    // released with enough downward velocity. Desktop never receives drag props.
    const dragProps = (isMobile && !reduceMotion)
        ? {
            drag: 'y',
            dragConstraints: { top: 0, bottom: 0 },
            dragElastic: { top: 0, bottom: 0.6 },
            onDragEnd: (_event, info) => {
                if (info.offset.y > 120 || info.velocity.y > 700) {
                    onClose();
                }
            },
        }
        : {};

    return (
        <div
            className={`fixed inset-0 z-[420] flex ${isMobile ? 'items-end justify-center p-0' : 'items-center justify-center p-3 sm:p-4'}`}
            style={{
                paddingTop:    isMobile ? '0px' : 'max(12px, var(--safe-top, 0px))',
                paddingBottom: isMobile ? '0px' : 'max(12px, calc(var(--safe-bottom, 0px) + 12px))',
            }}
        >
            {/* Backdrop */}
            <motion.div
                key="modal-shell-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={modalBackdropTransition}
                className="absolute inset-0 bg-black/[0.46] backdrop-blur-sm"
                onClick={() => onClose()}
            />

            {/* Container */}
            <motion.div
                key="modal-shell-surface"
                ref={containerRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? labelId : undefined}
                aria-label={!title && ariaLabel ? ariaLabel : undefined}
                data-modal-shell="true"
                initial={surfaceInitial}
                animate={surfaceAnimate}
                transition={modalShellTransition}
                {...dragProps}
                className={`relative z-10 flex flex-col overflow-hidden bg-card/90 backdrop-blur-2xl backdrop-saturate-150 dark:bg-card/85 shadow-[0_12px_32px_rgb(0_0_0/0.10)] ${
                    isMobile
                        ? 'w-full rounded-t-sheet'
                        : `w-full ${maxWidthClass} rounded-modal`
                } ${className}`}
                style={{
                    outline: 'none',
                    // Apple-HIG safe-area cap (single value for sheet + dialog); keeps the
                    // surface clear of the top notch and the bottom home-indicator.
                    maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)',
                    // Keep the sheet body clear of the home-indicator / bottom safe inset.
                    paddingBottom: isMobile ? 'var(--safe-bottom, 0px)' : undefined,
                }}
            >
                {/* Mobile grab handle — visual affordance + swipe-to-dismiss target */}
                {isMobile && (
                    <div className="shrink-0 pt-2 pb-1">
                        <div className="mx-auto h-1.5 w-[42px] rounded-pill bg-foreground/20" />
                    </div>
                )}

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
                                    className="h-9 w-9 rounded-pill bg-muted/50 hover:bg-muted transition-colors p-0"
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
                            <div className="shrink-0 p-4 md:p-6 pt-3 md:pt-4">
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
