import React from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Card } from '../../ui/card';
import {
  getShiftStatusColor,
  getShiftsForDay,
  getShiftTypeColor,
  STAFF_ROLE_SEPARATOR,
} from './staffSchedulerModel';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const StaffList = ({ filteredStaff, selectedStaff, setSelectedStaff }) => (
  <div className="lg:col-span-1">
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Users className="w-4 h-4" />
        Staff Members
      </h3>
      <div className="space-y-2">
        {filteredStaff.map((staff) => (
          <div
            key={staff.id}
            className={`p-3 rounded-inner cursor-pointer transition-colors ${
              selectedStaff?.id === staff.id
                ? 'bg-sky-500/15'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
            onClick={() => setSelectedStaff(staff)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-pill bg-sky-500/15 flex items-center justify-center text-xs font-medium text-sky-600">
                {staff.avatar}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{staff.name}</p>
                <p className="text-xs text-muted-foreground">
                  {staff.role} {STAFF_ROLE_SEPARATOR} {staff.department}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const CalendarGrid = ({ days, shifts, staffList }) => (
  <div className="lg:col-span-3">
    <Card className="p-4">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {WEEKDAY_LABELS.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, index) => {
          const dayShifts = getShiftsForDay(shifts, day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`min-h-[120px] p-2 rounded-inner ${
                isToday ? 'bg-sky-500/15' : 'bg-muted/30'
              }`}
            >
              <div className="text-sm font-medium mb-2">{day.getDate()}</div>
              <div className="space-y-1">
                {dayShifts.map((shift) => {
                  const staff = staffList.find((candidate) => candidate.id === shift.staffId);
                  return (
                    <motion.div
                      key={shift.id}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-xs p-1 rounded-inner ${getShiftTypeColor(shift.type)} ${getShiftStatusColor(shift.status)}`}
                    >
                      <div className="font-medium truncate">{staff?.name}</div>
                      <div className="text-xs opacity-75">
                        {shift.startTime} - {shift.endTime}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  </div>
);

export const StaffScheduleBoard = ({ controller }) => (
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
    <StaffList
      filteredStaff={controller.filteredStaff}
      selectedStaff={controller.selectedStaff}
      setSelectedStaff={controller.setSelectedStaff}
    />
    <CalendarGrid
      days={controller.days}
      shifts={controller.shifts}
      staffList={controller.staffList}
    />
  </div>
);
