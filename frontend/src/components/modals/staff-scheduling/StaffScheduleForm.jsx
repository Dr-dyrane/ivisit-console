import React from 'react';
import { Edit, Loader2, Plus, Save } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { StaffSchedulingCard } from './StaffSchedulingCard';

export const StaffScheduleForm = ({
  activeTab,
  fetchingStaff,
  handleAddSchedule,
  handleCancelSchedule,
  handleUpdateSchedule,
  loading,
  newSchedule,
  setNewSchedule,
  staffList,
}) => (
  <StaffSchedulingCard
    icon={activeTab === 'add' ? <Plus className="text-green-500" /> : <Edit className="text-blue-500" />}
    title={activeTab === 'add' ? 'Add New Shift' : 'Edit Shift'}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">Staff Member</Label>
        <Select
          value={newSchedule.profile_id}
          onValueChange={(value) => setNewSchedule({ ...newSchedule, profile_id: value })}
          disabled={fetchingStaff}
        >
          <SelectTrigger className="rounded-button bg-muted/30 h-12">
            <SelectValue placeholder={fetchingStaff ? 'Loading staff...' : 'Select staff member'} />
          </SelectTrigger>
          <SelectContent className="rounded-inner bg-background/95 backdrop-blur-xl">
            {staffList.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {fetchingStaff ? 'Loading staff...' : 'No staff available'}
              </div>
            ) : (
              staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id.toString()}>
                  <div className="flex flex-col">
                    <span className="font-medium">{staff.name}</span>
                    <span className="text-xs text-muted-foreground">{staff.role} • {staff.department}</span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">Date</Label>
        <Input
          type="date"
          value={newSchedule.date}
          onChange={(event) => setNewSchedule({ ...newSchedule, date: event.target.value })}
          className="rounded-button bg-muted/30 h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">Start Time</Label>
        <Input
          type="time"
          value={newSchedule.start_time}
          onChange={(event) => setNewSchedule({ ...newSchedule, start_time: event.target.value })}
          className="rounded-button bg-muted/30 h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">End Time</Label>
        <Input
          type="time"
          value={newSchedule.end_time}
          onChange={(event) => setNewSchedule({ ...newSchedule, end_time: event.target.value })}
          className="rounded-button bg-muted/30 h-12"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">Shift Type</Label>
        <Select
          value={newSchedule.shift_type}
          onValueChange={(value) => setNewSchedule({ ...newSchedule, shift_type: value })}
        >
          <SelectTrigger className="rounded-button bg-muted/30 h-12">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-inner bg-background/95 backdrop-blur-xl">
            <SelectItem value="day">Day Shift</SelectItem>
            <SelectItem value="evening">Evening Shift</SelectItem>
            <SelectItem value="night">Night Shift</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50 ml-1">Notes (Optional)</Label>
        <Input
          type="text"
          value={newSchedule.notes}
          onChange={(event) => setNewSchedule({ ...newSchedule, notes: event.target.value })}
          placeholder="Additional notes..."
          className="rounded-button bg-muted/30 h-12"
        />
      </div>
    </div>

    <div className="flex gap-3 mt-8">
      <Button
        variant="outline"
        className="flex-1 rounded-button bg-muted/40 hover:bg-muted/60"
        onClick={handleCancelSchedule}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        className="flex-1 rounded-button bg-sky-500 text-white hover:bg-sky-600"
        onClick={activeTab === 'add' ? handleAddSchedule : handleUpdateSchedule}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {activeTab === 'add' ? 'Add Shift' : 'Update Shift'}
      </Button>
    </div>
  </StaffSchedulingCard>
);
