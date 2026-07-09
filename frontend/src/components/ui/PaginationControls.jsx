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
            className="mt-8 flex items-center justify-center gap-3"
        >
            {/* Previous Button — explicit text-foreground so it reads in light mode */}
            <Button
                onClick={onPrevPage}
                disabled={!hasPrevPage || loading}
                className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground shadow-[0_2px_8px_rgb(0_0_0/0.06)] backdrop-blur-xl transition-all hover:bg-foreground/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Previous page"
            >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
            </Button>

            {/* Page Indicator */}
            <div className="flex items-center gap-2 rounded-pill bg-muted/20 px-4 py-2 backdrop-blur-xl">
                <span className="text-xs font-semibold text-muted-foreground">Page</span>
                <span className="text-sm font-semibold text-foreground">{currentPage}</span>
                <span className="text-xs text-muted-foreground">of</span>
                <span className="text-sm font-semibold text-foreground">{totalPages}</span>
            </div>

            {/* Next Button */}
            <Button
                onClick={onNextPage}
                disabled={!hasNextPage || loading}
                className="h-10 rounded-button bg-muted/30 px-4 text-sm font-semibold text-foreground shadow-[0_2px_8px_rgb(0_0_0/0.06)] backdrop-blur-xl transition-all hover:bg-foreground/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="Next page"
            >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
        </motion.div>
    );
};
