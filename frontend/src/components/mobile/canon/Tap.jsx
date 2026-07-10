// Mobile canon kit - tap primitives. Press ladder (canon, mobileMotion commit
// 1d899ecc): controls 0.96, cards/rows 0.988; haptic/burst feedback baked so a
// page can never ship a silent or spring-less press.
import React from 'react';
import { motion } from 'framer-motion';
import { mobileMotion } from '../mobileMotion';
import { useFeedback } from '../../../hooks/useFeedback';
import { FEEDBACK_TYPES } from '../../../contexts/FeedbackContext';

const NO_TAP_HIGHLIGHT = { WebkitTapHighlightColor: 'transparent' };

// Control press (chips, icon triggers, CTAs): scale 0.96; feedback fires on click.
export const TapButton = React.forwardRef(({
  feedbackVariant = FEEDBACK_TYPES.CLICK,
  feedbackColor,
  haptic = true,
  sound = true,
  silent = false,
  onClick,
  className = '',
  style,
  children,
  ...rest
}, ref) => {
  const { triggerFromEvent } = useFeedback();

  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={mobileMotion.press.control}
      transition={mobileMotion.quick}
      onClick={(event) => {
        if (!silent) {
          triggerFromEvent(event, {
            variant: feedbackVariant,
            ...(feedbackColor ? { color: feedbackColor } : {}),
            haptic,
            sound,
          });
        }
        onClick?.(event);
      }}
      className={className}
      style={{ ...NO_TAP_HIGHLIGHT, ...style }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
TapButton.displayName = 'TapButton';

// Card/row press: scale 0.988 + layout="position" (replace-in-place canon);
// feedback fires on pointerdown (the row idiom - acknowledgement before the sheet).
export const TapCard = React.forwardRef(({
  feedbackVariant = FEEDBACK_TYPES.CLICK,
  feedbackColor,
  haptic = true,
  sound = true,
  silent = false,
  onPointerDown,
  className = '',
  style,
  children,
  ...rest
}, ref) => {
  const { triggerFromEvent } = useFeedback();

  return (
    <motion.button
      ref={ref}
      type="button"
      layout="position"
      whileTap={mobileMotion.press.card}
      transition={mobileMotion.quick}
      onPointerDown={(event) => {
        if (!silent) {
          triggerFromEvent(event, {
            variant: feedbackVariant,
            ...(feedbackColor ? { color: feedbackColor } : {}),
            haptic,
            sound,
          });
        }
        onPointerDown?.(event);
      }}
      className={className}
      style={{ ...NO_TAP_HIGHLIGHT, ...style }}
      {...rest}
    >
      {children}
    </motion.button>
  );
});
TapCard.displayName = 'TapCard';
