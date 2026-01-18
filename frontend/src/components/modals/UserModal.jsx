import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, User, Phone, Mail, MapPin, Calendar, Shield, CreditCard, BadgeCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { motion } from 'framer-motion';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';

export const UserModal = ({ isOpen, onClose, user, mode }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState(user || {
    username: '',
    email: '',
    phone: '',
    role: 'patient',
    provider_type: '',
    gender: '',
    date_of_birth: '',
    address: '',
    bvn_verified: false,
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
        const { data, error } = await supabase
          .from('profiles')
          .insert([formData])
          .select();
        
        if (error) throw error;
        await createNotification(
          NotificationTypes.USER,
          NotificationActions.CREATED,
          data?.[0]?.id || 'unknown',
          { message: `User ${formData.username} has been added to the system` }
        );
        toast.success('User created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', user.id);
        
        if (error) throw error;
        await createNotification(
          NotificationTypes.USER,
          NotificationActions.UPDATED,
          user.id,
          { message: `User ${formData.username} information has been updated` }
        );
        toast.success('User updated successfully');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl bg-background/50 backdrop-blur-xs border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Passport Header Design */}
        <div className="relative h-40 bg-gradient-to-r from-primary/20 to-secondary/20 overflow-hidden">
             {/* Decorative Patterns */}
             <div className="absolute inset-0 opacity-10" 
                  style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}>
             </div>
             
             <div className="absolute top-4 left-6 z-10">
                 <Badge className="squircle-sm bg-background/50 backdrop-blur-md text-foreground border-0 font-bold uppercase tracking-widest text-[10px] px-2 py-1">
                     Identity Document
                 </Badge>
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
                 <div className="relative group">
                    <Avatar className="h-32 w-32 squircle-2xl border-4 border-background shadow-xl">
                        <AvatarImage 
                            src={formData.imageuri || formData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.username}`} 
                            className="object-cover" 
                        />
                        <AvatarFallback className="text-4xl font-black bg-muted text-muted-foreground">
                            {formData.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                    </Avatar>
                    {isEdit && (
                         <div className="absolute inset-0 bg-black/40 squircle-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                             <span className="text-white text-xs font-bold">Change</span>
                         </div>
                    )}
                 </div>

                 <div className="flex-1 space-y-2">
                     <h2 className="text-4xl font-black tracking-tighter leading-none">
                         {formData.username || 'New User'}
                     </h2>
                     <div className="flex items-center gap-2 flex-wrap">
                         <Badge className="squircle-sm bg-primary/10 text-primary border-0 font-bold px-3 py-1">
                             {formData.role?.toUpperCase() || 'PATIENT'}
                         </Badge>
                         {formData.bvn_verified && (
                             <Badge className="squircle-sm bg-success/10 text-success border-0 font-bold px-3 py-1 flex items-center gap-1">
                                 <BadgeCheck className="w-3 h-3" /> VERIFIED
                             </Badge>
                         )}
                         <span className="text-sm text-muted-foreground font-mono">
                             ID: {user?.id?.slice(0, 8).toUpperCase() || 'UNKNOWN'}
                         </span>
                     </div>
                 </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs font-bold text-muted-foreground uppercase">Full Name</Label>
                            <Input
                                id="username"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-semibold"
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase">Email Address</Label>
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
                                    placeholder="john@example.com"
                                />
                             </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase">Phone Number</Label>
                             <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-mono"
                                    placeholder="+234..."
                                />
                             </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_of_birth" className="text-xs font-bold text-muted-foreground uppercase">Date of Birth</Label>
                             <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    id="date_of_birth"
                                    name="date_of_birth"
                                    type="date"
                                    value={formData.date_of_birth}
                                    onChange={handleChange}
                                    disabled={isView}
                                    className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 pl-10 font-medium"
                                />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Role & Access Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Role & Access</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label htmlFor="role" className="text-xs font-bold text-muted-foreground uppercase">System Role</Label>
                            <Select 
                                value={formData.role} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-semibold">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="provider">Provider</SelectItem>
                                <SelectItem value="patient">Patient</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                         {formData.role === 'provider' && (
                            <div className="space-y-2">
                                <Label htmlFor="provider_type" className="text-xs font-bold text-muted-foreground uppercase">Provider Type</Label>
                                <Select 
                                value={formData.provider_type} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, provider_type: value }))}
                                disabled={isView}
                                >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-semibold">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                    <SelectItem value="ambulance">Ambulance</SelectItem>
                                    <SelectItem value="doctor">Doctor</SelectItem>
                                    <SelectItem value="nurse">Nurse</SelectItem>
                                    <SelectItem value="paramedic">Paramedic</SelectItem>
                                </SelectContent>
                                </Select>
                            </div>
                        )}
                        
                        <div className="col-span-1 md:col-span-2 p-4 squircle-lg bg-primary/5 flex items-center justify-between border border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 squircle bg-primary/10 flex items-center justify-center text-primary">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Identity Verification</p>
                                    <p className="text-xs text-muted-foreground">BVN and document status</p>
                                </div>
                            </div>
                             <Switch
                                checked={formData.bvn_verified}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bvn_verified: checked }))}
                                disabled={isView}
                            />
                        </div>
                    </div>
                </div>

                {/* Address Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Location</h3>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address" className="text-xs font-bold text-muted-foreground uppercase">Full Address</Label>
                        <Input
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            disabled={isView}
                            className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-medium"
                            placeholder="Street address, City, State"
                        />
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
                                {loading ? 'Saving...' : (isCreate ? 'Create Profile' : 'Save Changes')}
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
