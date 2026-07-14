import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MobileErrorBoundary } from './MobileErrorBoundary';
import { mobileMotion } from './mobileMotion';
import { useNavigation } from '../../contexts/NavigationContext';

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
    tabletLayout = 'readable',
    tabletPane = null,
    tabletVerticalAlign = 'start',
}) => {
    const { isTablet, isWideTablet } = useNavigation();
    const reduceMotion = useReducedMotion();
    const hasTabletPane = Boolean(isTablet && tabletPane);
    const resolvedTabletLayout = hasTabletPane ? 'split' : tabletLayout;
    const tabletWidthClass = {
        readable: 'max-w-lg',
        wide: 'max-w-5xl',
        full: 'max-w-none',
    }[tabletLayout] || 'max-w-lg';
    const tabletContainerClass = isTablet && !hasTabletPane
        ? `mx-auto w-full ${tabletWidthClass}`
        : '';
    const tabletAvailableHeightClass = isWideTablet
        ? 'min-h-[calc(100dvh-5rem)]'
        : 'min-h-[calc(100dvh-10rem-var(--safe-bottom))]';
    const shellHeightClass = isTablet ? tabletAvailableHeightClass : 'min-h-screen';
    const kpiContainerClass = isTablet && !hasTabletPane
        ? `sticky top-0 z-40 ${tabletContainerClass}`
        : 'contents';
    const tabletBottomClass = isTablet ? '!pb-8' : '';
    const tabletContentHeightClass = isTablet
        ? tabletVerticalAlign === 'center'
            ? isWideTablet
                ? '!min-h-[calc(100dvh-5rem)]'
                : '!min-h-[calc(100dvh-10rem-var(--safe-bottom))]'
            : '!min-h-0'
        : '';
    const tabletVerticalClass = isTablet && tabletVerticalAlign === 'center'
        ? 'flex flex-col justify-center'
        : '';
    const pageLoadMotion = reduceMotion
        ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
        : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.2, ease: mobileMotion.reveal.ease }
        };

    const pageSlots = (
        <>
            <div data-mobile-page-kpis className={kpiContainerClass}>{kpiStrip}</div>
            <div
                data-mobile-page-content
                className={`text-[13px] ${tabletContainerClass} ${contentClassName} ${tabletBottomClass} ${tabletContentHeightClass} ${tabletVerticalClass}`}
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
                            className={tabletVerticalClass ? 'w-full' : undefined}
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
            className={`flex flex-col no-scrollbar ${shellHeightClass}`}
            data-compact-size={isTablet ? 'tablet' : 'phone'}
            data-tablet-layout={isTablet ? resolvedTabletLayout : undefined}
            data-tablet-navigation={isWideTablet ? 'rail' : isTablet ? 'dock' : undefined}
            data-content-origin={tabletVerticalAlign === 'center' && isTablet ? 'center' : 'top-leading'}
        >
            {hasTabletPane ? (
                <div
                    data-tablet-split-shell
                    className={`mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,32rem)_minmax(320px,1fr)] items-start gap-4 px-4 pb-8 pt-4 ${tabletAvailableHeightClass}`}
                >
                    <div data-tablet-primary-pane className="min-w-0">
                        {pageSlots}
                    </div>
                    <div
                        data-tablet-detail-pane
                        data-scroll-owner="independent"
                        className="sticky top-4 max-h-[calc(100dvh-2rem)] min-h-0 min-w-0 self-start overflow-y-auto overscroll-contain no-scrollbar"
                    >
                        <MobileErrorBoundary>{tabletPane}</MobileErrorBoundary>
                    </div>
                </div>
            ) : pageSlots}
        </div>
    );
};
