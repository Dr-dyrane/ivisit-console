import React, { useEffect, useMemo, useState } from 'react';
import { Save, Headphones, MessageSquare, Tag, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { ModalShell } from '../ui/ModalShell';
import { handleApiError } from '../../utils/errorHandler';

const DEFAULT_FORM = {
  subject: '',
  message: '',
  category: 'general',
  priority: 'normal',
};

const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

const fieldClassName = 'h-11 rounded-button bg-muted/35 px-3 text-sm shadow-inner transition-[background,box-shadow] focus-visible:bg-muted/45 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]';
const areaClassName = 'min-h-[128px] resize-none rounded-button bg-muted/35 px-3 py-3 text-sm shadow-inner transition-[background,box-shadow] focus-visible:bg-muted/45 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]';
const selectTriggerClassName = 'h-11 rounded-button bg-muted/35 px-3 text-sm shadow-inner transition-[background,box-shadow] focus-visible:bg-muted/45 focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.16)]';

export const SupportTicketModal = ({
  isOpen = true,
  ticket,
  mode,
  onClose,
  onSave,
  priorities = [],
  categories = [],
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isCreate = mode === 'create';
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket) {
      setFormData({
        subject: ticket.subject || '',
        message: ticket.message || '',
        category: ticket.category || 'general',
        priority: ticket.priority || 'normal',
      });
      return;
    }

    if (isCreate) {
      setFormData(DEFAULT_FORM);
    }
  }, [ticket, isCreate]);

  const title = isCreate ? 'New support request' : isEdit ? 'Edit support request' : 'Support request';
  const statusLabel = STATUS_LABELS[ticket?.status] || STATUS_LABELS.open;
  const priorityLabel = useMemo(() => (
    priorities.find((priority) => priority.value === formData.priority)?.label || formData.priority || 'Normal'
  ), [formData.priority, priorities]);

  const close = () => {
    if (!loading) onClose?.();
  };

  const handleChange = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isView || loading) return;

    setLoading(true);
    try {
      const payload = {
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority,
      };

      if (isCreate) {
        await onSave(payload);
        toast.success('Support request created');
      } else {
        await onSave(ticket.id, payload);
        toast.success('Support request updated');
      }

      onClose?.();
    } catch (error) {
      handleApiError(error, isCreate ? 'create' : 'update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={Boolean(mode) && isOpen}
      onClose={close}
      size="lg"
      title={title}
      subtitle={isCreate ? 'Send one clear request to the support queue.' : statusLabel}
      icon={<Headphones className="h-5 w-5 text-primary" />}
      badge={(
        <div className="hidden rounded-pill bg-muted/45 px-3 py-1 text-xs font-medium text-muted-foreground sm:block">
          {priorityLabel}
        </div>
      )}
      managed
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4 md:px-6">
          <section className="rounded-card bg-muted/24 p-4 shadow-[0_16px_42px_rgb(0_0_0/0.08)] md:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-icon bg-primary/10 text-primary">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Request details</h3>
                <p className="text-xs text-muted-foreground">Keep it short and specific.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-subject" className="text-xs font-medium text-muted-foreground">Subject</Label>
                <Input
                  id="support-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={(event) => handleChange('subject', event.target.value)}
                  disabled={isView || loading}
                  className={fieldClassName}
                  placeholder="Brief description"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-message" className="text-xs font-medium text-muted-foreground">Message</Label>
                <Textarea
                  id="support-message"
                  name="message"
                  value={formData.message}
                  onChange={(event) => handleChange('message', event.target.value)}
                  disabled={isView || loading}
                  className={areaClassName}
                  placeholder="What happened, and what should support check first?"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-card bg-muted/24 p-4 shadow-[0_16px_42px_rgb(0_0_0/0.08)] md:p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-icon bg-sky-500/10 text-sky-700 dark:text-sky-200">
                <Tag className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Classification</h3>
                <p className="text-xs text-muted-foreground">Support can refine this after review.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="support-category" className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleChange('category', value)}
                  disabled={isView || loading}
                >
                  <SelectTrigger id="support-category" className={selectTriggerClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner bg-background/95 shadow-xl backdrop-blur-xl">
                    {(categories || []).map((category) => {
                      const value = typeof category === 'string' ? category : category.value;
                      const label = typeof category === 'string'
                        ? category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
                        : category.label;
                      return <SelectItem key={value} value={value}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="support-priority" className="text-xs font-medium text-muted-foreground">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => handleChange('priority', value)}
                  disabled={isView || loading}
                >
                  <SelectTrigger id="support-priority" className={selectTriggerClassName}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner bg-background/95 shadow-xl backdrop-blur-xl">
                    {(priorities || []).map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>{priority.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {!isCreate && (
            <section className="rounded-card bg-muted/24 p-4 shadow-[0_16px_42px_rgb(0_0_0/0.08)] md:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-icon bg-emerald-500/10 text-emerald-700 dark:text-emerald-200">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Workflow status</h3>
                  <p className="text-xs text-muted-foreground">
                    {statusLabel}. Assignment and status changes need support receiver proof before editing here.
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 bg-background/95 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <p className="text-xs text-muted-foreground">
            Support replies and workflow changes stay tied to backend ticket truth.
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={loading}
              className="h-10 rounded-button bg-muted/45 px-4 text-sm font-medium hover:bg-muted/65"
            >
              {isView ? 'Close' : 'Cancel'}
            </Button>
            {!isView && (
              <Button
                type="submit"
                disabled={loading}
                className="h-10 rounded-button px-4 text-sm font-semibold shadow-[0_14px_34px_hsl(var(--primary)/0.22)]"
              >
                {loading ? 'Saving...' : (
                  <span className="inline-flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {isCreate ? 'Create request' : 'Save changes'}
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
