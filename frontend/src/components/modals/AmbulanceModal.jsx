import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export const AmbulanceModal = ({ isOpen, onClose, ambulance, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(ambulance || {
    call_sign: '',
    type: 'basic',
    status: 'available',
    vehicle_number: '',
    hospital: '',
    eta: '',
    rating: 4.5,
    last_maintenance: '',
  });

  const [loading, setLoading] = useState(false);

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
      if (isCreate) {
        const { error } = await supabase
          .from('ambulances')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('Ambulance created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('ambulances')
          .update(formData)
          .eq('id', ambulance.id);
        
        if (error) throw error;
        toast.success('Ambulance updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving ambulance:', error);
      toast.error('Failed to save ambulance');
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
              {isView && 'Ambulance Details'}
              {isEdit && 'Edit Ambulance'}
              {isCreate && 'Add New Ambulance'}
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
              <Label htmlFor="call_sign" className="font-bold text-sm mb-2 block">Call Sign</Label>
              <Input
                id="call_sign"
                name="call_sign"
                value={formData.call_sign}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
                placeholder="Medic 1"
              />
            </div>

            <div>
              <Label htmlFor="vehicle_number" className="font-bold text-sm mb-2 block">Vehicle Number</Label>
              <Input
                id="vehicle_number"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
                placeholder="ALS-201"
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
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                  <SelectItem value="critical">Critical Care</SelectItem>
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
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="en_route">En Route</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="hospital" className="font-bold text-sm mb-2 block">Assigned Hospital</Label>
              <Input
                id="hospital"
                name="hospital"
                value={formData.hospital}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="City General Hospital"
              />
            </div>

            <div>
              <Label htmlFor="eta" className="font-bold text-sm mb-2 block">ETA</Label>
              <Input
                id="eta"
                name="eta"
                value={formData.eta}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="5 mins"
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

            <div className="col-span-2">
              <Label htmlFor="last_maintenance" className="font-bold text-sm mb-2 block">Last Maintenance</Label>
              <Input
                id="last_maintenance"
                name="last_maintenance"
                type="date"
                value={formData.last_maintenance}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
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
                  {loading ? 'Saving...' : (isCreate ? 'Create Ambulance' : 'Update Ambulance')}
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
