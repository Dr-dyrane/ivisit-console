import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MobileErrorBoundary } from './MobileErrorBoundary';
import { mobileMotion } from './mobileMotion';

/**
 * MobilePageShell
 * Shared structural shell for all mobile pages:
 * - sticky KPI strip slot
 * - unified content padding/rhythm
 */
export const MobilePageShell = ({
    kpiStrip,
    children,
    contentClassName = 'pt-4 pb-4 text-foreground',
    animatePageLoad = true,
}) => {
    const reduceMotion = useReducedMotion();
    const pageLoadMotion = reduceMotion
        ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.2, ease: mobileMotion.reveal.ease }
        };

    const pageSlots = (
        <>
            <div data-mobile-page-kpis className="contents">{kpiStrip}</div>
            <div
                data-mobile-page-content
                className={`text-[13px] ${contentClassName}`}
            >
                <MobileErrorBoundary>
                    {animatePageLoad ? (
                        <motion.div
                            initial={pageLoadMotion.initial}
                            animate={pageLoadMotion.animate}
                            transition={pageLoadMotion.transition}
                            style={{
                                //  willChange: reduceMotion ? 'auto' : 'opacity, transform',
                                // transformOrigin: '50% 12%'
                            }}
                        >
                            {children}
                        </motion.div>
                    ) : children}
                </MobileErrorBoundary>
            </div>
        </>
    );

    return (
        <div
            className="flex min-h-screen flex-col no-scrollbar"
            data-compact-size="phone"
        >
            {pageSlots}
        </div>
    );
};
