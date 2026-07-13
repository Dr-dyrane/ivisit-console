import React from 'react';
import { motion } from 'framer-motion';
import { Edit, Trash2 } from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { getShiftStatusColor } from './staffSchedulerModel';

export const StaffShiftDetails = ({ controller }) => {
  if (!controller.selectedStaff) return null;

  const staffShifts = controller.shifts.filter(
    (shift) => shift.staffId === controller.selectedStaff.id,
  );

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4">Shifts for {controller.selectedStaff.name}</h3>
      <div className="space-y-2">
        {staffShifts.map((shift) => (
          <motion.div
            key={shift.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-3 rounded-inner bg-muted/30"
          >
            <div className="flex items-center gap-4">
              <span className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-xs font-medium ${getShiftStatusColor(shift.status)}`}>
                {shift.status}
              </span>
              <div>
                <p className="font-medium">{shift.date}</p>
                <p className="text-sm text-muted-foreground">
                  {shift.startTime} - {shift.endTime} ({shift.type})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="rounded-button">
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => controller.handleDeleteShift(shift.id)}
                className="rounded-button text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};
