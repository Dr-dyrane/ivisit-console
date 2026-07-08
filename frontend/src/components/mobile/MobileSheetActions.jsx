import React from 'react';
import { motion } from 'framer-motion';

/**
 * MobileSheetActions - the app-grounded CTA group for detail sheets & modal footers.
 *
 * Grounded in ivisit-app's real CTA groups (components/ui/InputModal.jsx footer +
 * components/emergency/requestModal/AmbulanceServiceDetailSheet.jsx actionRow):
 *   - side-by-side flex row, gap 8, secondary LEFT / primary RIGHT
 *   - PRIMARY is FILLED (brand or a status tone) with a colored "glow" shadow and is
 *     slightly wider (flex 1.2); bold, tracked label
 *   - SECONDARY is a subtle ghost (labelled or icon-only)
 *   - borderless (no border lines, no accent bars); graduated press (scale 0.96)
 *
 * This enforces the "one primary state-CTA, secondary demoted" hierarchy (Mobile Energy
 * Rollout S7) identically on every stateful sheet.
 *
 * @param {{label:string, icon?:Function, onClick:Function, disabled?:boolean, tone?:string}} [primary]
 *        tone = a css color for the fill (default brand `hsl(var(--primary))`).
 * @param {{label?:string, icon?:Function, onClick:Function, ['aria-label']?:string}} [secondary]
 *        labelled (flex 1) or icon-only (fixed width) ghost.
 * @param {string} [className]
 */
export const MobileSheetActions = ({ primary, secondary, className = '' }) => {
  if (!primary && !secondary) return null;
  const tone = primary?.tone || 'hsl(var(--primary))';
  const glow = tone.replace(/\)$/, ' / 0.30)');

  return (
    <div className={`flex gap-2 pt-1 ${className}`}>
      {secondary && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={secondary.onClick}
          aria-label={secondary['aria-label'] || secondary.label}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          className={`flex h-12 items-center justify-center gap-2 rounded-button bg-muted/40 text-sm font-semibold text-foreground transition-colors hover:bg-muted/60 ${secondary.label ? 'flex-1' : 'w-12 shrink-0'}`}
        >
          {secondary.icon && <secondary.icon className="h-4 w-4" />}
          {secondary.label}
        </motion.button>
      )}
      {primary && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={primary.onClick}
          disabled={primary.disabled}
          style={{
            WebkitTapHighlightColor: 'transparent',
            background: tone,
            boxShadow: `0 8px 18px ${glow}`,
          }}
          className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-button text-sm font-bold tracking-wide text-primary-foreground transition-transform disabled:opacity-50"
        >
          {primary.icon && <primary.icon className="h-4 w-4" />}
          {primary.label}
        </motion.button>
      )}
    </div>
  );
};

export default MobileSheetActions;
