import React from 'react';
import { Building2 } from 'lucide-react';
import { MobileListRow } from '../canon';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  getMobileOrganizationPill,
  isFundedOrganization,
} from './mobileOrganizationsModel';

export const MobileOrganizationRow = ({
  organization,
  selectionEnabled,
  selectedIdSet,
  selectionMode,
  onToggleSelect,
  onLongPress,
  onOpen,
}) => {
  const funded = isFundedOrganization(organization);

  return (
    <MobileListRow
      item={organization}
      dataAttr="data-mobile-organization-row"
      onOpen={onOpen}
      ariaLabel={`${organization.name || 'Unnamed organization'}, ${funded ? 'funded' : 'payout gap'}`}
      orbClass={funded
        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
        : 'bg-amber-500/10 text-amber-700 dark:text-amber-200'}
      icon={Building2}
      title={organization.name || 'Unnamed organization'}
      meta={organization.contact_email || 'No contact email'}
      time={formatRelativeTime(organization.created_at || organization.updated_at)}
      markerChip={funded ? 'Funded' : null}
      pill={getMobileOrganizationPill(organization)}
      selectable={selectionEnabled}
      selected={selectedIdSet.has(organization.id)}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};
