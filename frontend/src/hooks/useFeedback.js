import { useCallback } from 'react';
import { useFeedbackContext } from '../contexts/FeedbackContext';
import { FEEDBACK_TYPES } from '../contexts/FeedbackContext';

export const useFeedback = () => {
    const { triggerFeedback } = useFeedbackContext();

    const triggerFromEvent = useCallback((event, options = {}) => {
        const getFocusMeta = (targetEvent) => {
            const rect = targetEvent?.currentTarget?.getBoundingClientRect?.();
            if (!rect || typeof window === 'undefined') return {};
            const computed = window.getComputedStyle(targetEvent.currentTarget);
            const radiusRaw = parseFloat(computed.borderTopLeftRadius || '18');
            const focusRadius = Number.isFinite(radiusRaw) ? radiusRaw : 18;
            return {
                focusRect: {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                },
                focusRadius
            };
        };

        const point = {
            x: event?.clientX,
            y: event?.clientY
        };

        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
            const rect = event?.currentTarget?.getBoundingClientRect?.();
            if (rect) {
                point.x = rect.left + rect.width / 2;
                point.y = rect.top + rect.height / 2;
            }
        }

        const normalized = {
            ...options,
            ...getFocusMeta(event),
            ...point,
            variant: options.variant || options.type || 'click'
        };

        triggerFeedback(normalized);
    }, [triggerFeedback]);

    const triggerTyped = useCallback((variant, options = {}) => {
        triggerFeedback({ ...options, variant });
    }, [triggerFeedback]);

    const triggerClick = useCallback((options = {}) => {
        triggerTyped(FEEDBACK_TYPES.CLICK, options);
    }, [triggerTyped]);

    const triggerSuccess = useCallback((options = {}) => {
        triggerTyped(FEEDBACK_TYPES.SUCCESS, options);
    }, [triggerTyped]);

    const triggerInfo = useCallback((options = {}) => {
        triggerTyped(FEEDBACK_TYPES.INFO, options);
    }, [triggerTyped]);

    const triggerWarning = useCallback((options = {}) => {
        triggerTyped(FEEDBACK_TYPES.WARNING, options);
    }, [triggerTyped]);

    const triggerError = useCallback((options = {}) => {
        triggerTyped(FEEDBACK_TYPES.DESTRUCTIVE, options);
    }, [triggerTyped]);

    return {
        triggerFeedback,
        triggerFromEvent,
        triggerClick,
        triggerSuccess,
        triggerInfo,
        triggerWarning,
        triggerError
    };
};

export default useFeedback;
