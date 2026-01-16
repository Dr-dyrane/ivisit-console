import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { X, Save, User, MessageSquare, Tag, Flag, AlertCircle, Headphones, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createNotification, NotificationTypes, NotificationActions } from '../../services/notificationService';

export const SupportTicketModal = ({ 
  ticket, 
  mode, 
  onClose, 
  onSave, 
  priorities, 
  categories 
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';

  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal',
    assigned_to: null,
    status: 'open'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket && mode === 'edit') {
      setFormData({
        subject: ticket.subject || '',
        message: ticket.message || '',
        category: ticket.category || 'general',
        priority: ticket.priority || 'normal',
        assigned_to: ticket.assigned_to || null,
        status: ticket.status || 'open'
      });
    } else {
      setFormData({
        subject: '',
        message: '',
        category: 'general',
        priority: 'normal',
        assigned_to: null,
        status: 'open'
      });
    }
  }, [ticket, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'create') {
        await onSave(formData);
        toast.success('Support ticket created successfully');
      } else {
        await onSave(ticket.id, formData);
        toast.success('Support ticket updated successfully');
      }
      onClose();
    } catch (error) {
      toast.error(`Failed to ${mode} support ticket`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getPriorityColor = (priority) => {
    const priorityConfig = (priorities || []).find(p => p.value === priority);
    return priorityConfig?.color || 'bg-muted/20 text-muted-foreground';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-warning/20 text-warning';
      case 'in_progress': return 'bg-info/20 text-info';
      case 'resolved': return 'bg-success/20 text-success';
      case 'closed': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <Dialog open={Boolean(mode)} onOpenChange={() => onClose(false)}>
      <DialogContent className="squircle-2xl glass-strong border-0 max-w-2xl max-h-[90vh] overflow-hidden p-0 gap-0 shadow-2xl bg-background/80 backdrop-blur-xl [&>button]:hidden">
        
        {/* Premium Support Ticket Header */}
        <div className="relative h-44 bg-gradient-to-r from-primary/20 via-background to-background overflow-hidden">
          {/* Decorative Pattern */}
          <div className="absolute inset-0 opacity-10" 
               style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 10px, #3b82f6 10px, #3b82f6 11px)' }}>
          </div>
          
          <div className="absolute bottom-6 left-8 z-10 flex items-end gap-6">
            <div className="w-24 h-24 squircle-2xl bg-background shadow-xl flex items-center justify-center border-4 border-background">
              <Headphones className="w-12 h-12 text-primary" />
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="squircle-sm bg-primary/10 text-primary border-0 font-bold px-2 py-0.5 text-[10px] uppercase tracking-widest">
                  SUPPORT TICKET
                </Badge>
              </div>
              <h2 className="text-3xl font-black tracking-tighter leading-none mb-2">
                {formData.subject || 'New Ticket'}
              </h2>
              <div className="flex items-center gap-2">
                <Badge className={`squircle-sm ${getPriorityColor(formData.priority)} border-0 font-bold px-3 py-1`}>
                  {formData.priority?.toUpperCase() || 'NORMAL'}
                </Badge>
                <Badge className={`squircle-sm ${getStatusColor(formData.status)} border-0 font-bold px-3 py-1`}>
                  {formData.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                </Badge>
              </div>
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

        <div className="px-8 pb-8 pt-6 relative z-10 overflow-y-auto max-h-[calc(90vh-12rem)] custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Ticket Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Ticket Details</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-xs font-bold text-muted-foreground uppercase">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  disabled={isView}
                  className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold text-lg"
                  placeholder="Brief description of the issue"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-xs font-bold text-muted-foreground uppercase">Message</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  disabled={isView}
                  className="squircle bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[120px] font-medium resize-none"
                  placeholder="Detailed description of the issue or request"
                  required
                />
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Classification</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs font-bold text-muted-foreground uppercase">Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    disabled={isView}
                  >
                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                      {(categories || []).map(cat => 
                        typeof cat === 'string' 
                          ? <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}</SelectItem>
                          : <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-xs font-bold text-muted-foreground uppercase">Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                    disabled={isView}
                  >
                    <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                      {(priorities || []).map(pri => (
                        <SelectItem key={pri.value} value={pri.value}>{pri.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Status & Assignment */}
            {!isCreate && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider">Management</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                      disabled={isView}
                    >
                      <SelectTrigger className="squircle bg-muted/30 border-0 h-12 font-medium">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="squircle border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-8 pb-6 border-t border-border/10 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Response time: Typically within 24 hours</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onClose(false)}
                disabled={loading}
                className="squircle border-0 bg-muted/20 hover:bg-muted/30 font-bold"
              >
                Cancel
              </Button>
              {!isView && (
                <Button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="squircle bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isCreate ? 'Create Ticket' : 'Update Ticket'}
                    </div>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
