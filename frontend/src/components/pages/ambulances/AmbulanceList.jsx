import React from 'react';
import { Ambulance, Edit, Eye } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { ListRowShell, SortableColumnHeader } from '../../console/ActivitySheet';
import { StatusPill } from '../../console/primitives';
import { formatDayTime } from '../../../utils/dayTime';
import {
  getFleetStatus,
  getAmbulanceStatusLabel,
  getAmbulanceStatusToneClass,
  getAmbulanceStatusIcon,
} from '../../../constants/ambulanceStatus';
import { getAmbulanceStation, getAmbulanceVehicle } from './ambulancePageModel';
import { AMBULANCE_GRID_COLS, AMBULANCE_GRID_COLS_SELECT } from './ambulancePresentation';

export const AmbulanceAvatar = ({ size = 'h-9 w-9', iconSize = 'h-4 w-4' }) => (
  <span className={`flex ${size} shrink-0 items-center justify-center rounded-pill bg-cyan-500/10 text-cyan-700 dark:text-cyan-200`}>
    <Ambulance className={iconSize} aria-hidden="true" />
  </span>
);

export const AmbulanceListHeader = ({
  sortConfig,
  onSort,
  selectable = false,
  allSelected = false,
  someSelected = false,
  onSelectAll,
}) => (
  <div className={`grid ${selectable ? AMBULANCE_GRID_COLS_SELECT : AMBULANCE_GRID_COLS} items-center gap-2 px-4 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}>
    {selectable && (
      <Checkbox
        checked={someSelected ? 'indeterminate' : allSelected}
        onCheckedChange={onSelectAll}
        onClick={(event) => event.stopPropagation()}
        aria-label={allSelected ? 'Clear selection' : 'Select all units'}
        className="h-4 w-4"
      />
    )}
    <span>Unit</span>
    <span>Status</span>
    <span>Station</span>
    <span>Vehicle</span>
    <SortableColumnHeader
      label="Updated"
      sortKey="updated_at"
      sortConfig={sortConfig}
      onSort={onSort}
    />
    <span className="justify-self-end text-right">Action</span>
  </div>
);

export const AmbulanceRow = ({
  ambulance,
  selected,
  onFocus,
  onView,
  onEdit,
  canManageFleet,
  activeActionFeedback,
  selectable = false,
  checked = false,
  onToggleSelect,
  onSelectClick,
}) => {
  const status = getFleetStatus(ambulance);
  const StatusIcon = getAmbulanceStatusIcon(status);
  const callSign = ambulance.call_sign || 'Unknown unit';
  const station = getAmbulanceStation(ambulance);
  const vehicle = getAmbulanceVehicle(ambulance);
  // Driver identity on the row subline (ADOPT-22): only a RESOLVED name joins
  // the type -- an unassigned or unresolved driver renders nothing here (the
  // rail carries the honest Unassigned/truncated-UUID state).
  const unitSubline = `${ambulance.type || 'Standard'}${ambulance.driver_name ? ` \u00B7 ${ambulance.driver_name}` : ''}`;
  const viewOpening = activeActionFeedback === `view-${ambulance.id}`;
  const editOpening = activeActionFeedback === `edit-${ambulance.id}`;

  return (
    <ListRowShell
      id={ambulance.id}
      dataAttrName="data-ambulance-row"
      gridCols={selectable ? AMBULANCE_GRID_COLS_SELECT : AMBULANCE_GRID_COLS}
      selected={selected}
      onFocus={onFocus}
      onOpen={() => onView(ambulance)}
    >
      {selectable && (
        <Checkbox
          checked={checked}
          onCheckedChange={(value) => onToggleSelect?.(ambulance.id, value)}
          onClick={(event) => {
            onSelectClick?.(event);
            event.stopPropagation();
          }}
          aria-label={checked ? `Deselect ${callSign}` : `Select ${callSign}`}
          className="h-4 w-4"
        />
      )}

      <span className="flex min-w-0 items-center gap-3">
        <AmbulanceAvatar />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-foreground" title={callSign}>
            {callSign}
          </span>
          <span className="block truncate text-xs text-muted-foreground" title={unitSubline}>
            {unitSubline}
          </span>
        </span>
      </span>

      <span>
        <StatusPill
          compact
          icon={StatusIcon}
          label={getAmbulanceStatusLabel(status)}
          className={getAmbulanceStatusToneClass(status)}
        />
      </span>

      <span className="truncate text-sm text-muted-foreground" title={station}>{station}</span>
      <span className="truncate text-sm tabular-nums text-foreground/85" title={vehicle}>{vehicle}</span>
      <span className="text-sm tabular-nums text-muted-foreground">
        {ambulance.updated_at ? formatDayTime(ambulance.updated_at) : 'Unknown'}
      </span>

      <span className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onView(ambulance);
          }}
          className={`h-8 w-8 rounded-button p-0 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${viewOpening ? 'scale-95 bg-foreground/10 text-foreground' : ''}`}
          aria-label={`View details for ${callSign}`}
          aria-busy={viewOpening}
          data-state={viewOpening ? 'opening' : 'idle'}
        >
          <Eye className="h-4 w-4" />
        </Button>

        {canManageFleet && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(ambulance);
            }}
            className={`h-8 w-8 rounded-button p-0 text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-95 ${editOpening ? 'scale-95 bg-foreground/10 text-foreground' : ''}`}
            aria-label={`Edit ${callSign}`}
            aria-busy={editOpening}
            data-state={editOpening ? 'opening' : 'idle'}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
      </span>
    </ListRowShell>
  );
};
