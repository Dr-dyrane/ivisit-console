import React from 'react';
import {
  Building2,
  Clock,
  CreditCard,
  Eye,
  Hash,
  Mail,
  Wallet,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  formatMobileOrganizationDate,
  formatMobileOrganizationWallet,
  getMobileOrganizationPill,
  isFundedOrganization,
} from './mobileOrganizationsModel';

export const MobileOrganizationDetailSheet = ({
  organization,
  onClose,
  onView,
  onCopyId,
}) => {
  if (!organization) return null;

  const funded = isFundedOrganization(organization);
  const organizationId = organization.display_id || organization.id || 'Not available';

  return (
    <MobileDetailSheet
      isOpen
      onClose={onClose}
      icon={Building2}
      iconTone={funded ? 'hsl(162 94% 24%)' : 'hsl(38 92% 50%)'}
      eyebrow={funded ? 'Funded organization' : 'Payout gap'}
      title={organization.name || 'Unnamed organization'}
      statusPill={getMobileOrganizationPill(organization)}
      islands={[
        {
          icon: Mail,
          label: 'Contact',
          value: organization.contact_email || 'Not available',
          href: organization.contact_email ? `mailto:${organization.contact_email}` : undefined,
        },
        {
          icon: Wallet,
          label: 'Wallet',
          value: formatMobileOrganizationWallet(organization.wallet_balance),
        },
        {
          icon: CreditCard,
          label: 'Stripe',
          value: organization.stripe_account_id ? 'Connected' : 'Not connected',
        },
        {
          icon: Clock,
          label: 'Added',
          value: formatMobileOrganizationDate(organization.created_at),
        },
        {
          icon: Hash,
          label: 'Organization ID',
          value: organizationId,
          onPress: (event) => onCopyId(event, organizationId),
        },
      ]}
      primary={{
        label: 'Details',
        icon: Eye,
        onClick: () => {
          onClose();
          onView?.(organization);
        },
      }}
    />
  );
};
