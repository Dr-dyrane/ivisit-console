import React from 'react';
import {
  Ambulance,
  Ban,
  Building2,
  CheckCircle,
  Clock,
  Eye,
  Hash,
  Mail,
  MapPin,
  Shield,
  Stethoscope,
  Tag,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import { resolveVital } from '../../../constants/vitalTracks';
import { formatRelativeTime } from '../../../utils/activityUtils';
import { getProviderPersonaKind } from '../../pages/verification/verificationQueueModel';
import {
  APPROVE_TONE,
  isPendingItem,
  itemStatusKey,
  providerPersonaLabel,
  providerPersonaTone,
  tokenLabel,
} from './mobileVerificationModel';

export const getMobileProviderPersonaIcon = (providerType) => (
  getProviderPersonaKind(providerType) === 'responder' ? Ambulance : Stethoscope
);

export const MobileVerificationDetailSheet = ({
  activeItem,
  setActiveItem,
  queueType,
  canApprove,
  onViewProvider,
  onVerifyProvider,
  onVerifyOrganization,
}) => {
  if (!activeItem) return null;

  const item = activeItem;
  const isProviders = queueType === 'providers';
  const pending = isPendingItem(item, queueType);
  const statusKey = itemStatusKey(item, queueType);
  const vital = resolveVital('verification', statusKey);
  const title = isProviders ? (item.username || item.email || 'Unknown') : (item.name || 'Unknown');
  const appliedAt = item.created_at ? formatRelativeTime(item.created_at) : null;
  const idValue = item.display_id || `#${String(item.id || '').slice(0, 12).toUpperCase()}`;
  const canApproveNow = pending && canApprove;

  const approveProvider = canApproveNow && isProviders && onVerifyProvider
    ? {
      label: 'Approve',
      icon: CheckCircle,
      tone: APPROVE_TONE,
      onClick: () => {
        setActiveItem(null);
        onVerifyProvider(item.id, true);
      },
    }
    : null;
  const approveOrganization = canApproveNow && !isProviders && onVerifyOrganization
    ? {
      label: 'Approve',
      icon: CheckCircle,
      tone: APPROVE_TONE,
      onClick: () => {
        setActiveItem(null);
        onVerifyOrganization(item.id, true);
      },
    }
    : null;
  const rejectOrganization = canApproveNow && !isProviders && onVerifyOrganization
    ? {
      label: 'Reject',
      icon: Ban,
      'aria-label': `Reject ${title}`,
      onClick: () => {
        setActiveItem(null);
        onVerifyOrganization(item.id, false);
      },
    }
    : null;
  const viewProvider = isProviders && onViewProvider
    ? {
      label: 'View',
      icon: Eye,
      onClick: () => {
        setActiveItem(null);
        onViewProvider(item);
      },
    }
    : null;

  let primary;
  let secondary;
  if (approveProvider) {
    primary = approveProvider;
    secondary = viewProvider || undefined;
  } else if (approveOrganization) {
    primary = approveOrganization;
    secondary = rejectOrganization || undefined;
  } else if (viewProvider) {
    primary = viewProvider;
  }

  return (
    <MobileDetailSheet
      isOpen={Boolean(activeItem)}
      onClose={() => setActiveItem(null)}
      icon={isProviders ? getMobileProviderPersonaIcon(item.provider_type) : Building2}
      iconTone={isProviders ? providerPersonaTone(item.provider_type) : vital.tone}
      eyebrow={isProviders ? providerPersonaLabel(item.provider_type) : 'Facility'}
      title={title}
      statusPill={vital.pill}
      vital={{
        steps: vital.steps,
        currentKey: vital.currentKey,
        tone: vital.tone,
        cancelled: vital.cancelled,
        label: 'Verification',
      }}
      islands={isProviders ? [
        item.email && { icon: Mail, label: 'Email', value: item.email, href: `mailto:${item.email}` },
        { icon: Tag, label: 'Role', value: tokenLabel(item.role, 'provider') },
        item.provider_type && {
          icon: getMobileProviderPersonaIcon(item.provider_type),
          label: 'Type',
          value: tokenLabel(item.provider_type),
        },
        appliedAt && { icon: Clock, label: 'Applied', value: appliedAt },
        { icon: Hash, label: 'ID', value: idValue },
      ] : [
        item.address && { icon: MapPin, label: 'Address', value: item.address },
        { icon: Tag, label: 'Type', value: tokenLabel(item.type, 'facility') },
        { icon: Shield, label: 'Status', value: tokenLabel(item.verification_status, 'pending') },
        appliedAt && { icon: Clock, label: 'Registered', value: appliedAt },
        { icon: Hash, label: 'ID', value: idValue },
      ]}
      primary={primary}
      secondary={secondary}
    >
      {pending && !canApprove && (
        <div className="flex h-11 w-full items-center justify-center rounded-button bg-amber-500/10 text-sm font-semibold text-amber-700 dark:text-amber-200">
          ADMIN REVIEW
        </div>
      )}
    </MobileDetailSheet>
  );
};
