import { useState, useEffect } from 'react';
import { getViewportState } from '../config/breakpoints';

/**
 * Custom hook to detect viewport breakpoints
 * Composition is compact below 1280px. Phone and tablet remain available as
 * sizing signals, while isMobile temporarily aliases the compact composition.
 */
export const useBreakpoint = () => {
    const [breakpoint, setBreakpoint] = useState(() => getViewportState(
        typeof window === 'undefined' ? null : window.innerWidth
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            setBreakpoint(getViewportState(window.innerWidth));
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
};
