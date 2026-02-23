import { useCallback, useEffect, useState } from 'react';

export const useLoadMoreControl = ({ hasMore, loading, onLoadMore }) => {
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        if (!hasMore) {
            setArmed(false);
        }
    }, [hasMore]);

    const requestLoad = useCallback(() => {
        if (!hasMore || loading) return;
        setArmed(true);
    }, [hasMore, loading]);

    const triggerLoad = useCallback(() => {
        if (!hasMore || loading || !armed) return;
        setArmed(false);
        onLoadMore?.();
    }, [hasMore, loading, armed, onLoadMore]);

    return { armed, requestLoad, triggerLoad };
};
