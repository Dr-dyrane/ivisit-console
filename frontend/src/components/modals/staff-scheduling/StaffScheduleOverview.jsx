import React from 'react';
import {
  CalendarDays,
  Check,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Shimmer } from '../../console/primitives';
import {
  formatScheduleDate,
  formatScheduleTime,
  formatTimezoneConfirmationTime,
  getShiftTypeColor,
  getStaffDisplayName,
  getStaffInitials,
} from './schedulePresentation';

export const StaffScheduleOverview = ({ controller }) => {
  const {
    canMutate,
    changeFacility,
    changeTimezoneInput,
    confirmDelete,
    confirmTimezone,
    deleteCandidate,
    facilities,
    groupedSchedules,
    initialLoading,
    mutationPending,
    openAdd,
    openEdit,
    refetch,
    refreshing,
    selectedFacility,
    selectedHospitalId,
    setDeleteCandidate,
    timezoneConfirmed,
    timezoneInput,
    timezoneInputError,
    timezoneInputValid,
    window,
    writesEnabled,
  } = controller;

  return (
    <div className="space-y-4 px-4 pb-5 md:px-6">
      <div className="flex flex-col gap-3 bg-muted/18 p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <label className="text-xs font-semibold text-muted-foreground" htmlFor="schedule-facility">Facility</label>
          <Select value={selectedHospitalId} onValueChange={changeFacility} disabled={initialLoading || mutationPending}>
            <SelectTrigger id="schedule-facility" className="h-11 rounded-button bg-background/60"><SelectValue placeholder="Choose a facility" /></SelectTrigger>
            <SelectContent>
              {facilities.map((facility) => <SelectItem key={facility.id} value={facility.id}>{facility.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch} disabled={refreshing} className="h-11 w-11 rounded-button bg-background/55" aria-label="Refresh schedule" title="Refresh schedule">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {selectedFacility && (
        <div className={`space-y-3 px-4 py-3 ${timezoneConfirmed ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-100' : 'bg-amber-500/10 text-amber-900 dark:text-amber-100'}`}>
          {timezoneConfirmed ? (
            <div>
              <p className="text-sm font-semibold">Scheduling timezone confirmed</p>
              <p className="mt-0.5 text-xs opacity-80">{selectedFacility.timezone}</p>
              <p className="mt-1 text-xs opacity-70">{formatTimezoneConfirmationTime(selectedFacility.timezone_confirmed_at)}</p>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs font-semibold uppercase text-current/70">Existing timezone value</p>
                <p className="mt-1 text-sm font-semibold">{selectedFacility.timezone || 'Not set'}</p>
                <p className="mt-1 text-xs opacity-80">This value has not been confirmed for scheduling.</p>
              </div>
              {writesEnabled ? (
                <div className="space-y-2">
                  <label htmlFor="schedule-timezone-confirmation" className="text-xs font-semibold">
                    Timezone to use for scheduling
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="schedule-timezone-confirmation"
                      value={timezoneInput}
                      onChange={(event) => changeTimezoneInput(event.target.value)}
                      placeholder="America/Los_Angeles"
                      autoComplete="off"
                      spellCheck={false}
                      disabled={mutationPending}
                      aria-invalid={Boolean(timezoneInputError)}
                      className="h-11 flex-1 rounded-button bg-background/70 text-foreground"
                    />
                    <Button onClick={confirmTimezone} disabled={mutationPending || !timezoneInputValid} className="h-11 rounded-button bg-foreground text-background">
                      {mutationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Confirm entered timezone
                    </Button>
                  </div>
                  <p className={`text-xs ${timezoneInputError ? 'font-medium text-destructive' : 'opacity-75'}`} role={timezoneInputError ? 'alert' : undefined}>
                    {timezoneInputError || 'Enter an IANA timezone, such as America/Los_Angeles.'}
                  </p>
                </div>
              ) : (
                <p className="text-xs opacity-80">Timezone confirmation is not available right now.</p>
              )}
            </>
          )}
        </div>
      )}

      {deleteCandidate && (
        <div className="flex flex-col gap-3 bg-destructive/10 px-4 py-3 text-destructive sm:flex-row sm:items-center sm:justify-between" role="alertdialog" aria-label="Confirm shift deletion">
          <div>
            <p className="text-sm font-semibold">Remove this shift?</p>
            <p className="mt-0.5 text-xs opacity-80">Shifts with booked visits cannot be removed.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setDeleteCandidate(null)} disabled={mutationPending}>Keep shift</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={mutationPending}>Remove</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold">14-day schedule</p>
          <p className="text-xs text-muted-foreground">{window.from} through {window.to}</p>
        </div>
        <Button onClick={() => openAdd()} disabled={!canMutate || mutationPending} title={!writesEnabled ? 'Schedule changes are not available right now' : !timezoneConfirmed ? 'Confirm the facility timezone before adding a shift' : 'Add shift'} className="rounded-button bg-foreground text-background">
          <Plus className="mr-2 h-4 w-4" /> Add shift
        </Button>
      </div>

      {initialLoading ? (
        <div className="space-y-2" data-testid="schedule-skeleton">
          {[0, 1, 2, 3].map((item) => <Shimmer key={item} className="h-[72px] w-full rounded-inner" />)}
        </div>
      ) : groupedSchedules.length === 0 ? (
        <div className="flex min-h-52 flex-col items-center justify-center bg-muted/18 px-6 text-center">
          <CalendarDays className="h-9 w-9 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-semibold">No shifts in this window</p>
          <p className="mt-1 text-xs text-muted-foreground">Shifts will appear here once they are added.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedSchedules.map((group) => (
            <section key={group.date} aria-labelledby={`schedule-date-${group.date}`}>
              <h3 id={`schedule-date-${group.date}`} className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                {formatScheduleDate(group.date, selectedFacility?.timezone)}
              </h3>
              <div className="bg-muted/16">
                {group.rows.map((schedule) => (
                  <div key={schedule.id} className="flex min-h-[68px] items-center gap-3 px-3 py-2.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cyan-500/10 text-xs font-semibold text-cyan-800 dark:text-cyan-100">{getStaffInitials(schedule)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{getStaffDisplayName(schedule)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatScheduleTime(schedule.start_time)}-{formatScheduleTime(schedule.end_time)} {selectedFacility?.timezone || ''}</p>
                    </div>
                    <span className={`hidden rounded-pill px-2 py-1 text-[11px] font-semibold capitalize sm:inline-flex ${getShiftTypeColor(schedule.shift_type)}`}>{schedule.shift_type}</span>
                    <span className={`hidden rounded-pill px-2 py-1 text-[11px] font-semibold sm:inline-flex ${schedule.is_available ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-100' : 'bg-muted/40 text-muted-foreground'}`}>{schedule.is_available ? 'Bookable' : 'Unavailable'}</span>
                    {canMutate && (
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(schedule)} disabled={mutationPending} className="h-8 w-8 rounded-pill" aria-label={`Edit ${getStaffDisplayName(schedule)} shift`} title="Edit shift"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteCandidate(schedule)} disabled={mutationPending} className="h-8 w-8 rounded-pill text-destructive" aria-label={`Remove ${getStaffDisplayName(schedule)} shift`} title="Remove shift"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
