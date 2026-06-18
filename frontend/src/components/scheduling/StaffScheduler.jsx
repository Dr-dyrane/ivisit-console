import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const StaffScheduler = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'week', 'month', 'day'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  
  // Mock data - replace with real API calls
  const [staffList] = useState([
    { id: 1, name: 'Dr. Sarah Johnson', role: 'Doctor', department: 'Emergency', avatar: 'SJ' },
    { id: 2, name: 'Dr. Michael Chen', role: 'Doctor', department: 'Emergency', avatar: 'MC' },
    { id: 3, name: 'Nurse Emily Davis', role: 'Nurse', department: 'Emergency', avatar: 'ED' },
    { id: 4, name: 'Driver James Wilson', role: 'Driver', department: 'Ambulance', avatar: 'JW' },
    { id: 5, name: 'Dr. Lisa Anderson', role: 'Doctor', department: 'ICU', avatar: 'LA' },
  ]);

  const [shifts, setShifts] = useState([
    {
      id: 1,
      staffId: 1,
      date: '2026-01-26',
      startTime: '08:00',
      endTime: '16:00',
      type: 'day',
      status: 'scheduled',
      department: 'Emergency'
    },
    {
      id: 2,
      staffId: 2,
      date: '2026-01-26',
      startTime: '16:00',
      endTime: '00:00',
      type: 'evening',
      status: 'scheduled',
      department: 'Emergency'
    },
    {
      id: 3,
      staffId: 4,
      date: '2026-01-26',
      startTime: '00:00',
      endTime: '08:00',
      type: 'night',
      status: 'on-duty',
      department: 'Ambulance'
    },
  ]);

  const [newShift, setNewShift] = useState({
    staffId: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'day',
    notes: ''
  });

  // Get days for current view
  const getDaysForView = () => {
    const days = [];
    const start = new Date(currentDate);
    
    if (viewMode === 'week') {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      
      for (let i = 0; i < 7; i++) {
        const day = new Date(start);
        day.setDate(start.getDate() + i);
        days.push(day);
      }
    } else if (viewMode === 'month') {
      const year = start.getFullYear();
      const month = start.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
      }
    } else {
      days.push(new Date(start));
    }
    
    return days;
  };

  const getShiftsForDay = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr);
  };

  const getShiftStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on-duty': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'absent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const handleAddShift = () => {
    if (newShift.staffId && newShift.date && newShift.startTime && newShift.endTime) {
      const shift = {
        id: shifts.length + 1,
        ...newShift,
        status: 'scheduled',
        department: staffList.find(s => s.id === parseInt(newShift.staffId))?.department || 'General'
      };
      setShifts([...shifts, shift]);
      setNewShift({ staffId: '', date: '', startTime: '', endTime: '', type: 'day', notes: '' });
      setShowAddModal(false);
    }
  };

  const handleDeleteShift = (shiftId) => {
    setShifts(shifts.filter(shift => shift.id !== shiftId));
  };

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || staff.department === filterDepartment;
    return matchesSearch && matchesDepartment;
  });

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const days = getDaysForView();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Scheduling</h1>
          <p className="text-gray-600 mt-1">Manage staff shifts and schedules</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Shift
        </Button>
      </div>

      {/* Controls */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate(-1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium min-w-[200px] text-center">
              {currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric',
                ...(viewMode === 'week' && { day: 'numeric' })
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate(1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Emergency">Emergency</SelectItem>
                <SelectItem value="ICU">ICU</SelectItem>
                <SelectItem value="Ambulance">Ambulance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Staff List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Members
            </h3>
            <div className="space-y-2">
              {filteredStaff.map(staff => (
                <div
                  key={staff.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedStaff?.id === staff.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedStaff(staff)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                      {staff.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{staff.name}</p>
                      <p className="text-xs text-gray-500">{staff.role} • {staff.department}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-3">
          <Card className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayShifts = getShiftsForDay(day);
                const isToday = day.toDateString() === new Date().toDateString();
                
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`min-h-[120px] p-2 border rounded-lg ${
                      isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-sm font-medium mb-2">
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayShifts.map(shift => {
                        const staff = staffList.find(s => s.id === shift.staffId);
                        return (
                          <motion.div
                            key={shift.id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-xs p-1 rounded border ${getShiftTypeColor(shift.type)} ${getShiftStatusColor(shift.status)}`}
                          >
                            <div className="font-medium truncate">
                              {staff?.name}
                            </div>
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
      </div>

      {/* Shift Details */}
      {selectedStaff && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Shifts for {selectedStaff.name}</h3>
          <div className="space-y-2">
            {shifts
              .filter(shift => shift.staffId === selectedStaff.id)
              .map(shift => (
                <motion.div
                  key={shift.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={getShiftStatusColor(shift.status)}>
                      {shift.status}
                    </Badge>
                    <div>
                      <p className="font-medium">{shift.date}</p>
                      <p className="text-sm text-gray-500">
                        {shift.startTime} - {shift.endTime} ({shift.type})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteShift(shift.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
          </div>
        </Card>
      )}

      {/* Add Shift Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add New Shift</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Staff Member</label>
                  <Select value={newShift.staffId} onValueChange={(value) => setNewShift({...newShift, staffId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredStaff.map(staff => (
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
                    value={newShift.date}
                    onChange={(e) => setNewShift({...newShift, date: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={newShift.startTime}
                      onChange={(e) => setNewShift({...newShift, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <Input
                      type="time"
                      value={newShift.endTime}
                      onChange={(e) => setNewShift({...newShift, endTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Shift Type</label>
                  <Select value={newShift.type} onValueChange={(value) => setNewShift({...newShift, type: value})}>
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
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddShift}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Add Shift
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffScheduler;
