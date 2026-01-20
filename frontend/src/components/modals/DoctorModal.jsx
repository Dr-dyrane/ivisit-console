import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Stethoscope, Mail, Phone, Building, Award, Star, Activity, User, Shield } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';

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
      delete submitData.hospitals;

      if (isCreate) {
        const { data, error } = await supabase
          .from('doctors')
          .insert([submitData])
          .select();

        if (error) throw error;
        await createNotification(
          NotificationTypes.DOCTOR,
          NotificationActions.CREATED,
          data?.[0]?.id || 'unknown',
          { message: `Dr. ${submitData.name} has been added to the system` }
        );
        toast.success('Doctor added successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('doctors')
          .update(submitData)
          .eq('id', doctor.id);

        if (error) throw error;
        await createNotification(
          NotificationTypes.DOCTOR,
          NotificationActions.UPDATED,
          doctor.id,
          { message: `Dr. ${submitData.name} information has been updated` }
        );
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-md"
            onClick={() => onClose(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div className="hidden sm:block">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground/90">
                    {formData.name || 'Professional Profile'}
                  </h2>
                  <p className="text-sm text-muted-foreground">{formData.specialization || 'Medical Specialist'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={`rounded-full px-4 py-1 border-0 ${formData.status === 'available' ? 'bg-green-500/10 text-green-500' :
                    formData.status === 'busy' ? 'bg-orange-500/10 text-orange-500' : 'bg-muted/10 text-muted-foreground'
                  }`}>
                  {formData.status?.toUpperCase()}
                </Badge>
                <Button
                  variant="ghost"
                  onClick={() => onClose(false)}
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">

              {/* Profile Summary Bubbles */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Award className="w-5 h-5 text-primary opacity-60" />
                  </div>
                  <p className="text-xl font-semibold">{formData.experience}+</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Years Exp</p>
                </div>
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Star className="w-5 h-5 text-yellow-500 opacity-60 fill-yellow-500/20" />
                  </div>
                  <p className="text-xl font-semibold">{formData.rating}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">Rating</p>
                </div>
                <div className="p-4 rounded-[24px] bg-white/5 border border-white/10 text-center">
                  <div className="flex justify-center mb-1">
                    <Shield className="w-5 h-5 text-blue-500 opacity-60" />
                  </div>
                  <p className="text-xl font-semibold truncate px-1">{formData.license_number?.slice(0, 8) || 'MD-...'}</p>
                  <p className="text-[10px] uppercase tracking-widest opacity-50">License</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <GlassCard icon={<User className="text-primary" />} title="Personal Details">
                    <div className="space-y-4">
                      <div className="flex justify-center mb-4">
                        <Avatar className="h-24 w-24 rounded-[32px] border-4 border-white/5 shadow-2xl">
                          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name}`} />
                          <AvatarFallback className="text-2xl font-semibold">{formData.name?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Full Name</Label>
                          <Input
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            disabled={isView}
                            required
                            placeholder="Dr. John Smith"
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Specialty</Label>
                          <Input
                            name="specialization"
                            value={formData.specialization}
                            onChange={handleChange}
                            disabled={isView}
                            required
                            placeholder="Cardiology"
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                          />
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Professional & Contact */}
                  <div className="space-y-6">
                    <GlassCard icon={<Building className="text-purple-500" />} title="Professional">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Primary Hospital</Label>
                          <Select
                            value={formData.hospital_id}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                            disabled={isView}
                          >
                            <SelectTrigger className="rounded-xl bg-white/5 border-white/10 h-11">
                              <SelectValue placeholder="Select hospital" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-white/10 bg-background/95 backdrop-blur-xl">
                              {hospitals.map(h => (
                                <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">License Number</Label>
                          <Input
                            name="license_number"
                            value={formData.license_number}
                            onChange={handleChange}
                            disabled={isView}
                            placeholder="MD-123456"
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-mono"
                          />
                        </div>
                      </div>
                    </GlassCard>

                    <GlassCard icon={<Phone className="text-green-500" />} title="Contact Info">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Email Address</Label>
                          <Input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={isView}
                            className="rounded-xl bg-white/5 border-white/10 h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest opacity-50 ml-1">Phone Number</Label>
                          <Input
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            disabled={isView}
                            className="rounded-xl bg-white/5 border-white/10 h-11 font-mono"
                          />
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onClose(false)}
                    className="rounded-full px-8 h-12 font-semibold"
                  >
                    {isView ? 'Dismiss' : 'Cancel'}
                  </Button>
                  {!isView && (
                    <Button
                      type="submit"
                      disabled={loading}
                      className="rounded-full px-12 h-12 bg-primary hover:bg-primary/90 text-white font-semibold shadow-lg shadow-primary/20"
                    >
                      {loading ? 'Saving...' : (isCreate ? 'Add Professional' : 'Save Changes')}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */

const GlassCard = ({ children, title, icon, className }) => (
  <div className={`p-4 sm:p-6 rounded-[28px] bg-white/5 border-white/10 ${className}`}>
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-semibold tracking-tight text-sm sm:text-base">{title}</h3>
    </div>
    {children}
  </div>
);
