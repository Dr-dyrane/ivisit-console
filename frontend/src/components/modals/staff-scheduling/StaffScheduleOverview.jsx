import React from 'react';
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  Edit,
  Loader2,
  Trash2,
  Users,
} from 'lucide-react';
import { Button } from '../../ui/button';
import { StaffSchedulingCard } from './StaffSchedulingCard';
import {
  getScheduleStatusColor,
  getShiftTypeColor,
  getStaffDisplayName,
  getStaffInitials,
} from './schedulePresentation';

export const StaffScheduleOverview = ({
  handleDeleteSchedule,
  handleEditSchedule,
  loading,
  schedules,
  staffList,
  stats,
}) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 rounded-inner bg-muted/30 text-center">
        <div className="flex justify-center mb-2">
          {loading ? (
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
          ) : (
            <Users className="w-6 h-6 text-sky-500 opacity-60" />
          )}
        </div>
        <p className="text-xl md:text-2xl font-bold">{staffList.length}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50">Total Staff</p>
      </div>
      <div className="p-4 rounded-inner bg-muted/30 text-center">
        <div className="flex justify-center mb-2">
          {loading ? (
            <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
          ) : (
            <CheckCircle className="w-6 h-6 text-emerald-500 opacity-60" />
          )}
        </div>
        <p className="text-xl md:text-2xl font-bold text-emerald-500">
          {stats?.scheduled_today || 0}
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50">Scheduled Today</p>
      </div>
      <div className="p-4 rounded-inner bg-muted/30 text-center">
        <div className="flex justify-center mb-2">
          {loading ? (
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          ) : (
            <Calendar className="w-6 h-6 text-violet-500 opacity-60" />
          )}
        </div>
        <p className="text-xl md:text-2xl font-bold text-violet-500">{stats?.this_week || 0}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-50">This Week</p>
      </div>
    </div>

    <StaffSchedulingCard icon={<CalendarDays className="text-purple-500" />} title="Current Schedule">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-16 bg-muted/30 rounded-inner animate-pulse" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No schedules found</p>
          <p className="text-sm">Create your first shift to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-4 rounded-inner bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-pill bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-600">
                  {getStaffInitials(schedule)}
                </div>
                <div>
                  <p className="font-semibold text-foreground/90">
                    {getStaffDisplayName(schedule)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {schedule.specialization && `${schedule.specialization} • `}
                    {schedule.ambulance_call_sign && `${schedule.ambulance_call_sign} • `}
                    {schedule.date}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-bold ${getShiftTypeColor(schedule.shift_type)}`}>
                  {schedule.shift_type}
                </span>
                <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-bold ${getScheduleStatusColor(schedule.status)}`}>
                  {schedule.status}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditSchedule(schedule)}
                  className="h-8 w-8 rounded-pill hover:bg-violet-500/10 hover:text-violet-600"
                  disabled={loading}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSchedule(schedule.id)}
                  className="h-8 w-8 rounded-pill hover:bg-destructive/10 hover:text-destructive"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </StaffSchedulingCard>
  </div>
);
