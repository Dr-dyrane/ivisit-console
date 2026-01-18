import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { X, Siren, MapPin, Clock, Activity, Phone, User, AlertTriangle, Navigation, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { format } from 'date-fns';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';

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
      const { data } = await supabase.from('profiles').select('id, username, email, phone, avatar_url');
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
        const { data, error } = await supabase
          .from('emergency_requests')
          .insert([submitData])
          .select();
        
        if (error) throw error;
        
        const createdId = data?.[0]?.id;
        if (createdId) {
          await createNotification(
            NotificationTypes.EMERGENCY,
            NotificationActions.CREATED,
            createdId,
            { message: `Emergency request created - Priority: ${submitData.priority}` }
          );
        }
        
        toast.success('Emergency request dispatched');
      } else if (isEdit) {
        const { error } = await supabase
          .from('emergency_requests')
          .update(submitData)
          .eq('id', request.id);
        
        if (error) throw error;
        
        await createNotification(
          NotificationTypes.EMERGENCY,
          NotificationActions.UPDATED,
          request.id,
          { message: `Emergency request updated - Status: ${submitData.status}` }
        );
        
        toast.success('Incident report updated');
      }
      
      onClose(true);
    } catch (error) {
      console.error('Error saving emergency request:', error);
      toast.error('Failed to save emergency request');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (p) => {
    switch(p) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (s) => {
    switch(s) {
      case 'pending': return 'text-yellow-500 bg-yellow-500/10';
      case 'dispatched': return 'text-blue-500 bg-blue-500/10';
      case 'en_route': return 'text-purple-500 bg-purple-500/10';
      case 'arrived': return 'text-indigo-500 bg-indigo-500/10';
      case 'completed': return 'text-green-500 bg-green-500/10';
      case 'cancelled': return 'text-red-500 bg-red-500/10';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  const selectedUser = users.find(u => u.id === formData.user_id);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl bg-background/50 backdrop-blur-xs border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Incident Header */}
        <div className={`relative h-32 overflow-hidden ${
          formData.priority === 'critical' ? 'bg-gradient-to-r from-destructive/20 via-background to-background' :
          formData.priority === 'high' ? 'bg-gradient-to-r from-orange-500/20 via-background to-background' :
          'bg-gradient-to-r from-blue-500/20 via-background to-background'
        }`}>
             <div className="absolute inset-0 opacity-10" 
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)' }}>
             </div>
             
             <div className="absolute top-6 left-8 flex items-center gap-3">
                <div className={`p-3 rounded-full ${getPriorityColor(formData.priority)} shadow-lg animate-pulse`}>
                    <Siren className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Incident Report</h2>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                        {formData.emergency_type ? formData.emergency_type.replace('_', ' ').toUpperCase() : 'NEW EMERGENCY'}
                        <Badge className={`ml-2 squircle border-0 ${getPriorityColor(formData.priority)}`}>
                            {formData.priority?.toUpperCase()}
                        </Badge>
                    </h1>
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

        <div className="px-8 pb-8 -mt-6 relative z-10 overflow-y-auto max-h-[calc(90vh-8rem)] custom-scrollbar">
            
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Status Bar */}
                <div className="squircle-xl bg-muted/30 p-1 flex items-center justify-between gap-2 overflow-x-auto">
                    {['pending', 'dispatched', 'en_route', 'arrived', 'completed'].map((step, i, arr) => {
                        const isCurrent = formData.status === step;
                        const isPast = arr.indexOf(formData.status) > i;
                        return (
                            <div key={step} 
                                 className={`flex-1 flex items-center justify-center py-2 px-3 squircle-lg transition-all text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                                    isCurrent ? 'bg-background shadow-sm text-primary' : 
                                    isPast ? 'text-primary/50' : 'text-muted-foreground/30'
                                 }`}
                                 onClick={!isView ? () => setFormData(prev => ({...prev, status: step})) : undefined}
                                 style={{ cursor: !isView ? 'pointer' : 'default' }}
                            >
                                {step.replace('_', ' ')}
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column: Context */}
                    <div className="space-y-6">
                        
                        {/* Requester Card */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <User className="w-3 h-3" /> Requester
                            </Label>
                            {!isView ? (
                                <Select 
                                    value={formData.user_id} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, user_id: value }))}
                                >
                                    <SelectTrigger className="squircle bg-muted/30 border-0 h-14">
                                        <SelectValue placeholder="Select user" />
                                    </SelectTrigger>
                                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                        {users.map(u => (
                                            <SelectItem key={u.id} value={u.id}>
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-6 h-6">
                                                        <AvatarImage src={u.avatar_url} />
                                                        <AvatarFallback>{u.username?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span>{u.username}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="squircle-xl bg-muted/30 p-4 flex items-center gap-4">
                                    <Avatar className="w-12 h-12 squircle border-2 border-background shadow-sm">
                                        <AvatarImage src={selectedUser?.avatar_url} />
                                        <AvatarFallback className="font-bold">{selectedUser?.username?.[0] || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-black text-lg">{selectedUser?.username || 'Unknown User'}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <Phone className="w-3 h-3" />
                                            {selectedUser?.phone || 'No phone'}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Location Card */}
                        <div className="space-y-2">
                             <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Location Data
                            </Label>
                            <div className="squircle-xl bg-muted/30 p-4 space-y-3">
                                <Input
                                    value={formData.location}
                                    onChange={handleChange}
                                    name="location"
                                    disabled={isView}
                                    placeholder="Location address..."
                                    className="bg-background/50 border-0 squircle font-medium"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">LAT</span>
                                        <Input
                                            type="number"
                                            name="latitude"
                                            value={formData.latitude || ''}
                                            onChange={handleChange}
                                            disabled={isView}
                                            className="bg-background/50 border-0 squircle pl-10 font-mono text-xs"
                                            placeholder="0.0000"
                                        />
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">LNG</span>
                                        <Input
                                            type="number"
                                            name="longitude"
                                            value={formData.longitude || ''}
                                            onChange={handleChange}
                                            disabled={isView}
                                            className="bg-background/50 border-0 squircle pl-10 font-mono text-xs"
                                            placeholder="0.0000"
                                        />
                                    </div>
                                </div>
                                {(formData.latitude && formData.longitude) && (
                                    <Button type="button" variant="outline" className="w-full squircle border-primary/20 text-primary hover:bg-primary/10">
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Open in Maps
                                    </Button>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Details */}
                    <div className="space-y-6">
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Type</Label>
                                <Select 
                                    value={formData.emergency_type} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, emergency_type: value }))}
                                    disabled={isView}
                                >
                                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-bold">
                                        <SelectValue placeholder="Type" />
                                    </SelectTrigger>
                                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                        <SelectItem value="cardiac">Cardiac</SelectItem>
                                        <SelectItem value="accident">Accident</SelectItem>
                                        <SelectItem value="respiratory">Respiratory</SelectItem>
                                        <SelectItem value="stroke">Stroke</SelectItem>
                                        <SelectItem value="pregnancy">Pregnancy</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Priority</Label>
                                <Select 
                                    value={formData.priority} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                                    disabled={isView}
                                >
                                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-bold">
                                        <SelectValue placeholder="Level" />
                                    </SelectTrigger>
                                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                                        <SelectItem value="critical">Critical</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="low">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2 h-full">
                            <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Situation Report
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                disabled={isView}
                                className="squircle bg-muted/30 border-0 resize-none min-h-[150px] p-4 font-medium leading-relaxed focus-visible:ring-1 focus-visible:ring-primary/50"
                                placeholder="Describe the emergency situation details..."
                            />
                        </div>

                        {request?.created_at && (
                            <div className="flex items-center justify-between p-3 squircle bg-muted/20">
                                <span className="text-xs font-bold text-muted-foreground uppercase">Reported At</span>
                                <span className="text-sm font-mono font-bold">
                                    {format(new Date(request.created_at), 'HH:mm:ss · dd MMM yyyy')}
                                </span>
                            </div>
                        )}

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
                                className={`squircle-lg shadow-glow font-bold px-8 ${
                                    formData.priority === 'critical' ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90'
                                }`}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : (isCreate ? 'Dispatch Request' : 'Update Incident')}
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => onClose(false)}
                            className="squircle-lg bg-muted text-foreground hover:bg-muted/80 font-bold px-8"
                        >
                            Close Report
                        </Button>
                    )}
                </div>
            </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
