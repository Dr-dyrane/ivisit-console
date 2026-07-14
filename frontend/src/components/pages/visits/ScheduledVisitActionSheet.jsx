import React from 'react';
import {
  CalendarClock,
  CheckCircle,
  CircleSlash,
  Clock3,
  Loader2,
  Play,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalShell } from '../../ui/ModalShell';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { formatVisitInFacilityTimezone } from '../../../services/visits/normalization';
import { useScheduledVisitActions } from './useScheduledVisitActions';

const ACTION_ICON = {
  reschedule: RotateCw,
  cancel: CircleSlash,
  start: Play,
  complete: CheckCircle,
  no_show: Clock3,
};

export const ScheduledVisitActionSheet = ({
  isOpen,
  onClose,
  visit,
  roleKind,
  profileId,
  actionsEnabled,
  onChanged,
}) => {
  const actions = useScheduledVisitActions({
    visit,
    roleKind,
    profileId,
    actionsEnabled,
    onSuccess: async (result, action) => {
      await onChanged?.(result);
      toast.success(action === 'no_show' ? 'Visit marked no-show' : `Visit ${action} accepted`);
      onClose();
    },
  });
  if (!visit) return null;
  const selected = actions.capabilities.find((action) => action.id === actions.selectedAction);

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={actions.pendingAction ? () => {} : onClose}
      title="Scheduled visit actions"
      subtitle={`${visit.careModeLabel} - ${formatVisitInFacilityTimezone(visit)}`}
      icon={<CalendarClock className="h-5 w-5 text-cyan-700 dark:text-cyan-200" />}
      size="sm"
    >
      <div className="space-y-4 px-4 pb-5 md:px-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {actions.capabilities.map((action) => {
            const Icon = ACTION_ICON[action.id] || CalendarClock;
            const active = actions.selectedAction === action.id;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => actions.chooseAction(action)}
                disabled={!action.enabled || Boolean(actions.pendingAction)}
                title={action.reason || action.label}
                className={`min-h-12 rounded-button px-3 py-2 text-left text-sm font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'bg-foreground text-background' : action.tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-muted/28 text-foreground'}`}
              >
                <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{action.label}</span>
                {action.reason && <span className="mt-1 block text-[11px] font-normal opacity-75">{action.reason}</span>}
              </button>
            );
          })}
        </div>

        {actions.capabilities.length === 0 && (
          <div className="bg-muted/28 px-4 py-5 text-center text-sm text-muted-foreground">
            No visit changes are available right now.
          </div>
        )}

        {selected && (
          <div className="space-y-3 bg-muted/18 p-4">
            <p className="text-sm font-semibold">Confirm {selected.label.toLowerCase()}</p>
            {actions.selectedAction === 'reschedule' && (
              <div className="space-y-2">
                <label htmlFor="scheduled-visit-new-time" className="text-xs font-semibold text-muted-foreground">New facility-local start</label>
                <Input
                  id="scheduled-visit-new-time"
                  type="datetime-local"
                  step="900"
                  value={actions.localStart}
                  onChange={(event) => actions.setLocalStart(event.target.value)}
                  disabled={Boolean(actions.pendingAction)}
                  className="h-11 rounded-button bg-background/70"
                />
                <p className="text-xs text-muted-foreground">{visit.scheduledTimezone || visit.facility?.timezone || 'Timezone unavailable'}</p>
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="scheduled-visit-reason" className="text-xs font-semibold text-muted-foreground">Reason (optional)</label>
              <textarea
                id="scheduled-visit-reason"
                value={actions.reason}
                onChange={(event) => actions.setReason(event.target.value.slice(0, 500))}
                disabled={Boolean(actions.pendingAction)}
                rows={3}
                className="w-full resize-none rounded-button bg-background/70 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-foreground/20"
              />
            </div>
            {actions.error && <p className="bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive" role="alert">{actions.error}</p>}
            <Button
              onClick={actions.submit}
              disabled={Boolean(actions.pendingAction) || (actions.selectedAction === 'reschedule' && !actions.localStart)}
              className={`h-11 w-full rounded-button ${selected.tone === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-foreground text-background'}`}
            >
              {actions.pendingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              {actions.pendingAction ? 'Submitting...' : `Confirm ${selected.label.toLowerCase()}`}
            </Button>
          </div>
        )}

        <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {actions.pendingAction ? 'Checking this visit change...' : 'Available changes depend on the visit status and scheduled time.'}
        </div>
      </div>
    </ModalShell>
  );
};

export default ScheduledVisitActionSheet;
