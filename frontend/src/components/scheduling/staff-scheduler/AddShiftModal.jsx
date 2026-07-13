import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

export const AddShiftModal = ({ controller }) => (
  <AnimatePresence>
    {controller.showAddModal && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={() => controller.setShowAddModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md rounded-modal bg-card/95 p-6 shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Add New Shift</h3>
            <Button variant="ghost" size="sm" onClick={() => controller.setShowAddModal(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Staff Member</label>
              <Select
                value={controller.newShift.staffId}
                onValueChange={(value) => controller.setNewShift({
                  ...controller.newShift,
                  staffId: value,
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {controller.filteredStaff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name} - {staff.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={controller.newShift.date}
                onChange={(event) => controller.setNewShift({
                  ...controller.newShift,
                  date: event.target.value,
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <Input
                  type="time"
                  value={controller.newShift.startTime}
                  onChange={(event) => controller.setNewShift({
                    ...controller.newShift,
                    startTime: event.target.value,
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <Input
                  type="time"
                  value={controller.newShift.endTime}
                  onChange={(event) => controller.setNewShift({
                    ...controller.newShift,
                    endTime: event.target.value,
                  })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Shift Type</label>
              <Select
                value={controller.newShift.type}
                onValueChange={(value) => controller.setNewShift({
                  ...controller.newShift,
                  type: value,
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day Shift</SelectItem>
                  <SelectItem value="evening">Evening Shift</SelectItem>
                  <SelectItem value="night">Night Shift</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => controller.setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1" onClick={controller.handleAddShift}>
              <Save className="w-4 h-4 mr-2" />
              Add Shift
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
