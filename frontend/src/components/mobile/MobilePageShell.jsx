import React from 'react';

/**
 * MobilePageShell
 * Shared structural shell for all mobile pages:
 * - sticky KPI strip slot
 * - unified content padding/rhythm
 */
export const MobilePageShell = ({
    kpiStrip,
    children,
    contentClassName = 'px-2 pt-4 pb-4 text-foreground'
}) => {
    return (
        <div className="flex flex-col min-h-screen no-scrollbar">
            {kpiStrip}
            <div className={contentClassName}>
                {children}
            </div>
        </div>
    );
};

