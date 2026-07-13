import { getProviderPersonaKind } from '../../pages/verification/verificationQueueModel';

export const APPROVE_TONE = 'hsl(162 94% 24%)';

export const tokenLabel = (value, fallback = '') => {
  const text = String(value || fallback).replace(/[_-]+/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const isPendingItem = (item, queueType) => (
  queueType === 'providers'
    ? !item?.bvn_verified
    : String(item?.verification_status || '').toLowerCase() === 'pending'
);

export const itemStatusKey = (item, queueType) => (
  queueType === 'providers'
    ? (item?.bvn_verified ? 'verified' : 'pending')
    : String(item?.verification_status || 'pending').toLowerCase()
);

export const providerPersonaLabel = (providerType) => (
  providerType ? tokenLabel(providerType) : 'Provider'
);

export const providerPersonaOrb = (providerType) => (
  getProviderPersonaKind(providerType) === 'responder'
    ? 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
    : 'bg-amber-500/12 text-amber-700 dark:text-amber-300'
);

export const providerPersonaTone = (providerType) => (
  getProviderPersonaKind(providerType) === 'responder'
    ? 'hsl(189 94% 43%)'
    : 'hsl(38 92% 50%)'
);

export const facilityOrbClass = (statusKey) => (
  statusKey === 'verified'
    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300'
    : statusKey === 'rejected'
      ? 'bg-muted/40 text-muted-foreground'
      : 'bg-cyan-500/12 text-cyan-700 dark:text-cyan-300'
);

export const buildMobileVerificationSummary = ({
  queueType,
  stats,
  orgStats,
  filters,
  sourceLength,
}) => {
  const activeStats = queueType === 'providers' ? stats : orgStats;
  const approved = queueType === 'providers'
    ? (activeStats?.approved || 0)
    : (activeStats?.verified || 0);
  const total = activeStats?.total || sourceLength;
  const activeStatus = filters?.status || 'all';
  const scopeCount = activeStatus === 'all'
    ? total
    : activeStatus === 'approved'
      ? approved
      : (activeStats?.[activeStatus] || 0);

  return {
    activeStats,
    activeStatus,
    scopeCount,
    hasFilter: Boolean(filters?.search) || activeStatus !== 'all',
    kpis: [
      { id: 'pending', label: 'Pending', value: activeStats?.pending || 0, color: 'hsl(192 91% 36%)' },
      { id: 'approved', label: 'Approved', value: approved, color: 'hsl(162 94% 24%)' },
      ...(queueType === 'providers'
        ? []
        : [{ id: 'rejected', label: 'Rejected', value: activeStats?.rejected || 0, color: 'hsl(var(--destructive))' }]),
      { id: 'all', label: 'Total', value: total, color: 'hsl(var(--muted-foreground))' },
    ],
  };
};

export const approveProvidersSequentially = async (ids, onApprove, onProgress) => {
  const queue = Array.from(new Set(ids || []));
  const succeededIds = [];
  const failedIds = [];

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    try {
      const result = await onApprove(id, true);
      if (result === false) failedIds.push(id);
      else succeededIds.push(id);
    } catch {
      failedIds.push(id);
    }
    onProgress?.({ completed: index + 1, total: queue.length });
  }

  return { succeededIds, failedIds };
};
