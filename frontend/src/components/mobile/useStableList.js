import { useEffect, useRef, useState } from 'react';

export const useStableList = (items = [], loading = false) => {
    const [displayItems, setDisplayItems] = useState(items);
    const prevItemsRef = useRef(items);

    useEffect(() => {
        if (loading) return;
        if (prevItemsRef.current !== items) {
            prevItemsRef.current = items;
            setDisplayItems(items);
        }
    }, [items, loading]);

    return {
        displayItems,
        isBuffering: Boolean(loading)
    };
};
