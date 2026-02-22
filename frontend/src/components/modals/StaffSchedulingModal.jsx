import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  Plus,
  X,
  Save,
  Edit,
  Trash2,
  CheckCircle,
  CalendarDays,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { handleApiError } from "../../utils/errorHandler";
import { 
  getStaffSchedules, 
  createStaffSchedule, 
  updateStaffSchedule, 
  deleteStaffSchedule,
  getAvailableStaff,
  getScheduleStats,
  checkScheduleConflicts
} from '../../services/staffSchedulingService';

const StaffSchedulingModal = ({ isOpen, onClose, hospitalId, existingStaff = [] }) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'add', 'edit'
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingStaff, setFetchingStaff] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    profile_id: '',
    hospital_id: hospitalId || '',
    date: new Date().toISOString().split('T')[0], // Default to today
    start_time: '09:00', // Default clinic hours
    end_time: '17:00',
    shift_type: 'day',
    notes: '',
    schedule_type: 'doctor_shift' // Default to doctor scheduling
  });

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSchedulingData();
    }
  }, [isOpen, hospitalId]);

  // Keep mobile bottom bar from overlapping the modal layer.
  useEffect(() => {
    const bottomBar = document.getElementById('dynamic-bottom-bar');
    if (!bottomBar) return undefined;

    const previousDisplay = bottomBar.style.display;
    if (isOpen) {
      bottomBar.style.display = 'none';
    }

    return () => {
      bottomBar.style.display = previousDisplay;
    };
  }, [isOpen]);

  const loadSchedulingData = async () => {
    try {
      setLoading(true);
      
      // Load schedules
      const { schedules: scheduleData } = await getStaffSchedules({
        hospital_id: hospitalId
      });
      setSchedules(scheduleData);

      // Load available staff
      setFetchingStaff(true);
      const staff = await getAvailableStaff(hospitalId);
      setStaffList(staff);

      // Load statistics
      const today = new Date().toISOString().split('T')[0];
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() + 7);
      const statsData = await getScheduleStats(hospitalId, today, weekEnd.toISOString().split('T')[0]);
      setStats(statsData);

    } catch (error) {
      console.error('Error loading scheduling data:', error);
      handleApiError(error, 'fetch');
    } finally {
      setLoading(false);
      setFetchingStaff(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'on-duty': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'completed': return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const getShiftTypeColor = (type) => {
    switch (type) {
      case 'day': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'evening': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'night': return 'bg-indigo-500/20 text-indigo-500 border-indigo-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.profile_id || !newSchedule.date) {
      toast.error('Please select a staff member and date');
      return;
    }

    try {
      setLoading(true);

      // Check for conflicts
      const conflicts = await checkScheduleConflicts(
        newSchedule.profile_id,
        newSchedule.date,
        newSchedule.start_time,
        newSchedule.end_time
      );

      if (conflicts.has_conflicts) {
        toast.error('Scheduling conflict detected! This staff member is not available.');
        return;
      }

      // Find the staff member to determine schedule type
      const staffMember = staffList.find(s => s.id === newSchedule.profile_id);
      
      if (!staffMember) {
        toast.error('Staff member not found');
        return;
      }

      // Create schedule data based on staff type
      let scheduleData = {
        ...newSchedule,
        hospital_id: hospitalId,
        status: 'on_duty'
      };

      if (staffMember.profile_type === 'doctor' && staffMember.doctor_id) {
        scheduleData.schedule_type = 'doctor_shift';
        scheduleData.doctor_id = staffMember.doctor_id;
      } else {
        toast.error('Only doctor scheduling is currently supported');
        return;
      }

      const createdSchedule = await createStaffSchedule(scheduleData);
      
      // Refresh schedules
      await loadSchedulingData();
      
      // Reset form
      setNewSchedule({
        profile_id: '',
        hospital_id: hospitalId || '',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        shift_type: 'day',
        notes: '',
        schedule_type: 'doctor_shift'
      });
      setActiveTab('overview');
      
      toast.success('Staff member scheduled successfully');

    } catch (error) {
      console.error('Error adding schedule:', error);
      handleApiError(error, 'create');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    try {
      setLoading(true);
      await deleteStaffSchedule(scheduleId);
      await loadSchedulingData();
      toast.success('Shift deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      handleApiError(error, 'delete');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule) => {
    setSelectedStaff(schedule);
    setNewSchedule({
      profile_id: schedule.profile_id?.toString() || '',
      hospital_id: hospitalId || '',
      date: schedule.date || new Date().toISOString().split('T')[0],
      start_time: schedule.start_time || '09:00',
      end_time: schedule.end_time || '17:00',
      shift_type: schedule.shift_type || 'day',
      notes: schedule.notes || '',
      schedule_type: schedule.schedule_type || 'doctor_shift',
      doctor_id: schedule.doctor_id
    });
    setActiveTab('edit');
  };

  const handleUpdateSchedule = async () => {
    if (!selectedStaff || !newSchedule.profile_id || !newSchedule.date) {
      toast.error('Please select a staff member and date');
      return;
    }

    try {
      setLoading(true);

      // Check for conflicts (excluding current schedule)
      const conflicts = await checkScheduleConflicts(
        newSchedule.profile_id,
        newSchedule.date,
        newSchedule.start_time,
        newSchedule.end_time,
        selectedStaff.id
      );

      if (conflicts.has_conflicts) {
        toast.error('Scheduling conflict detected! This staff member is not available.');
        return;
      }

      // Update schedule
      const updatedSchedule = await updateStaffSchedule(selectedStaff.id, {
        status: newSchedule.status || 'on_duty'
      });
      
      // Refresh schedules
      await loadSchedulingData();
      
      // Reset form
      setNewSchedule({
        profile_id: '',
        hospital_id: hospitalId || '',
        date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '17:00',
        shift_type: 'day',
        notes: '',
        schedule_type: 'doctor_shift'
      });
      setSelectedStaff(null);
      setActiveTab('overview');
      
      toast.success('Schedule updated successfully');

    } catch (error) {
      console.error('Error updating schedule:', error);
      handleApiError(error, 'update');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4"
          style={{
            paddingTop: 'max(12px, var(--safe-top, 0px))',
            paddingBottom: 'max(12px, calc(var(--safe-bottom, 0px) + 12px))'
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
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl max-h-[92dvh] overflow-hidden rounded-[32px] shadow-2xl"
            style={{
              maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 24px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-2 md:p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2 md:p-2.5 bg-purple-500/20 rounded-2xl">
                  <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-purple-500" />
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
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Glassmorphic Tabs */}
            <div className="flex gap-1 p-2 md:p-8 pt-2">
              <button
                className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'overview'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-transparent'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                <Calendar className="w-4 h-4" />
                Overview
              </button>
              <button
                className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-xl transition-all ${
                  activeTab === 'add'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-transparent'
                }`}
                onClick={() => setActiveTab('add')}
              >
                <Plus className="w-4 h-4" />
                Add Shift
              </button>
              {activeTab === 'edit' && (
                <button
                  className={`flex items-center gap-2 px-3 md:px-6 py-2 md:py-3 text-xs md:text-sm font-medium rounded-xl transition-all bg-primary/20 text-primary border border-primary/30`}
                >
                  <Edit className="w-4 h-4" />
                  Edit Shift
                </button>
              )}
            </div>

            <div
              className="p-2 md:p-8 pt-2 overflow-y-auto space-y-6 no-scrollbar"
              style={{
                maxHeight: 'calc(100dvh - var(--safe-top, 0px) - var(--safe-bottom, 0px) - 240px)'
              }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                      <div className="flex justify-center mb-2">
                        {loading ? (
                          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        ) : (
                          <Users className="w-6 h-6 text-blue-500 opacity-60" />
                        )}
                      </div>
                      <p className="text-xl md:text-2xl font-bold">{staffList.length}</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-50">Total Staff</p>
                    </div>
                    <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                      <div className="flex justify-center mb-2">
                        {loading ? (
                          <Loader2 className="w-6 h-6 text-green-500 animate-spin" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-500 opacity-60" />
                        )}
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-green-400">
                        {stats?.scheduled_today || 0}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest opacity-50">Scheduled Today</p>
                    </div>
                    <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                      <div className="flex justify-center mb-2">
                        {loading ? (
                          <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                        ) : (
                          <Calendar className="w-6 h-6 text-purple-500 opacity-60" />
                        )}
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-purple-400">{stats?.this_week || 0}</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-50">This Week</p>
                    </div>
                  </div>

                  {/* Schedule List */}
                  <GlassCard icon={<CalendarDays className="text-purple-500" />} title="Current Schedule">
                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
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
                        {schedules.map(schedule => (
                          <div
                            key={schedule.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                                {schedule.profiles?.full_name?.split(' ').map(n => n[0]).join('') || 
                                 schedule.profile_name?.split(' ').map(n => n[0]).join('') || '??'}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground/90">
                                  {schedule.profiles?.full_name || schedule.profile_name || 'Unknown Staff'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {schedule.specialization && `${schedule.specialization} • `}
                                  {schedule.ambulance_call_sign && `${schedule.ambulance_call_sign} • `}
                                  {schedule.date}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`squircle-sm ${getShiftTypeColor(schedule.shift_type)} border-0 font-bold`}>
                                {schedule.shift_type}
                              </Badge>
                              <Badge className={`squircle-sm ${getStatusColor(schedule.status)} border-0 font-bold`}>
                                {schedule.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditSchedule(schedule)}
                                className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary"
                                disabled={loading}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                                className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                disabled={loading}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
              </div>
            )}

            {(activeTab === 'add' || activeTab === 'edit') && (
              <GlassCard 
                icon={activeTab === 'add' ? <Plus className="text-green-500" /> : <Edit className="text-blue-500" />} 
                title={activeTab === 'add' ? 'Add New Shift' : 'Edit Shift'}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Staff Member</Label>
                    <Select 
                      value={newSchedule.profile_id} 
                      onValueChange={(value) => setNewSchedule({...newSchedule, profile_id: value})}
                      disabled={fetchingStaff}
                    >
                      <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-12">
                        <SelectValue placeholder={fetchingStaff ? "Loading staff..." : "Select staff member"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                        {staffList.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {fetchingStaff ? 'Loading staff...' : 'No staff available'}
                          </div>
                        ) : (
                          staffList.map(staff => (
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
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Date</Label>
                    <Input
                      type="date"
                      value={newSchedule.date}
                      onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                      className="rounded-xl bg-white/5 border-white/10 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Start Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.start_time}
                      onChange={(e) => setNewSchedule({...newSchedule, start_time: e.target.value})}
                      className="rounded-xl bg-white/5 border-white/10 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">End Time</Label>
                    <Input
                      type="time"
                      value={newSchedule.end_time}
                      onChange={(e) => setNewSchedule({...newSchedule, end_time: e.target.value})}
                      className="rounded-xl bg-white/5 border-white/10 h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Shift Type</Label>
                    <Select 
                      value={newSchedule.shift_type} 
                      onValueChange={(value) => setNewSchedule({...newSchedule, shift_type: value})}
                    >
                      <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                        <SelectItem value="day">Day Shift</SelectItem>
                        <SelectItem value="evening">Evening Shift</SelectItem>
                        <SelectItem value="night">Night Shift</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Notes (Optional)</Label>
                    <Input
                      type="text"
                      value={newSchedule.notes}
                      onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})}
                      placeholder="Additional notes..."
                      className="rounded-xl bg-white/5 border-white/10 h-12"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={() => {
                      setActiveTab('overview');
                      setNewSchedule({
                        profile_id: '',
                        hospital_id: hospitalId || '',
                        date: new Date().toISOString().split('T')[0],
                        start_time: '09:00',
                        end_time: '17:00',
                        shift_type: 'day',
                        notes: '',
                        schedule_type: 'doctor_shift'
                      });
                      setSelectedStaff(null);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl"
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
              </GlassCard>
            )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* GlassCard Component */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-white/5 border border-white/10">
    {title && (
      <div className="flex items-center gap-3 mb-4 sm:mb-6">
        <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
          {icon}
        </div>
        <h3 className="text-base sm:text-lg font-semibold tracking-tight text-foreground/90">
          {title}
        </h3>
      </div>
    )}
    <div className="space-y-4 sm:space-y-6">
      {children}
    </div>
  </div>
);

export default StaffSchedulingModal;
