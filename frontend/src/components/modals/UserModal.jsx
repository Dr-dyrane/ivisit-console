import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X } from 'lucide-react';

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
        const { error } = await supabase
          .from('profiles')
          .insert([formData]);
        
        if (error) throw error;
        toast.success('User created successfully');
      } else if (isEdit) {
        const { error } = await supabase
          .from('profiles')
          .update(formData)
          .eq('id', user.id);
        
        if (error) throw error;
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
      <DialogContent className="squircle-lg glass shadow-premium border-0 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="font-black text-2xl tracking-tight">
              {isView && 'User Details'}
              {isEdit && 'Edit User'}
              {isCreate && 'Add New User'}
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
              <Label htmlFor="username" className="font-bold text-sm mb-2 block">Username</Label>
              <Input
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                disabled={isView}
                required
                className="squircle"
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
                required
                className="squircle"
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
                className="squircle"
              />
            </div>

            <div>
              <Label htmlFor="role" className="font-bold text-sm mb-2 block">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="provider">Provider</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === 'provider' && (
              <div>
                <Label htmlFor="provider_type" className="font-bold text-sm mb-2 block">Provider Type</Label>
                <Select 
                  value={formData.provider_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, provider_type: value }))}
                  disabled={isView}
                >
                  <SelectTrigger className="squircle">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="squircle">
                    <SelectItem value="ambulance">Ambulance</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="paramedic">Paramedic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="gender" className="font-bold text-sm mb-2 block">Gender</Label>
              <Select 
                value={formData.gender} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                disabled={isView}
              >
                <SelectTrigger className="squircle">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent className="squircle">
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date_of_birth" className="font-bold text-sm mb-2 block">Date of Birth</Label>
              <Input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={formData.date_of_birth}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address" className="font-bold text-sm mb-2 block">Address</Label>
              <Input
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isView}
                className="squircle"
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between p-4 squircle bg-muted/30">
                <div>
                  <Label className="font-bold text-sm">BVN Verified</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark this user as verified
                  </p>
                </div>
                <Switch
                  checked={formData.bvn_verified}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bvn_verified: checked }))}
                  disabled={isView}
                />
              </div>
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
                  {loading ? 'Saving...' : (isCreate ? 'Create User' : 'Update User')}
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
