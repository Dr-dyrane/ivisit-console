import React from 'react';
import { MobileErrorBoundary } from './MobileErrorBoundary';

/**
 * MobilePageShell
 * Shared structural shell for all mobile pages:
 * - sticky KPI strip slot
 * - unified content padding/rhythm
 */
export const MobilePageShell = ({
    kpiStrip,
    children,
    contentClassName = 'pt-4 pb-4 text-foreground'
}) => {
    return (
        <div className="flex flex-col min-h-screen no-scrollbar">
            {kpiStrip}
            <div className={`px-1 text-[13px] ${contentClassName}`}>
                <MobileErrorBoundary>
                    {children}
                </MobileErrorBoundary>
            </div>
        </div>
    );
};
