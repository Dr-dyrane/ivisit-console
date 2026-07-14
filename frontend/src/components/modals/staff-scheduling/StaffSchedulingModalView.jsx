import React from 'react';
import { AlertCircle, CalendarDays, Plus } from 'lucide-react';
import { ModalShell } from '../../ui/ModalShell';
import { StaffScheduleForm } from './StaffScheduleForm';
import { StaffScheduleOverview } from './StaffScheduleOverview';

export const StaffSchedulingModalView = ({ controller, isOpen, onClose }) => {
  const { activeTab, loadError, notice, readsEnabled, refreshing } = controller;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Staff schedules"
      subtitle="Clinician shifts in each facility's local time"
      icon={<CalendarDays className="h-5 w-5 text-cyan-700 dark:text-cyan-200" />}
      size="lg"
      managed
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 gap-1 px-4 pb-3 md:px-6" role="tablist" aria-label="Schedule views">
          <button type="button" role="tab" aria-selected={activeTab === 'overview'} onClick={() => controller.setActiveTab('overview')} className={`min-h-9 rounded-button px-4 text-sm font-semibold transition-colors ${activeTab === 'overview' ? 'bg-foreground text-background' : 'bg-muted/28 text-muted-foreground'}`}>Overview</button>
          {(activeTab === 'add' || activeTab === 'edit') && (
            <button type="button" role="tab" aria-selected className="flex min-h-9 items-center rounded-button bg-cyan-500/10 px-4 text-sm font-semibold text-cyan-800 dark:text-cyan-100">
              <Plus className="mr-2 h-4 w-4" /> {activeTab === 'edit' ? 'Edit shift' : 'Add shift'}
            </button>
          )}
        </div>

        {!readsEnabled && (
          <div className="mx-4 mb-3 flex items-start gap-3 bg-muted/30 px-4 py-3 text-sm text-muted-foreground md:mx-6">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> Staff schedules are not available right now.
          </div>
        )}
        {loadError && (
          <div className="mx-4 mb-3 flex items-start gap-3 bg-destructive/10 px-4 py-3 text-sm text-destructive md:mx-6" role="alert">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
          {activeTab === 'overview'
            ? <StaffScheduleOverview controller={controller} />
            : <StaffScheduleForm controller={controller} />}
        </div>

        <div className="shrink-0 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground md:px-6" role="status" aria-live="polite">
          {refreshing ? 'Refreshing schedule...' : notice}
        </div>
      </div>
    </ModalShell>
  );
};
