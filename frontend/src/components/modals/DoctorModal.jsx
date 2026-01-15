import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Stethoscope, Mail, Phone, Building, Award, Star, Activity, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
      <DialogContent className="squircle-2xl glass-strong border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Professional Profile Header */}
        <div className="relative h-40 bg-gradient-to-r from-primary/10 via-background to-background overflow-hidden">
             <div className="absolute inset-0 opacity-5" 
                  style={{ backgroundImage: 'radial-gradient(#7a1a1a 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
             </div>
             
             <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 rounded-full hover:bg-black/10 text-foreground z-20"
                onClick={() => onClose(false)}
            >
                <X className="w-6 h-6" />
            </Button>
        </div>

        <div className="px-8 pb-8 -mt-16 relative z-10 overflow-y-auto max-h-[calc(90vh-10rem)] custom-scrollbar">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-8">
                 <div className="relative">
                    <Avatar className="h-32 w-32 squircle-2xl border-4 border-background shadow-xl bg-muted">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`} className="object-cover" />
                        <AvatarFallback className="text-4xl font-black text-muted-foreground">
                            {formData.name?.[0]?.toUpperCase() || 'D'}
                        </AvatarFallback>
                    </Avatar>
                    <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-background ${
                        formData.status === 'available' ? 'bg-success' : 
                        formData.status === 'busy' ? 'bg-warning' : 'bg-muted'
                    }`} />
                 </div>

                 <div className="flex-1 space-y-1 mb-2">
                     <h2 className="text-3xl font-black tracking-tighter leading-none">
                         {formData.name || 'New Doctor'}
                     </h2>
                     <p className="text-lg font-medium text-primary">
                         {formData.specialization || 'Medical Specialist'}
                     </p>
                     <div className="flex items-center gap-3 pt-1">
                         <Badge className="squircle-sm bg-muted/50 text-muted-foreground border-0 font-mono text-xs">
                             LIC: {formData.license_number || 'PENDING'}
                         </Badge>
                     </div>
                 </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 squircle-xl bg-primary/5 border border-primary/10 text-center">
                        <div className="flex justify-center mb-2">
                            <Award className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-2xl font-black text-primary">{formData.experience}+</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Years Exp</p>
                    </div>
                    <div className="p-4 squircle-xl bg-warning/5 border border-warning/10 text-center">
                        <div className="flex justify-center mb-2">
                            <Star className="w-5 h-5 text-warning fill-warning" />
                        </div>
                        <p className="text-2xl font-black text-foreground">{formData.rating}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rating</p>
                    </div>
                    <div className="p-4 squircle-xl bg-info/5 border border-info/10 text-center">
                        <div className="flex justify-center mb-2">
                            <Activity className="w-5 h-5 text-info" />
                        </div>
                        <p className="text-2xl font-black text-foreground">Active</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                    </div>
                </div>

                {/* Personal & Professional Info */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Profile Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase">Full Name</Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={isView}
                                required
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold"
                                placeholder="Dr. John Smith"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specialization" className="text-xs font-bold text-muted-foreground uppercase">Specialty</Label>
                            <div className="relative">
                                <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="specialization"
                                    name="specialization"
                                    value={formData.specialization}
                                    onChange={handleChange}
                                    disabled={isView}
                                    required
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-medium"
                                    placeholder="Cardiology"
                                />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="license_number" className="text-xs font-bold text-muted-foreground uppercase">Medical License</Label>
                            <Input
                                id="license_number"
                                name="license_number"
                                value={formData.license_number}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                                placeholder="MD-123456"
                            />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase">Current Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="available">Available</SelectItem>
                                <SelectItem value="busy">Busy</SelectItem>
                                <SelectItem value="off_duty">Off Duty</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Contact & Affiliation */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Affiliation & Contact</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="hospital_id" className="text-xs font-bold text-muted-foreground uppercase">Primary Hospital</Label>
                            <Select 
                                value={formData.hospital_id} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue placeholder="Select hospital" />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                {hospitals.map(h => (
                                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-medium"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase">Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex gap-3 justify-end border-t border-border/50">
                    {!isView ? (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => onClose(false)}
                                className="squircle font-bold text-muted-foreground hover:bg-muted"
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="squircle-lg bg-primary hover:bg-primary/90 shadow-glow font-bold px-8"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : (isCreate ? 'Add Doctor' : 'Save Changes')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => onClose(false)}
                            className="squircle-lg bg-muted text-foreground hover:bg-muted/80 font-bold px-8"
                        >
                            Close
                        </Button>
                    )}
                </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
