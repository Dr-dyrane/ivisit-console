import React from 'react';
import { AlertTriangle, Clock, Shield, ShieldCheck } from 'lucide-react';
import { MobileListRow } from '../canon';
import { formatRelativeTime } from '../../../utils/activityUtils';
import {
  formatInsurancePlanType,
  normalizeInsuranceStatus,
} from '../../pages/insurance/insurancePageModel';
import {
  getMobileInsuranceOrbClass,
  getMobileInsurancePill,
  getMobileInsuranceVital,
} from './mobileInsuranceModel';

const getStatusIcon = (status) => {
  switch (normalizeInsuranceStatus(status)) {
    case 'active':
      return ShieldCheck;
    case 'pending':
      return Clock;
    case 'expired':
      return AlertTriangle;
    default:
      return Shield;
  }
};

export const MobileInsuranceRow = ({
  policy,
  onOpen,
  selectionActive,
  selected,
  selectionMode,
  onToggleSelect,
  onLongPress,
}) => {
  const status = normalizeInsuranceStatus(policy.status);
  const vital = getMobileInsuranceVital(status);
  const planType = formatInsurancePlanType(policy);
  const providerLabel = policy.provider_name || 'Unknown provider';

  return (
    <MobileListRow
      item={policy}
      dataAttr="data-mobile-insurance-row"
      onOpen={onOpen}
      ariaLabel={`${policy.policy_holder_name || policy.policy_number || 'Insurance policy'}, ${vital?.pill?.label || status}`}
      orbClass={getMobileInsuranceOrbClass(status)}
      icon={getStatusIcon(status)}
      title={policy.policy_holder_name || policy.policy_number || 'Unnamed policy'}
      meta={planType ? `${providerLabel} / ${planType}` : providerLabel}
      time={formatRelativeTime(policy.created_at)}
      markerChip={policy.verified ? 'Verified' : null}
      pill={vital?.pill || getMobileInsurancePill(status)}
      selectable={selectionActive}
      selected={selected}
      selectionMode={selectionMode}
      onToggleSelect={onToggleSelect}
      onLongPress={onLongPress}
    />
  );
};
