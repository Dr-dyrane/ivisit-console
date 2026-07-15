import React from 'react';
import { CalendarClock, Siren, Stethoscope } from 'lucide-react';
import { resolveVital } from '../../../constants/vitalTracks';
import { formatRequestDayTime } from '../../../utils/requestDisplay';
import { visitRowProjection } from '../../../utils/visitRowProjection';
import { MobileListRow } from '../canon/GroupedList';
import { visitWhen } from './mobileVisitsModel';
import { formatVisitInFacilityTimezone } from '../../../services/visits/normalization';

export const MobileVisitErrorBanner = ({ message, onRetry }) => (
  <div
    className="rounded-inner bg-destructive/10 p-4 text-sm text-destructive shadow-[0_18px_54px_rgba(239,68,68,0.10)]"
    data-testid="mobile-visits-error-state"
  >
    <p className="font-semibold">Visits could not load</p>
    <p className="mt-1 text-xs leading-5 text-destructive/75">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-3 h-9 rounded-pill bg-destructive/10 px-4 text-xs font-semibold transition-all hover:bg-destructive/15 active:scale-[0.96]"
    >
      Retry
    </button>
  </div>
);

export const MobileVisitRow = ({
  visit,
  onOpen,
  selectable,
  selected,
  selectionMode,
  onToggleSelect,
  onLongPress,
}) => {
  const row = visitRowProjection(visit);
  const vital = resolveVital('visit', row.statusKey);
  const pill = vital?.pill;
  const orbClass = pill?.className || 'bg-muted/34 text-muted-foreground';
  const isEmergency = String(visit?.visit_type || visit?.type || '').includes('emergency');
  const scheduled = visit?.sourceKind === 'scheduled_visit';
  const TypeIcon = isEmergency ? Siren : scheduled ? CalendarClock : Stethoscope;

  return (
    <MobileListRow
      item={visit}
      dataAttr="data-mobile-visit-row"
      onOpen={() => onOpen(visit)}
      ariaLabel={`Open ${row.patientName}`}
      orbClass={orbClass}
      icon={TypeIcon}
      title={row.patientName}
      meta={`${scheduled ? visit.careModeLabel : row.serviceType} \u00b7 ${row.primary} \u00b7 ${row.careTeam.rowLabel}: ${row.careTeam.name}`}
      time={scheduled ? formatVisitInFacilityTimezone(visit) : formatRequestDayTime(visitWhen(visit))}
      pill={{ className: orbClass, label: pill?.label || row.statusLabel, dataStatus: row.statusKey }}
      selectable={selectable}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};
