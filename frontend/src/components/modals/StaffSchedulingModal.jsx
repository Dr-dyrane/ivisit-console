import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  X,
  Save,
  Edit,
  Trash2,
  User,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const StaffSchedulingModal = ({ isOpen, onClose, hospitalId, existingStaff = [] }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'add', 'edit'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({
    staffId: '',
    date: '',
    startTime: '',
    endTime: '',
    shiftType: 'day',
    notes: ''
  });

  // Mock data - replace with real API calls
  const [staffList] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', role: 'Doctor', department: 'Emergency' },
    { id: 2, name: 'Dr. Michael Chen', role: 'Doctor', department: 'Emergency' },
    { id: 3, name: 'Nurse Emily Davis', role: 'Nurse', department: 'Emergency' },
    { id: 4, name: 'Driver James Wilson', role: 'Driver', department: 'Ambulance' },
  ]);

  const [mockSchedules] = useState([
    {
      id: 1,
      staffId: 1,
      staffName: 'Dr. Sarah Johnson',
      date: '2026-01-26',
      startTime: '08:00',
      endTime: '16:00',
      shiftType: 'day',
      status: 'scheduled'
    },
    {
      id: 2,
      staffId: 2,
      staffName: 'Dr. Michael Chen',
      date: '2026-01-26',
      startTime: '16:00',
      endTime: '00:00',
      shiftType: 'evening',
      status: 'scheduled'
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setSchedules(mockSchedules);
    }
  }, [isOpen]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'on-duty': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getShiftTypeColor = (type) => {
    switch (type) {
      case 'day': return 'bg-yellow-50 border-yellow-200';
      case 'evening': return 'bg-orange-50 border-orange-200';
      case 'night': return 'bg-indigo-50 border-indigo-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const handleAddSchedule = () => {
    if (newSchedule.staffId && newSchedule.date && newSchedule.startTime && newSchedule.endTime) {
      const staff = staffList.find(s => s.id === parseInt(newSchedule.staffId));
      const schedule = {
        id: schedules.length + 1,
        staffId: parseInt(newSchedule.staffId),
        staffName: staff.name,
        date: newSchedule.date,
        startTime: newSchedule.startTime,
        endTime: newSchedule.endTime,
        shiftType: newSchedule.shiftType,
        status: 'scheduled',
        notes: newSchedule.notes
      };
      setSchedules([...schedules, schedule]);
      setNewSchedule({ staffId: '', date: '', startTime: '', endTime: '', shiftType: 'day', notes: '' });
      setActiveTab('overview');
    }
  };

  const handleDeleteSchedule = (scheduleId) => {
    setSchedules(schedules.filter(s => s.id !== scheduleId));
  };

  const handleEditSchedule = (schedule) => {
    setSelectedStaff(schedule);
    setNewSchedule({
      staffId: schedule.staffId.toString(),
      date: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      shiftType: schedule.shiftType,
      notes: schedule.notes || ''
    });
    setActiveTab('edit');
  };

  const handleUpdateSchedule = () => {
    if (selectedStaff && newSchedule.staffId && newSchedule.date) {
      const staff = staffList.find(s => s.id === parseInt(newSchedule.staffId));
      const updatedSchedules = schedules.map(s => 
        s.id === selectedStaff.id 
          ? {
              ...s,
              staffId: parseInt(newSchedule.staffId),
              staffName: staff.name,
              date: newSchedule.date,
              startTime: newSchedule.startTime,
              endTime: newSchedule.endTime,
              shiftType: newSchedule.shiftType,
              notes: newSchedule.notes
            }
          : s
      );
      setSchedules(updatedSchedules);
      setNewSchedule({ staffId: '', date: '', startTime: '', endTime: '', shiftType: 'day', notes: '' });
      setSelectedStaff(null);
      setActiveTab('overview');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Staff Scheduling</h2>
              <p className="text-sm text-gray-600 mt-1">Manage staff shifts and schedules</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              <Calendar className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('add')}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Add Shift
            </button>
            {activeTab === 'edit' && (
              <button
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors border-blue-500 text-blue-600`}
              >
                <Edit className="w-4 h-4 inline mr-2" />
                Edit Shift
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Staff</p>
                        <p className="text-2xl font-bold text-gray-900">{staffList.length}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Scheduled Today</p>
                        <p className="text-2xl font-bold text-green-600">
                          {schedules.filter(s => s.date === '2026-01-26').length}
                        </p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Week</p>
                        <p className="text-2xl font-bold text-purple-600">{schedules.length}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-purple-500" />
                    </div>
                  </Card>
                </div>

                {/* Schedule List */}
                <Card className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Current Schedule</h3>
                  <div className="space-y-3">
                    {schedules.map(schedule => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                            {schedule.staffName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium">{schedule.staffName}</p>
                            <p className="text-sm text-gray-500">
                              {schedule.date} • {schedule.startTime} - {schedule.endTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getShiftTypeColor(schedule.shiftType)}>
                            {schedule.shiftType}
                          </Badge>
                          <Badge className={getStatusColor(schedule.status)}>
                            {schedule.status}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSchedule(schedule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {(activeTab === 'add' || activeTab === 'edit') && (
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    {activeTab === 'add' ? 'Add New Shift' : 'Edit Shift'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Staff Member</label>
                      <Select value={newSchedule.staffId} onValueChange={(value) => setNewSchedule({...newSchedule, staffId: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select staff" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffList.map(staff => (
                            <SelectItem key={staff.id} value={staff.id.toString()}>
                              {staff.name} - {staff.role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Date</label>
                      <input
                        type="date"
                        value={newSchedule.date}
                        onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Start Time</label>
                      <input
                        type="time"
                        value={newSchedule.startTime}
                        onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">End Time</label>
                      <input
                        type="time"
                        value={newSchedule.endTime}
                        onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Shift Type</label>
                      <Select value={newSchedule.shiftType} onValueChange={(value) => setNewSchedule({...newSchedule, shiftType: value})}>
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

                    <div>
                      <label className="block text-sm font-medium mb-2">Notes (Optional)</label>
                      <input
                        type="text"
                        value={newSchedule.notes}
                        onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
                        placeholder="Additional notes..."
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setActiveTab('overview');
                        setNewSchedule({ staffId: '', date: '', startTime: '', endTime: '', shiftType: 'day', notes: '' });
                        setSelectedStaff(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={activeTab === 'add' ? handleAddSchedule : handleUpdateSchedule}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {activeTab === 'add' ? 'Add Shift' : 'Update Shift'}
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StaffSchedulingModal;
