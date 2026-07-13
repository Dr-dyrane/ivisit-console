import React from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Crown, Mail } from 'lucide-react';

import { Button } from '../ui/button';
import { ModalShell } from '../ui/ModalShell';

const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString();
};

const formatText = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  return text ? text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : fallback;
};

const Detail = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 rounded-inner bg-muted/25 p-4">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-background/55 text-muted-foreground">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="mt-1 block truncate text-sm font-semibold text-foreground">{value}</span>
    </span>
  </div>
);

export const SubscriptionModal = ({ isOpen, onClose, subscriber, mode }) => {
  const viewMode = mode === 'view' && Boolean(subscriber);
  const status = formatText(subscriber?.status, 'Pending');
  const statusBadge = viewMode ? (
    <span className="rounded-pill bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-200">
      {status}
    </span>
  ) : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={viewMode ? 'Subscriber details' : 'Subscriber changes unavailable'}
      subtitle={viewMode ? subscriber.email || 'Subscriber record' : 'Subscriber and email changes are not available from this page.'}
      icon={viewMode ? <Mail className="h-5 w-5 text-muted-foreground" /> : <AlertTriangle className="h-5 w-5 text-muted-foreground" />}
      badge={statusBadge}
      size="md"
      footer={(
        <div className="flex justify-end">
          <Button type="button" onClick={onClose} className="rounded-button px-6">Close</Button>
        </div>
      )}
    >
      <div className="space-y-4 px-4 pb-4 md:px-6 md:pb-6">
        {viewMode ? (
          <>
            <section className="rounded-card bg-muted/20 p-4">
              <p className="text-xs font-medium text-muted-foreground">Email</p>
              <p className="mt-2 break-words text-base font-semibold text-foreground">{subscriber.email || 'Not set'}</p>
            </section>
            <div className="grid gap-2 sm:grid-cols-2">
              <Detail icon={Crown} label="Plan" value={formatText(subscriber.type, 'Free')} />
              <Detail icon={CheckCircle2} label="Status" value={status} />
              <Detail icon={Calendar} label="Joined" value={formatDate(subscriber.subscription_date || subscriber.created_at)} />
              <Detail icon={Mail} label="Welcome email" value={subscriber.welcome_email_sent ? 'Sent' : 'Pending'} />
            </div>
            <p className="rounded-inner bg-muted/25 px-4 py-3 text-sm text-muted-foreground">
              Subscriber and email changes are not available from this page.
            </p>
          </>
        ) : (
          <div className="rounded-card bg-amber-500/10 p-5 text-sm text-amber-900 dark:text-amber-200">
            Review subscriber details from the list. Adding subscribers and sending emails are not available here.
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default SubscriptionModal;
