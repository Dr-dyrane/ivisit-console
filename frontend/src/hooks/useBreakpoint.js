import { useState, useEffect } from 'react';

/**
 * Custom hook to detect viewport breakpoints
 * Based on Tailwind's default configuration and ivisit-console's specific needs
 * sm: 640px
 * md: 768px
 * lg: 1024px
 * xl: 1280px
 * 2xl: 1536px
 */
export const useBreakpoint = () => {
    const [breakpoint, setBreakpoint] = useState({
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        width: typeof window !== 'undefined' ? window.innerWidth : 0
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleResize = () => {
            const width = window.innerWidth;
            setBreakpoint({
                isMobile: width < 768, // md breakpoint
                isTablet: width >= 768 && width < 1024,
                isDesktop: width >= 1024,
                width
            });
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return breakpoint;
};
