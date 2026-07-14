import React from 'react';
import { motion } from 'framer-motion';

/**
 * MobileSheetActions - the app-grounded CTA group for detail sheets & modal footers.
 *
 * Grounded in ivisit-app's real CTA groups (components/ui/InputModal.jsx footer +
 * components/emergency/requestModal/AmbulanceServiceDetailSheet.jsx actionRow):
 *   - side-by-side flex row, gap 8, secondary LEFT / primary RIGHT
 *   - PRIMARY is FILLED (neutral ink by default, or an explicit status tone) with
 *     neutral elevation and is slightly wider (flex 1.2); bold, tracked label
 *   - SECONDARY is a subtle ghost (labelled or icon-only)
 *   - borderless (no border lines, no accent bars); graduated press (scale 0.96)
 *
 * This enforces the "one primary state-CTA, secondary demoted" hierarchy (Mobile Energy
 * Rollout S7) identically on every stateful sheet.
 *
 * @param {{label:string, icon?:Function, onClick:Function, disabled?:boolean, tone?:string}} [primary]
 *        tone = a css color for an intentional state fill (default is neutral foreground).
 * @param {{label?:string, icon?:Function, onClick:Function, ['aria-label']?:string}} [secondary]
 *        labelled (flex 1) or icon-only (fixed width) ghost.
 * @param {Array<{label:string, icon?:Function, onClick:Function, tone?:string}>} [extras]
 *        additional quiet secondary actions rendered BELOW the primary/secondary row as a
 *        compact 2-column grid (mirrors the desktop detail-rail action grid). tone tints the
 *        ICON only — the fill stays quiet so the primary remains the one loud action.
 * @param {string} [className]
 */
export const MobileSheetActions = ({ primary, secondary, extras = [], className = '' }) => {
  const hasExtras = Array.isArray(extras) && extras.length > 0;
  if (!primary && !secondary && !hasExtras) return null;
  const hasExplicitTone = Boolean(primary?.tone);
  const tone = primary?.tone || 'hsl(var(--foreground))';

  const secondaryButton = secondary && (
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
  );

  const primaryButton = primary && (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      onClick={primary.onClick}
      disabled={primary.disabled}
      style={{
        WebkitTapHighlightColor: 'transparent',
        background: tone,
        color: hasExplicitTone
          ? 'hsl(var(--primary-foreground))'
          : 'hsl(var(--background))',
        boxShadow: '0 6px 16px rgb(0 0 0 / 0.12)',
      }}
      className="flex h-12 flex-[1.2] items-center justify-center gap-2 rounded-button text-sm font-bold tracking-wide transition-transform disabled:opacity-50"
    >
      {primary.icon && <primary.icon className="h-4 w-4" />}
      {primary.label}
    </motion.button>
  );

  if (!hasExtras) {
    return (
      <div className={`flex gap-2 pt-1 ${className}`}>
        {secondaryButton}
        {primaryButton}
      </div>
    );
  }

  return (
    <div className={`space-y-3 pt-1 ${className}`}>
      {(primary || secondary) && (
        <div className="flex gap-2">
          {secondaryButton}
          {primaryButton}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {extras.map((extra, index) => (
          <motion.button
            key={extra.label || index}
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={extra.onClick}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            className="flex h-11 items-center justify-center gap-2 rounded-button bg-foreground/[0.05] text-[13px] font-semibold text-foreground transition-colors hover:bg-foreground/[0.08] dark:bg-white/[0.07] dark:hover:bg-white/[0.10]"
          >
            {extra.icon && (
              <extra.icon className="h-4 w-4" style={extra.tone ? { color: extra.tone } : undefined} />
            )}
            {extra.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MobileSheetActions;
