import { useEffect, useRef, useState } from 'react';

export const useScrollCooldown = (cooldownMs = 180) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimerRef = useRef(null);

    useEffect(() => () => {
        if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
        }
    }, []);

    const handleScrollActivity = () => {
        setIsScrolling(true);
        if (scrollTimerRef.current) {
            clearTimeout(scrollTimerRef.current);
        }
        scrollTimerRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, cooldownMs);
    };

    return {
        isScrolling,
        bind: {
            onScroll: handleScrollActivity,
            onTouchMove: handleScrollActivity
        }
    };
};
