import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { AddShiftModal } from './AddShiftModal';
import { StaffScheduleBoard } from './StaffScheduleBoard';
import { StaffSchedulerControls } from './StaffSchedulerControls';
import { StaffShiftDetails } from './StaffShiftDetails';

export const StaffSchedulerView = ({ controller }) => (
  <div className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Staff Scheduling</h1>
        <p className="text-muted-foreground mt-1">Manage staff shifts and schedules</p>
      </div>
      <Button
        onClick={() => controller.setShowAddModal(true)}
        className="rounded-button bg-sky-500 text-white hover:bg-sky-600"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Shift
      </Button>
    </div>

    <StaffSchedulerControls controller={controller} />
    <StaffScheduleBoard controller={controller} />
    <StaffShiftDetails controller={controller} />
    <AddShiftModal controller={controller} />
  </div>
);
