import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export const VisitModal = ({ isOpen, onClose, visit, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [formData, setFormData] = useState(visit || {
    user_id: '',
    hospital_id: '',
    visit_type: 'checkup',
    status: 'scheduled',
    scheduled_at: '',
    notes: '',
    reason: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    if (visit) {
      setFormData({
        ...visit,
        scheduled_at: visit.scheduled_at ? new Date(visit.scheduled_at).toISOString().slice(0, 16) : ''
      });
    }
  }, [visit]);

  const fetchOptions = async () => {
    try {
      const [usersRes, hospitalsRes] = await Promise.all([
        supabase.from('profiles').select('id, username, email'),
        supabase.from('hospitals').select('id, name')
      ]);
      setUsers(usersRes.data || []);
      setHospitals(hospitalsRes.data || []);
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;
      delete submitData.hospitals;

      if (isCreate) {
        const { error } = await supabase
          .from('visits')
          .insert([submitData]);
        
        if (error) throw error;
        toast.success('Visit scheduled successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('visits')
          .update(submitData)
          .eq('id', visit.id);
        
        if (error) throw error;
        toast.success('Visit updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving visit:', error);
      toast.error('Failed to save visit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-lg glass shadow-premium border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-black text-2xl tracking-tight">
              {isView && 'Visit Details'}
              {isEdit && 'Edit Visit'}
              {isCreate && 'Schedule New Visit'}
            </DialogTitle>
            <button 
              onClick={() => onClose(false)}
              className="w-10 h-10 squircle hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_id" className="font-bold text-sm mb-2 block">Patient</Label>
              <Select 
                value={formData.user_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="squircle">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.username || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hospital_id" className="font-bold text-sm mb-2 block">Hospital</Label>
              <Select 
                value={formData.hospital_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent className="squircle">
                  {hospitals.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="visit_type" className="font-bold text-sm mb-2 block">Visit Type</Label>
              <Select 
                value={formData.visit_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, visit_type: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="checkup">Checkup</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="surgery">Surgery</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status" className="font-bold text-sm mb-2 block">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="scheduled_at" className="font-bold text-sm mb-2 block">Scheduled Date & Time</Label>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="reason" className="font-bold text-sm mb-2 block">Reason for Visit</Label>
              <Input
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="e.g., Annual checkup, Follow-up appointment"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes" className="font-bold text-sm mb-2 block">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                rows={3}
                placeholder="Additional notes about the visit..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            {!isView && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClose(false)}
                  className="squircle"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="squircle bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : (isCreate ? 'Schedule Visit' : 'Update Visit')}
                </Button>
              </>
            )}
            {isView && (
              <Button
                type="button"
                onClick={() => onClose(false)}
                className="squircle bg-primary hover:bg-primary/90"
              >
                Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
