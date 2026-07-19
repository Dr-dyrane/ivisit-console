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
  CopilotActionButton,
  createOrganizationReadinessRequest,
} from '../../../features/copilot';
import {
  formatOrganizationType,
  formatOrganizationWallet,
  getOrganizationVerificationMeta,
} from '../../pages/organizations/organizationPageModel';
import {
  formatMobileOrganizationDate,
  formatMobileOrganizationWalletForRow,
  getMobileOrganizationPill,
  isFundedOrganization,
} from './mobileOrganizationsModel';
import { isDemoOrganization } from '../../../utils/demoProvenance';

export const MobileOrganizationDetailSheet = ({
  organization,
  onClose,
  onView,
  onCopyId,
}) => {
  if (!organization) return null;

  const funded = isFundedOrganization(organization);
  const demo = isDemoOrganization(organization);
  const organizationId = organization.display_id || organization.id || 'Not available';
  const verificationMeta = getOrganizationVerificationMeta(organization);
  const copilotRequest = createOrganizationReadinessRequest({
    organization,
    verificationLabel: verificationMeta.label,
    typeValue: formatOrganizationType(organization.organization_type),
    walletValue: demo
      ? 'Simulated'
      : formatOrganizationWallet(
          organization.wallet_balance,
          organization.wallet_currency,
        ),
    locationValue: organization.city || organization.address || 'Not set',
  });

  return (
    <MobileDetailSheet
      isOpen
      onClose={onClose}
      icon={Building2}
      iconTone={demo ? 'hsl(204 94% 38%)' : funded ? 'hsl(162 94% 24%)' : 'hsl(38 92% 50%)'}
      eyebrow={demo ? 'Demo coverage' : funded ? 'Funded organization' : 'Payout gap'}
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
          value: formatMobileOrganizationWalletForRow(organization),
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
    >
      <CopilotActionButton
        label="Check readiness"
        request={copilotRequest}
        onBeforeOpen={onClose}
      />
    </MobileDetailSheet>
  );
};
