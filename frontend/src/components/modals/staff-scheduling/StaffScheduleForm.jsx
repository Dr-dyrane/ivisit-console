import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';

const FieldError = ({ children }) => children ? (
  <p className="text-xs font-medium text-destructive" role="alert">{children}</p>
) : null;

export const StaffScheduleForm = ({ controller }) => {
  const {
    activeTab,
    cancelForm,
    draft,
    formErrors,
    mutationPending,
    selectedFacility,
    setDraft,
    staffList,
    submit,
  } = controller;
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  return (
    <form className="space-y-5 px-4 pb-5 md:px-6" onSubmit={(event) => { event.preventDefault(); submit(); }}>
      <div className="rounded-inner bg-cyan-500/8 px-4 py-3 text-sm text-cyan-800 dark:text-cyan-100">
        Times are entered in <strong>{selectedFacility?.timezone || 'the facility timezone'}</strong>. Use 15-minute intervals.
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="schedule-doctor">Clinician</Label>
          <Select value={draft.doctor_id} onValueChange={(value) => update('doctor_id', value)} disabled={mutationPending}>
            <SelectTrigger id="schedule-doctor" className="h-11 rounded-button bg-muted/24">
              <SelectValue placeholder="Choose a clinician" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((staff) => (
                <SelectItem key={staff.doctor_id} value={staff.doctor_id}>
                  {staff.name} - {staff.specialization}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError>{formErrors.doctor_id}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-date">Date</Label>
          <Input id="schedule-date" type="date" value={draft.date} onChange={(event) => update('date', event.target.value)} disabled={mutationPending} className="h-11 rounded-button bg-muted/24" />
          <FieldError>{formErrors.date}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-shift-type">Shift type</Label>
          <Select value={draft.shift_type} onValueChange={(value) => update('shift_type', value)} disabled={mutationPending}>
            <SelectTrigger id="schedule-shift-type" className="h-11 rounded-button bg-muted/24"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="evening">Evening</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
          <FieldError>{formErrors.shift_type}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-start">Start time</Label>
          <Input id="schedule-start" type="time" step="900" value={draft.start_time} onChange={(event) => update('start_time', event.target.value)} disabled={mutationPending} className="h-11 rounded-button bg-muted/24" />
          <FieldError>{formErrors.start_time}</FieldError>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-end">End time</Label>
          <Input id="schedule-end" type="time" step="900" value={draft.end_time} onChange={(event) => update('end_time', event.target.value)} disabled={mutationPending} className="h-11 rounded-button bg-muted/24" />
          <FieldError>{formErrors.end_time}</FieldError>
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-3 rounded-button bg-muted/24 px-4 py-3 text-sm font-medium">
        <Checkbox checked={draft.is_available} onCheckedChange={(value) => update('is_available', value === true)} disabled={mutationPending} />
        Available for patient booking
      </label>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={cancelForm} disabled={mutationPending} className="flex-1 rounded-button bg-muted/28">
          Cancel
        </Button>
        <Button type="submit" disabled={mutationPending} className="flex-1 rounded-button bg-foreground text-background">
          {mutationPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {activeTab === 'edit' ? 'Update shift' : 'Add shift'}
        </Button>
      </div>
    </form>
  );
};
