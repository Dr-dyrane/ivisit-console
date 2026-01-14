import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

export const DoctorModal = ({ isOpen, onClose, doctor, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [hospitals, setHospitals] = useState([]);
  const [formData, setFormData] = useState(doctor || {
    name: '',
    specialization: '',
    phone: '',
    email: '',
    hospital_id: '',
    status: 'available',
    rating: 4.5,
    experience: 5,
    license_number: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    if (doctor) {
      setFormData(doctor);
    }
  }, [doctor]);

  const fetchHospitals = async () => {
    try {
      const { data } = await supabase.from('hospitals').select('id, name');
      setHospitals(data || []);
    } catch (error) {
      console.error('Error fetching hospitals:', error);
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
      delete submitData.hospitals; // Remove joined data

      if (isCreate) {
        const { error } = await supabase
          .from('doctors')
          .insert([submitData]);
        
        if (error) throw error;
        toast.success('Doctor added successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('doctors')
          .update(submitData)
          .eq('id', doctor.id);
        
        if (error) throw error;
        toast.success('Doctor updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving doctor:', error);
      toast.error('Failed to save doctor');
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
              {isView && 'Doctor Details'}
              {isEdit && 'Edit Doctor'}
              {isCreate && 'Add New Doctor'}
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
              <Label htmlFor="name" className="font-bold text-sm mb-2 block">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
                placeholder="Dr. John Smith"
              />
            </div>

            <div>
              <Label htmlFor="specialization" className="font-bold text-sm mb-2 block">Specialization</Label>
              <Input
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
                placeholder="Cardiology"
              />
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
              <Label htmlFor="phone" className="font-bold text-sm mb-2 block">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="+234 xxx xxx xxxx"
              />
            </div>

            <div>
              <Label htmlFor="email" className="font-bold text-sm mb-2 block">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="doctor@hospital.com"
              />
            </div>

            <div>
              <Label htmlFor="license_number" className="font-bold text-sm mb-2 block">License Number</Label>
              <Input
                id="license_number"
                name="license_number"
                value={formData.license_number}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
                placeholder="MD-12345"
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
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="experience" className="font-bold text-sm mb-2 block">Experience (years)</Label>
              <Input
                id="experience"
                name="experience"
                type="number"
                min="0"
                value={formData.experience}
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
                  {loading ? 'Saving...' : (isCreate ? 'Add Doctor' : 'Update Doctor')}
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
