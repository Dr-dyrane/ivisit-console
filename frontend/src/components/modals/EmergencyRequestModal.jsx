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

export const EmergencyRequestModal = ({ isOpen, onClose, request, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(request || {
    user_id: '',
    emergency_type: '',
    priority: 'medium',
    status: 'pending',
    location: '',
    latitude: null,
    longitude: null,
    description: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (request) {
      setFormData(request);
    }
  }, [request]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('profiles').select('id, username, email, phone');
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = { ...formData };
      delete submitData.profiles;

      if (isCreate) {
        const { error } = await supabase
          .from('emergency_requests')
          .insert([submitData]);
        
        if (error) throw error;
        toast.success('Emergency request created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('emergency_requests')
          .update(submitData)
          .eq('id', request.id);
        
        if (error) throw error;
        toast.success('Emergency request updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving emergency request:', error);
      toast.error('Failed to save emergency request');
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
              {isView && 'Emergency Request Details'}
              {isEdit && 'Edit Emergency Request'}
              {isCreate && 'Create Emergency Request'}
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
            <div className="col-span-2">
              <Label htmlFor="user_id" className="font-bold text-sm mb-2 block">Requester</Label>
              <Select 
                value={formData.user_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue placeholder="Select requester" />
                </SelectTrigger>
                <SelectContent className="squircle">
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username || u.email} {u.phone && `(${u.phone})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="emergency_type" className="font-bold text-sm mb-2 block">Emergency Type</Label>
              <Select 
                value={formData.emergency_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="cardiac">Cardiac Emergency</SelectItem>
                  <SelectItem value="accident">Accident/Trauma</SelectItem>
                  <SelectItem value="respiratory">Respiratory Emergency</SelectItem>
                  <SelectItem value="stroke">Stroke</SelectItem>
                  <SelectItem value="pregnancy">Pregnancy Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority" className="font-bold text-sm mb-2 block">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location" className="font-bold text-sm mb-2 block">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="Enter address or location"
              />
            </div>

            <div>
              <Label htmlFor="latitude" className="font-bold text-sm mb-2 block">Latitude</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                value={formData.latitude || ''}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="6.5244"
              />
            </div>

            <div>
              <Label htmlFor="longitude" className="font-bold text-sm mb-2 block">Longitude</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                value={formData.longitude || ''}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="3.3792"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="description" className="font-bold text-sm mb-2 block">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                rows={3}
                placeholder="Describe the emergency situation..."
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
                  {loading ? 'Saving...' : (isCreate ? 'Create Request' : 'Update Request')}
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
