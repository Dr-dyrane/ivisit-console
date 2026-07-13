import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calendar, CalendarDays, Edit, Plus, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { StaffScheduleForm } from './StaffScheduleForm';
import { StaffScheduleOverview } from './StaffScheduleOverview';

export const StaffSchedulingModalView = ({ controller, isOpen, onClose }) => {
  const {
    activeTab,
    fetchingStaff,
    handleAddSchedule,
    handleCancelSchedule,
    handleDeleteSchedule,
    handleEditSchedule,
    handleUpdateSchedule,
    loading,
    newSchedule,
    schedules,
    setActiveTab,
    setNewSchedule,
    staffList,
    stats,
  } = controller;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(12px, var(--safe-top, 0px))',
            paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))',
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-5xl max-h-[92dvh] overflow-hidden rounded-modal bg-card/95 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl"
            style={{
              maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 md:p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-2.5 bg-violet-500/20 rounded-icon">
                  <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-violet-500" />
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-semibold tracking-tight text-foreground/90">
                    Staff Scheduling
                  </h2>
                  <p className="text-xs md:text-sm text-muted-foreground">Manage staff shifts and schedules</p>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={onClose}
                className="h-10 w-10 rounded-pill bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex gap-1 p-2 md:p-8 pt-2">
              <button
                className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-button transition-all ${
                  activeTab === 'overview'
                    ? 'bg-violet-500/20 text-violet-600'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                <Calendar className="w-4 h-4" />
                Overview
              </button>
              <button
                className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-button transition-all ${
                  activeTab === 'add'
                    ? 'bg-violet-500/20 text-violet-600'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
                onClick={() => setActiveTab('add')}
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </button>
              {activeTab === 'edit' && (
                <button className="flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-button transition-all bg-violet-500/20 text-violet-600">
                  <Edit className="w-4 h-4" />
                  Edit Shift
                </button>
              )}
            </div>

            <div
              className="p-2 md:p-8 pt-2 overflow-y-auto space-y-6 no-scrollbar"
              style={{
                maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 240px)',
              }}
            >
              {activeTab === 'overview' && (
                <StaffScheduleOverview
                  handleDeleteSchedule={handleDeleteSchedule}
                  handleEditSchedule={handleEditSchedule}
                  loading={loading}
                  schedules={schedules}
                  staffList={staffList}
                  stats={stats}
                />
              )}

              {(activeTab === 'add' || activeTab === 'edit') && (
                <StaffScheduleForm
                  activeTab={activeTab}
                  fetchingStaff={fetchingStaff}
                  handleAddSchedule={handleAddSchedule}
                  handleCancelSchedule={handleCancelSchedule}
                  handleUpdateSchedule={handleUpdateSchedule}
                  loading={loading}
                  newSchedule={newSchedule}
                  setNewSchedule={setNewSchedule}
                  staffList={staffList}
                />
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
