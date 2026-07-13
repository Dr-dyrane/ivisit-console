import React from 'react';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Eye,
  Hash,
  Percent,
  Shield,
  ShieldCheck,
  Tag,
  User,
} from 'lucide-react';
import { MobileDetailSheet } from '../MobileDetailSheet';
import {
  formatInsuranceCoverage,
  formatInsuranceDate,
  formatInsurancePlanType,
  normalizeInsuranceStatus,
} from '../../pages/insurance/insurancePageModel';
import {
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

export const MobileInsuranceDetailSheet = ({
  denied,
  activePolicy,
  setActivePolicy,
  onView,
}) => {
  if (denied || !activePolicy) return null;

  const policyStatus = normalizeInsuranceStatus(activePolicy.status);
  const vital = getMobileInsuranceVital(policyStatus);
  const planType = formatInsurancePlanType(activePolicy);

  return (
    <MobileDetailSheet
      isOpen={!!activePolicy}
      onClose={() => setActivePolicy(null)}
      icon={getStatusIcon(policyStatus)}
      iconTone={vital?.tone || 'hsl(215 16% 47%)'}
      eyebrow="Insurance policy"
      title={activePolicy.policy_holder_name || activePolicy.policy_number || 'Unnamed policy'}
      statusPill={vital?.pill || getMobileInsurancePill(policyStatus)}
      vital={vital ? { ...vital, label: 'Policy status' } : null}
      islands={[
        { icon: User, label: 'Holder', value: activePolicy.policy_holder_name },
        { icon: Building2, label: 'Provider', value: activePolicy.provider_name },
        { icon: Hash, label: 'Policy number', value: activePolicy.policy_number },
        { icon: Tag, label: 'Plan type', value: planType },
        { icon: Percent, label: 'Coverage rate', value: formatInsuranceCoverage(activePolicy) },
        { icon: Calendar, label: 'Expires', value: formatInsuranceDate(activePolicy.end_date, null) },
        {
          icon: ShieldCheck,
          label: 'Verification',
          value: activePolicy.verified ? 'Verified' : 'Not verified',
        },
      ]}
      primary={{
        label: 'Details',
        icon: Eye,
        onClick: () => {
          setActivePolicy(null);
          onView?.(activePolicy);
        },
        tone: vital?.accent,
      }}
    />
  );
};
