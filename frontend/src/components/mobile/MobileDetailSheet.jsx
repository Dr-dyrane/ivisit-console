import React from 'react';
import { ModalShell } from '../ui/ModalShell';
import { VitalTrack } from '../common/VitalTrack';
import { MobileDetailIslands } from './MobileDetailIslands';
import { MobileSheetActions } from './MobileSheetActions';

/**
 * MobileDetailSheet - the canonical mobile record-detail bottom sheet.
 *
 * Tapping a list row opens THIS (a smooth ModalShell bottom sheet), not an inline
 * dropdown — the approved mobile design + the desktop detail-rail behaviour. Composes the
 * shared spine: a header (icon + eyebrow + title + status pill), the VitalTrack lifecycle,
 * MobileDetailIslands, optional extra content, and a MobileSheetActions CTA group that can
 * lead to edit/state actions. Borderless; ModalShell owns the slide-up, grab handle,
 * swipe-to-dismiss, backdrop, focus trap, and the sticky footer.
 *
 * @param {boolean}   isOpen
 * @param {Function}  onClose
 * @param {Function}  [icon]        lucide icon for the header tile
 * @param {string}    [iconTone]    css color for the header icon (e.g. resolveVital().tone)
 * @param {string}    [eyebrow]     small uppercase caption above the title
 * @param {React.ReactNode} title
 * @param {{label:string, className:string}} [statusPill]
 * @param {{steps,currentKey,tone,cancelled,label?}} [vital]  omit for non-lifecycle records
 * @param {Array}     [islands]     MobileDetailIslands items
 * @param {object}    [primary]     MobileSheetActions primary
 * @param {object}    [secondary]   MobileSheetActions secondary
 * @param {React.ReactNode} [children]  extra body content (e.g. a message block)
 */
export const MobileDetailSheet = ({
  isOpen,
  onClose,
  icon: Icon,
  iconTone,
  eyebrow,
  title,
  statusPill,
  vital,
  islands = [],
  primary,
  secondary,
  children,
}) => (
  <ModalShell
    isOpen={isOpen}
    onClose={onClose}
    size="lg"
    hideClose
    footer={(primary || secondary) ? <MobileSheetActions primary={primary} secondary={secondary} /> : null}
  >
    <div className="space-y-4 px-4 pt-1 pb-4 md:px-6">
      <div className="flex items-start gap-3">
        {Icon && (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-icon bg-muted/40"
            style={iconTone ? { color: iconTone } : undefined}
          >
            <Icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
          )}
          <h2 className="mt-0.5 text-xl font-semibold leading-tight text-foreground line-clamp-2 break-words">
            {title}
          </h2>
          {statusPill && (
            <span className={`mt-2 inline-flex rounded-pill px-2.5 py-1 text-[11px] font-semibold ${statusPill.className || ''}`}>
              {statusPill.label}
            </span>
          )}
        </div>
      </div>

      {vital && (
        <VitalTrack
          steps={vital.steps}
          currentKey={vital.currentKey}
          tone={vital.tone}
          cancelled={vital.cancelled}
          label={vital.label || 'Progress'}
        />
      )}

      {islands.length > 0 && <MobileDetailIslands items={islands} />}

      {children}
    </div>
  </ModalShell>
);

export default MobileDetailSheet;
