"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { X, Save, MessageSquare, Tag, User, Headphones, Clock } from 'lucide-react';
import { toast } from 'sonner';

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

  const getPriorityColor = (priority) => {
    const priorityConfig = (priorities || []).find(p => p.value === priority);
    return priorityConfig?.color || 'bg-muted/20 text-muted-foreground';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'bg-orange-500/20 text-orange-500';
      case 'in_progress': return 'bg-blue-500/20 text-blue-500';
      case 'resolved': return 'bg-green-500/20 text-green-500';
      case 'closed': return 'bg-muted/20 text-muted-foreground';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  return (
    <AnimatePresence>
      {Boolean(mode) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
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
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between p-8 pb-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/20 rounded-2xl">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
                    {isCreate ? 'New Ticket' : isEdit ? 'Edit Ticket' : 'Ticket Details'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`rounded-full border-0 font-bold px-3 py-0.5 text-xs ${getPriorityColor(formData.priority)}`}>
                      {formData.priority?.toUpperCase() || 'NORMAL'}
                    </Badge>
                    <Badge className={`rounded-full border-0 font-bold px-3 py-0.5 text-xs ${getStatusColor(formData.status)}`}>
                      {formData.status?.replace('_', ' ').toUpperCase() || 'OPEN'}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => onClose(false)}
                className="h-10 w-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-8 pt-2 overflow-y-auto max-h-[calc(90vh-120px)] space-y-6 no-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Ticket Details */}
                <GlassCard icon={<MessageSquare className="text-primary" />} title="Ticket Details">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-xs font-bold text-muted-foreground uppercase">Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 h-12 font-bold text-lg"
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
                        onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                        disabled={isView}
                        className="rounded-2xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[120px] font-medium resize-none"
                        placeholder="Detailed description of the issue or request"
                        required
                      />
                    </div>
                  </div>
                </GlassCard>

                {/* Classification */}
                <GlassCard icon={<Tag className="text-primary" />} title="Classification">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-xs font-bold text-muted-foreground uppercase">Category</Label>
                      <Select 
                        value={formData.category} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                        disabled={isView}
                      >
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
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
                        <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                          {(priorities || []).map(pri => (
                            <SelectItem key={pri.value} value={pri.value}>{pri.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </GlassCard>

                {/* Status & Assignment */}
                {!isCreate && (
                  <GlassCard icon={<User className="text-primary" />} title="Management">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase">Status</Label>
                        <Select 
                          value={formData.status} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                          disabled={isView}
                        >
                          <SelectTrigger className="rounded-2xl bg-muted/30 border-0 h-12 font-medium">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-0 shadow-xl bg-background/95 backdrop-blur-xl">
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </GlassCard>
                )}

                {/* Footer Actions */}
                <div className="p-4 sm:p-6 rounded-[24px] bg-muted/30  flex items-center justify-between">
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
                      className="rounded-2xl border-0 bg-muted/50 hover:bg-muted font-bold"
                    >
                      Cancel
                    </Button>
                    {!isView && (
                      <Button
                        type="submit"
                        disabled={loading}
                        className="rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6"
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
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/* Sub-components */
const GlassCard = ({ children, title, icon }) => (
  <div className="p-4 sm:p-6 rounded-[28px] bg-muted/30 ">
    <div className="flex items-center gap-3 mb-4 sm:mb-6">
      <div className="p-1.5 sm:p-2 bg-muted/50 rounded-lg">
        {React.cloneElement(icon, { size: 16, className: 'sm:h-5 sm:w-5' })}
      </div>
      <h3 className="font-bold tracking-tight text-sm sm:text-base uppercase">{title}</h3>
    </div>
    {children}
  </div>
);
