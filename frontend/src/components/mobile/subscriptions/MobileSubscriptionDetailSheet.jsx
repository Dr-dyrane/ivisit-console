import React from 'react';
import { BadgeCheck, Clock, Crown, Eye, Mail } from 'lucide-react';
import { resolveVital } from '../../../constants/vitalTracks';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  dateLabel,
  normalizeSubscriptionStatus,
  planLabel,
} from './mobileSubscriptionModel';

export const MobileSubscriptionDetailSheet = ({ activeSubscriber, onClose, onView }) => {
  if (!activeSubscriber) return null;

  const status = normalizeSubscriptionStatus(activeSubscriber);
  const paid = activeSubscriber.type === 'paid';
  const vital = resolveVital('subscription', status);

  return (
    <MobileDetailSheet
      isOpen={!!activeSubscriber}
      onClose={onClose}
      icon={paid ? Crown : Mail}
      iconTone={vital?.tone}
      eyebrow="Subscriber"
      title={activeSubscriber.email || 'No email'}
      statusPill={vital?.pill}
      vital={vital ? { ...vital, label: 'Subscription status' } : null}
      islands={[
        { icon: Mail, label: 'Email', value: activeSubscriber.email || 'No email' },
        { icon: Crown, label: 'Plan', value: planLabel(activeSubscriber.type) },
        { icon: BadgeCheck, label: 'Status', value: vital?.pill?.label || planLabel(activeSubscriber.status) },
        { icon: Clock, label: 'Subscribed', value: dateLabel(activeSubscriber.subscription_date || activeSubscriber.created_at) },
        { icon: Mail, label: 'Welcome email', value: activeSubscriber.welcome_email_sent ? 'Sent' : 'Pending' },
      ]}
      primary={{
        label: 'Details',
        icon: Eye,
        onClick: () => {
          onClose();
          onView?.(activeSubscriber);
        },
      }}
    />
  );
};
