import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export const HospitalModal = ({ isOpen, onClose, hospital, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(hospital || {
    name: '',
    address: '',
    phone: '',
    rating: 4.5,
    type: 'premium',
    emergency_level: 'Level 1 Trauma Center',
    available_beds: 10,
    ambulances_count: 5,
    wait_time: '10 mins',
    price_range: '$150',
    status: 'available',
    verified: false,
    latitude: 0,
    longitude: 0,
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isCreate) {
        const { error } = await supabase
          .from('hospitals')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Hospital created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('hospitals')
          .update(formData)
          .eq('id', hospital.id);
        
        if (error) throw error;
        toast.success('Hospital updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving hospital:', error);
      toast.error('Failed to save hospital');
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
              {isView && 'Hospital Details'}
              {isEdit && 'Edit Hospital'}
              {isCreate && 'Add New Hospital'}
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
              <Label htmlFor="name" className="font-bold text-sm mb-2 block">Hospital Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address" className="font-bold text-sm mb-2 block">Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="phone" className="font-bold text-sm mb-2 block">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="type" className="font-bold text-sm mb-2 block">Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="emergency_level" className="font-bold text-sm mb-2 block">Emergency Level</Label>
              <Input
                id="emergency_level"
                name="emergency_level"
                value={formData.emergency_level}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="available_beds" className="font-bold text-sm mb-2 block">Available Beds</Label>
              <Input
                id="available_beds"
                name="available_beds"
                type="number"
                value={formData.available_beds}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="ambulances_count" className="font-bold text-sm mb-2 block">Ambulances</Label>
              <Input
                id="ambulances_count"
                name="ambulances_count"
                type="number"
                value={formData.ambulances_count}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="wait_time" className="font-bold text-sm mb-2 block">Wait Time</Label>
              <Input
                id="wait_time"
                name="wait_time"
                value={formData.wait_time}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="rating" className="font-bold text-sm mb-2 block">Rating</Label>
              <Input
                id="rating"
                name="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
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
                  {loading ? 'Saving...' : (isCreate ? 'Create Hospital' : 'Update Hospital')}
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
