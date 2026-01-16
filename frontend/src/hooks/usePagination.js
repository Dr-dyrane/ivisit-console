import { useState, useCallback, useMemo } from 'react';

/**
 * Reusable pagination hook for Supabase queries
 * @param {number} itemsPerPage - Number of items to display per page (default: 20)
 * @returns {Object} Pagination state and controls
 */
export const usePagination = (itemsPerPage = 20) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Calculate total pages
    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(totalCount / itemsPerPage));
    }, [totalCount, itemsPerPage]);

    // Calculate Supabase range (0-indexed)
    const paginationRange = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage - 1;
        return { start, end };
    }, [currentPage, itemsPerPage]);

    // Wrap setTotalCount in useCallback to ensure stable reference
    const setTotalCountStable = useCallback((count) => {
        setTotalCount(count);
    }, []);

    // Navigation functions
    const goToPage = useCallback((page) => {
        const validPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(validPage);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        setCurrentPage(prev => {
            if (prev < totalPages) return prev + 1;
            return prev;
        });
    }, [totalPages]);

    const prevPage = useCallback(() => {
        setCurrentPage(prev => {
            if (prev > 1) return prev - 1;
            return prev;
        });
    }, []);

    const resetPagination = useCallback(() => {
        setCurrentPage(1);
    }, []);

    // Memoize the return object to ensure stable reference
    return useMemo(() => ({
        currentPage,
        totalPages,
        totalCount,
        itemsPerPage,
        paginationRange,
        setTotalCount: setTotalCountStable,
        goToPage,
        nextPage,
        prevPage,
        resetPagination,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
    }), [currentPage, totalPages, totalCount, itemsPerPage, paginationRange, setTotalCountStable, goToPage, nextPage, prevPage, resetPagination]);
};
