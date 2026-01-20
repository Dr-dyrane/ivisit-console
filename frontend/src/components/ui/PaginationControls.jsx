import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

/**
 * Reusable pagination controls component
 * @param {Object} props
 * @param {number} props.currentPage - Current page number (1-indexed)
 * @param {number} props.totalPages - Total number of pages
 * @param {number} props.totalCount - Total item count
 * @param {number} props.itemsPerPage - Items per page
 * @param {Function} props.onPrevPage - Previous page handler
 * @param {Function} props.onNextPage - Next page handler
 * @param {boolean} props.hasPrevPage - Whether previous page exists
 * @param {boolean} props.hasNextPage - Whether next page exists
 * @param {boolean} props.loading - Loading state
 */
export const PaginationControls = ({
    currentPage,
    totalPages,
    totalCount = 0,
    itemsPerPage = 20,
    onPrevPage,
    onNextPage,
    hasPrevPage,
    hasNextPage,
    loading = false,
}) => {
    // Keyboard navigation
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (loading) return;

            if (e.key === 'ArrowLeft' && hasPrevPage) {
                onPrevPage();
            } else if (e.key === 'ArrowRight' && hasNextPage) {
                onNextPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasPrevPage, hasNextPage, onPrevPage, onNextPage, loading]);

    if (totalPages <= 1 && totalCount < itemsPerPage) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center gap-4 mt-8"
        >
            {/* Previous Button */}
            <Button
                onClick={onPrevPage}
                disabled={!hasPrevPage || loading}
                className="bg-background/35 backdrop-blur-xs squircle h-10 px-4 text-xs font-bold tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-premium hover-lift"
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
            </Button>

            {/* Page Indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 backdrop-blur-xs border border-white/10 shadow-lg backdrop-blur-md">
                <span className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                    Page
                </span>
                <span className="text-sm font-bold text-foreground">
                    {currentPage}
                </span>
                <span className="text-xs text-muted-foreground">
                    of
                </span>
                <span className="text-sm font-bold text-foreground">
                    {totalPages}
                </span>
            </div>

            {/* Next Button */}
            <Button
                onClick={onNextPage}
                disabled={!hasNextPage || loading}
                className="bg-background/35 backdrop-blur-xs squircle h-10 px-4 text-xs font-bold tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed shadow-premium hover-lift"
                aria-label="Next page"
            >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
        </motion.div>
    );
};
