import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Calendar, User, Hospital, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
        supabase.from('profiles').select('id, username, email, avatar_url'),
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

  const getStatusColor = (status) => {
      switch (status) {
          case 'scheduled': return 'text-info bg-info/10 border-info/20';
          case 'in_progress': return 'text-warning bg-warning/10 border-warning/20';
          case 'completed': return 'text-success bg-success/10 border-success/20';
          case 'cancelled': return 'text-destructive bg-destructive/10 border-destructive/20';
          default: return 'text-muted-foreground bg-muted border-muted';
      }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl glass-strong border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Timeline Header */}
        <div className="relative h-32 bg-gradient-to-r from-info/10 via-background to-background overflow-hidden flex items-center justify-between px-8">
             <div className="absolute inset-0 opacity-5" 
                  style={{ backgroundImage: 'linear-gradient(to right, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 100%' }}>
             </div>
             
             <div className="z-10">
                 <div className="flex items-center gap-2 mb-1">
                     <Badge className={`squircle-sm border font-bold uppercase tracking-widest px-2 py-0.5 text-[10px] ${getStatusColor(formData.status)}`}>
                         {formData.status}
                     </Badge>
                 </div>
                 <h2 className="text-3xl font-black tracking-tighter leading-none">
                     {formData.visit_type ? formData.visit_type.charAt(0).toUpperCase() + formData.visit_type.slice(1) : 'New Visit'}
                 </h2>
                 <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-2">
                     <Clock className="w-4 h-4" />
                     {formData.scheduled_at ? new Date(formData.scheduled_at).toLocaleString() : 'Date not set'}
                 </p>
             </div>

             <div className="z-10 hidden md:block">
                 <div className="w-16 h-16 squircle-xl bg-background shadow-lg flex items-center justify-center border-4 border-background text-info">
                     <Calendar className="w-8 h-8" />
                 </div>
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

        <div className="px-8 pb-8 pt-6 relative z-10 overflow-y-auto max-h-[calc(90vh-10rem)] custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* Participants Section */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Participants</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="user_id" className="text-xs font-bold text-muted-foreground uppercase">Patient</Label>
                            <Select 
                                value={formData.user_id} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-14 font-medium">
                                <SelectValue placeholder="Select patient" />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                {users.map(u => (
                                    <SelectItem key={u.id} value={u.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-6 h-6">
                                                <AvatarImage src={u.avatar_url} />
                                                <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <span>{u.username || u.email}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hospital_id" className="text-xs font-bold text-muted-foreground uppercase">Facility</Label>
                            <Select 
                                value={formData.hospital_id} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, hospital_id: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-14 font-medium">
                                <SelectValue placeholder="Select facility" />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                {hospitals.map(h => (
                                    <SelectItem key={h.id} value={h.id}>
                                        <div className="flex items-center gap-2">
                                            <Hospital className="w-4 h-4 text-muted-foreground" />
                                            <span>{h.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Visit Details */}
                <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Details & Schedule</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="visit_type" className="text-xs font-bold text-muted-foreground uppercase">Visit Type</Label>
                            <Select 
                                value={formData.visit_type} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, visit_type: value }))}
                                disabled={isView}
                            >
                                <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                                <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                <SelectItem value="checkup">Checkup</SelectItem>
                                <SelectItem value="emergency">Emergency</SelectItem>
                                <SelectItem value="follow_up">Follow Up</SelectItem>
                                <SelectItem value="consultation">Consultation</SelectItem>
                                <SelectItem value="surgery">Surgery</SelectItem>
                                </SelectContent>
                            </Select>
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
                                <SelectItem value="scheduled">Scheduled</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="scheduled_at" className="text-xs font-bold text-muted-foreground uppercase">Date & Time</Label>
                            <Input
                                id="scheduled_at"
                                name="scheduled_at"
                                type="datetime-local"
                                value={formData.scheduled_at}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-mono"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="reason" className="text-xs font-bold text-muted-foreground uppercase">Reason for Visit</Label>
                            <Input
                                id="reason"
                                name="reason"
                                value={formData.reason}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-medium"
                                placeholder="e.g., Annual checkup"
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground uppercase">Clinical Notes</Label>
                            <Textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[100px] resize-none p-4"
                                placeholder="Add notes here..."
                            />
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
                                {loading ? 'Saving...' : (isCreate ? 'Schedule Visit' : 'Save Changes')}
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
