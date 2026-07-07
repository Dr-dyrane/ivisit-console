import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity,
  Ambulance,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { usePageData } from '../../contexts/PageDataContext';
import { usePageFooter, usePageHeader, usePageShell } from '../../contexts/LayoutContext';
import { getConsoleModuleRailItems } from '../../config/consoleModuleRail';
import { ConsoleModuleRail } from '../common/ConsoleModuleRail';
import { SEOHead } from '../common/SEOHead';

const appleEase = [0.21, 0.47, 0.32, 0.98];
const routeFeedbackMs = 320;

export const ROLE_COPY = {
  admin: {
    label: 'Platform admin',
    primaryAction: 'Review requests',
    path: '/emergencies',
    icon: Ambulance,
  },
  org_admin: {
    label: 'Hospital admin',
    primaryAction: 'Review approvals',
    path: '/verification',
    icon: ShieldCheck,
  },
  provider: {
    label: 'Care provider',
    primaryAction: 'Open visits',
    path: '/visits',
    icon: Stethoscope,
  },
  sponsor: {
    label: 'Sponsor',
    primaryAction: 'View impact',
    path: '/analytics',
    icon: BarChart3,
  },
  viewer: {
    label: 'Viewer',
    primaryAction: 'Open settings',
    path: '/settings',
    icon: LockKeyhole,
  },
};

export function getTodayModuleRailItems(roleKind = 'viewer') {
  return getConsoleModuleRailItems(roleKind);
}

const countOrNull = (value, live) => {
  if (!live) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

export function resolveTodayProviderCount({ doctorsStats, userData, live }) {
  const doctorCount = countOrNull(doctorsStats?.totalDoctors ?? doctorsStats?.total, live);
  const profileProviderCount = countOrNull(userData?.statistics?.roleDistribution?.provider, live);

  if (doctorCount > 0) return doctorCount;
  if (profileProviderCount > 0) return profileProviderCount;

  return doctorCount ?? profileProviderCount ?? 0;
}

const pluralize = (count, singular, plural = `${singular}s`) => (
  count === 1 ? singular : plural
);

function useRoleKind(explicitRole) {
  const { isAdmin, isOrgAdmin, isProvider, isSponsor, isViewer } = useAuth();

  return useMemo(() => {
    if (explicitRole) return explicitRole;
    if (isAdmin()) return 'admin';
    if (isOrgAdmin()) return 'org_admin';
    if (isProvider()) return 'provider';
    if (isSponsor()) return 'sponsor';
    if (isViewer()) return 'viewer';
    return 'viewer';
  }, [explicitRole, isAdmin, isOrgAdmin, isProvider, isSponsor, isViewer]);
}

export function buildToday({
  roleKind,
  live,
  emergencyCount,
  emergencyReviewCount = emergencyCount,
  emergencyActiveCount = emergencyCount,
  approvalCount,
  visitCount,
  providerCount,
}) {
  const role = ROLE_COPY[roleKind] || ROLE_COPY.viewer;
  const requestReviewCount = Number(emergencyReviewCount) || 0;
  const requestActiveCount = Number(emergencyActiveCount) || 0;

  if (!live) {
    return {
      headline: 'Live details are not ready',
      subhead: `Open ${role.primaryAction.toLowerCase()} or try again when the data finishes loading.`,
      sheetTitle: 'Today',
      sheetHint: 'Start with the page that matches your role.',
      status: 'Not ready yet',
      primaryAction: role.primaryAction,
      path: role.path,
      icon: role.icon,
      tone: 'muted',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && requestReviewCount > 0) {
    return {
      headline: `${requestReviewCount} ${pluralize(requestReviewCount, 'request')} to review`,
      subhead: 'Open requests and start with the newest item that needs review.',
      sheetTitle: 'Requests',
      sheetHint: 'Review the first waiting request.',
      status: 'Needs attention',
      primaryAction: 'Review',
      path: '/emergencies',
      icon: Ambulance,
      tone: 'danger',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && approvalCount > 0) {
    return {
      headline: `${approvalCount} pending ${pluralize(approvalCount, 'approval')}`,
      subhead: 'Open approvals and clear the first waiting record.',
      sheetTitle: 'Pending approvals',
      sheetHint: 'Clear the oldest approval first.',
      status: 'Needs attention',
      primaryAction: 'Review approvals',
      path: '/verification',
      icon: ShieldCheck,
      tone: 'warning',
    };
  }

  if ((roleKind === 'admin' || roleKind === 'org_admin') && requestActiveCount > 0) {
    return {
      headline: `${requestActiveCount} active ${pluralize(requestActiveCount, 'request')}`,
      subhead: 'Open Requests to check current care activity.',
      sheetTitle: 'Requests',
      sheetHint: 'Check the active request.',
      status: 'Active',
      primaryAction: 'Open requests',
      path: '/emergencies',
      icon: Ambulance,
      tone: 'primary',
    };
  }

  if (roleKind === 'provider') {
    return {
      headline: visitCount > 0 ? `${visitCount} visit ${pluralize(visitCount, 'item')}` : 'No visits right now',
      subhead: visitCount > 0 ? 'Open visits and start with the next care item.' : 'Keep Today open; assigned visits will appear here.',
      sheetTitle: 'Your visits',
      sheetHint: visitCount > 0 ? 'Start with the next visit.' : 'Check requests or ask for help if work is missing.',
      status: visitCount > 0 ? 'Ready' : 'Clear',
      primaryAction: 'Open visits',
      path: '/visits',
      icon: Stethoscope,
      tone: visitCount > 0 ? 'primary' : 'muted',
    };
  }

  if (roleKind === 'sponsor') {
    return {
      headline: 'Impact is ready to review',
      subhead: 'Open impact to review current outcomes and request activity.',
      sheetTitle: 'Impact',
      sheetHint: 'Review outcomes before asking for changes.',
      status: 'Read only',
      primaryAction: 'View impact',
      path: '/analytics',
      icon: BarChart3,
      tone: 'primary',
    };
  }

  if (roleKind === 'viewer') {
    return {
      headline: 'Activation needed',
      subhead: 'Open settings, confirm your profile, then ask an admin for access.',
      sheetTitle: 'Account setup',
      sheetHint: 'Start with your profile.',
      status: 'Limited access',
      primaryAction: 'Open settings',
      path: '/settings',
      icon: LockKeyhole,
      tone: 'muted',
    };
  }

  return {
    headline: 'All clear for now',
    subhead: providerCount > 0 ? 'Check routine work or leave Today open for new requests.' : 'Start with routine checks or leave Today open.',
    sheetTitle: 'Today',
    sheetHint: 'Choose one routine check.',
    status: 'Clear',
    primaryAction: role.primaryAction,
    path: role.path,
    icon: role.icon,
    tone: 'success',
  };
}

export function buildGlanceItems({
  roleKind,
  live,
  emergencyCount,
  emergencyReviewCount = emergencyCount,
  emergencyActiveCount = emergencyCount,
  approvalCount,
  visitCount,
  providerCount,
}) {
  const role = ROLE_COPY[roleKind] || ROLE_COPY.viewer;
  const requestReviewCount = Number(emergencyReviewCount) || 0;
  const requestActiveCount = Number(emergencyActiveCount) || 0;
  const requestValue = requestReviewCount > 0
    ? `${requestReviewCount} to review`
    : requestActiveCount > 0
      ? `${requestActiveCount} active`
      : 'Clear';
  const requestTone = requestReviewCount > 0
    ? 'danger'
    : requestActiveCount > 0
      ? 'primary'
      : 'success';

  if (!live) {
    return [
      { label: 'Status', value: 'Retry needed', path: role.path, tone: 'muted' },
      { label: 'Role', value: role.label, path: '/settings', tone: 'muted' },
      { label: 'Next', value: role.primaryAction, path: role.path, tone: 'primary' },
    ];
  }

  if (roleKind === 'admin') {
    return [
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Approvals', value: approvalCount > 0 ? `${approvalCount} waiting` : 'Clear', path: '/verification', tone: approvalCount > 0 ? 'warning' : 'success' },
      { label: 'Staff', value: providerCount > 0 ? `${providerCount} records` : 'Check staff', path: '/doctors', tone: providerCount > 0 ? 'primary' : 'muted' },
    ];
  }

  if (roleKind === 'org_admin') {
    return [
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Approvals', value: approvalCount > 0 ? `${approvalCount} waiting` : 'Clear', path: '/verification', tone: approvalCount > 0 ? 'warning' : 'success' },
      { label: 'Staff', value: providerCount > 0 ? `${providerCount} records` : 'Check staff', path: '/doctors', tone: providerCount > 0 ? 'primary' : 'muted' },
    ];
  }

  if (roleKind === 'provider') {
    return [
      { label: 'Visits', value: visitCount > 0 ? `${visitCount} today` : 'Clear', path: '/visits', tone: visitCount > 0 ? 'primary' : 'muted' },
      { label: 'Requests', value: requestValue, path: '/emergencies', tone: requestTone },
      { label: 'Help', value: 'Available', path: '/support-tickets', tone: 'muted' },
    ];
  }

  if (roleKind === 'sponsor') {
    return [
      { label: 'Impact', value: 'Open report', path: '/analytics', tone: 'primary' },
      { label: 'Requests', value: 'In impact', path: '/analytics', tone: 'primary' },
      { label: 'Access', value: 'Read only', path: '/settings', tone: 'muted' },
    ];
  }

  return [
    { label: 'Setup', value: 'Settings', path: '/settings', tone: 'primary' },
    { label: 'Role', value: 'Limited', path: '/settings', tone: 'muted' },
    { label: 'Access', value: 'Ask admin', path: '/settings', tone: 'warning' },
  ];
}

export function buildActionRows({
  roleKind,
  live,
  emergencyCount,
  emergencyReviewCount = emergencyCount,
  emergencyActiveCount = emergencyCount,
  approvalCount,
  visitCount,
  providerCount,
  roleCopy,
  loading,
}) {
  const requestReviewCount = Number(emergencyReviewCount) || 0;
  const requestActiveCount = Number(emergencyActiveCount) || 0;

  if (!live) {
    return [
      {
        id: 'open-role-page',
        label: roleCopy.primaryAction,
        meta: 'Live details not ready',
        detail: 'Open the role page and check whether the work is available there.',
        actionLabel: roleCopy.primaryAction,
        path: roleCopy.path,
        loading: Boolean(loading?.emergency),
        tone: 'muted',
      },
      {
        id: 'check-profile',
        label: 'Check account access',
        meta: `${roleCopy.label} access`,
        detail: 'Open Settings if this role or account does not look right.',
        actionLabel: 'Open settings',
        path: '/settings',
        tone: 'muted',
      },
    ];
  }

  const requestsRow = {
    id: 'requests',
    label: requestReviewCount > 0 ? 'Review requests' : 'Check requests',
    meta: requestReviewCount > 0
      ? `${requestReviewCount} to review`
      : requestActiveCount > 0
        ? `${requestActiveCount} active`
        : 'No requests to review',
    detail: requestReviewCount > 0
      ? 'Open Requests and start with the newest item that needs review.'
      : requestActiveCount > 0
        ? 'Open Requests to check current care activity.'
        : 'Open Requests only if you need recent activity.',
    actionLabel: requestReviewCount > 0 ? 'Review requests' : 'Open requests',
    path: '/emergencies',
    done: requestReviewCount === 0 && requestActiveCount === 0,
    loading: Boolean(loading?.emergency),
    tone: requestReviewCount > 0 ? 'danger' : requestActiveCount > 0 ? 'primary' : 'success',
  };

  const approvalsRow = {
    id: 'approvals',
    label: 'Review pending approvals',
    meta: approvalCount > 0 ? `${approvalCount} waiting` : 'Nothing waiting',
    detail: approvalCount > 0
      ? 'Open Approvals and clear the oldest waiting record first.'
      : 'No approval work is waiting right now.',
    actionLabel: 'Open approvals',
    path: '/verification',
    done: approvalCount === 0,
    tone: approvalCount > 0 ? 'warning' : 'success',
  };

  const staffRow = {
    id: 'staff',
    label: 'Check staff records',
    meta: providerCount > 0 ? `${providerCount} records` : 'No staff count yet',
    detail: 'Open Staff before making access, schedule, or care-team changes.',
    actionLabel: 'Open staff',
    path: '/doctors',
    done: providerCount > 0,
    tone: providerCount > 0 ? 'primary' : 'muted',
  };

  const visitsRow = {
    id: 'visits',
    label: 'Open today\'s visits',
    meta: visitCount > 0 ? `${visitCount} today` : 'No visits right now',
    detail: visitCount > 0
      ? 'Open Visits and start with the next assigned care item.'
      : 'Open Visits if an assignment is missing or delayed.',
    actionLabel: 'Open visits',
    path: '/visits',
    done: visitCount > 0,
    tone: visitCount > 0 ? 'primary' : 'muted',
  };

  const supportRow = {
    id: 'support',
    label: 'Ask for help',
    meta: 'Support is available',
    detail: 'Open Help when a request, visit, or account state does not look right.',
    actionLabel: 'Open help',
    path: '/support-tickets',
    done: true,
    tone: 'muted',
  };

  const settingsRow = {
    id: 'settings',
    label: 'Confirm account setup',
    meta: `${roleCopy.label} access`,
    detail: 'Open Settings and confirm your profile before asking for more access.',
    actionLabel: 'Open settings',
    path: '/settings',
    done: roleKind !== 'viewer',
    tone: roleKind === 'viewer' ? 'warning' : 'muted',
  };

  if (roleKind === 'admin') {
    const organizationRow = {
      id: 'organizations',
      label: 'Review organizations',
      meta: 'Admin access',
      detail: 'Open Organizations before changing sponsor, hospital, or billing ownership.',
      actionLabel: 'Open organizations',
      path: '/organizations',
      done: true,
      tone: 'muted',
    };

    if (requestReviewCount === 0 && approvalCount > 0) {
      return [
        approvalsRow,
        requestsRow,
        staffRow,
        organizationRow,
      ];
    }

    return [
      requestsRow,
      approvalsRow,
      staffRow,
      organizationRow,
    ];
  }

  if (roleKind === 'org_admin') {
    return [approvalsRow, requestsRow, staffRow, {
      id: 'payments',
      label: 'Check payments',
      meta: 'Wallet and pricing',
      detail: 'Open Payments before making wallet, pricing, or billing changes.',
      actionLabel: 'Open payments',
      path: '/wallet',
      done: true,
      tone: 'muted',
    }];
  }

  if (roleKind === 'provider') {
    return [visitsRow, requestsRow, supportRow, settingsRow];
  }

  if (roleKind === 'sponsor') {
    return [
      {
        id: 'impact',
        label: 'Review impact',
        meta: 'Read-only report',
        detail: 'Open Impact to review outcomes and recent request activity.',
        actionLabel: 'Open impact',
        path: '/analytics',
        done: true,
        tone: 'primary',
      },
      {
        id: 'requests',
        label: 'Review request activity',
        meta: 'In impact',
        detail: 'Request activity is visible in Impact without changing care work.',
        done: true,
        tone: 'primary',
      },
      settingsRow,
    ];
  }

  return [
    settingsRow,
    {
      id: 'request-access',
      label: 'Ask admin for access',
      meta: 'Role assignment needed',
      detail: 'Contact an admin after confirming your profile details in Settings.',
      disabledReason: 'An admin needs to assign your role before this action is available.',
      disabled: true,
      tone: 'muted',
    },
  ];
}

const statusClass = {
  danger: 'bg-primary/10 text-primary dark:bg-primary/25 dark:text-red-100',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  muted: 'bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
};

const rowToneClass = {
  danger: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-red-100',
  warning: 'bg-amber-500/10 text-amber-700 dark:bg-amber-300/15 dark:text-amber-100',
  primary: 'bg-sky-500/10 text-sky-700 dark:bg-sky-300/15 dark:text-sky-100',
  success: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-300/15 dark:text-emerald-100',
  muted: 'bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06] dark:text-slate-200',
};

const AtlasLayer = () => (
  <div className="absolute inset-0 overflow-hidden bg-background">
    <div
      className="absolute inset-0 opacity-[0.34] dark:opacity-[0.28]"
      style={{
        backgroundImage:
          'linear-gradient(115deg, transparent 0 45%, hsl(var(--foreground) / 0.07) 45% 48%, transparent 48%), linear-gradient(28deg, transparent 0 42%, hsl(var(--foreground) / 0.055) 42% 45%, transparent 45%), linear-gradient(155deg, transparent 0 64%, hsl(var(--primary) / 0.08) 64% 67%, transparent 67%)',
        backgroundSize: '260px 180px, 340px 240px, 420px 280px',
        backgroundPosition: '20px 10px, -80px 50px, 18% 38%',
      }}
    />
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(circle at 35% 35%, hsl(var(--primary) / 0.13), transparent 30%), radial-gradient(circle at 78% 62%, hsl(var(--foreground) / 0.06), transparent 26%), linear-gradient(180deg, hsl(var(--background) / 0.20), hsl(var(--background)) 92%)',
      }}
    />
  </div>
);

const GlanceCard = ({ item, onAction, routingPath }) => {
  const isOpening = item.path && routingPath === item.path;
  const toneClass = rowToneClass[item.tone] || rowToneClass.muted;

  return (
    <motion.button
      type="button"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onAction(item.path)}
      disabled={!item.path}
      aria-label={`${item.label}: ${item.value}${isOpening ? ', opening' : ''}`}
      data-today-glance={item.label.toLowerCase()}
      data-state={isOpening ? 'opening' : 'idle'}
      style={{ outline: 'none' }}
      className="group min-h-[66px] cursor-pointer rounded-inner bg-card/65 px-3 py-2.5 text-left shadow-[0_16px_38px_rgb(0_0_0/0.08)] backdrop-blur-xl transition-[background,box-shadow,transform] duration-200 hover:bg-card/82 focus-visible:-translate-y-0.5 focus-visible:bg-foreground/10 focus-visible:shadow-[0_24px_58px_rgb(0_0_0/0.18)] active:bg-card/90 disabled:pointer-events-none disabled:opacity-70 dark:bg-white/[0.055] dark:hover:bg-white/[0.085] dark:focus-visible:bg-white/[0.12] sm:px-4 md:py-3"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block text-[10px] font-medium text-muted-foreground sm:text-[11px]">
            {item.label}
          </span>
          <span className="mt-1 block text-[13px] font-semibold leading-tight text-foreground [overflow-wrap:anywhere] sm:text-sm">
            {item.value}
          </span>
        </span>
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-pill transition-[background,color,transform] duration-200 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 ${toneClass}`}>
          {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
        </span>
      </span>
    </motion.button>
  );
};

const TodayCenter = ({ today, roleCopy, live, glanceItems, onAction, routingPath }) => {
  const Icon = today.icon || Activity;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.48, ease: appleEase }}
      className="relative z-10 flex min-h-[210px] min-w-0 flex-1 items-center px-6 pb-5 pt-7 md:min-h-[520px] md:px-12 md:py-10 lg:pl-24"
    >
      <div className="max-w-2xl">
        <div className={`mb-4 inline-flex items-center gap-2 rounded-pill px-3 py-2 text-xs font-semibold md:mb-5 ${rowToneClass[today.tone] || rowToneClass.muted}`}>
          <Icon className="h-4 w-4" />
          {today.status}
        </div>
        <h1 className="max-w-2xl text-[34px] font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
          {today.headline}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground md:mt-4 md:text-base">
          {today.subhead}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-6">
          <span className="rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
            {roleCopy.label}
          </span>
          {!live && (
            <span className="rounded-pill bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-xl dark:bg-white/[0.06]">
              Retry needed
            </span>
          )}
        </div>
        <div className="mt-5 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-3 md:mt-7">
          {glanceItems.map((item) => (
            <GlanceCard
              key={item.label}
              item={item}
              onAction={onAction}
              routingPath={routingPath}
            />
          ))}
        </div>
      </div>
    </motion.section>
  );
};

const DetailRow = ({ row, expanded, onToggle, onAction, routingPath }) => {
  const StatusIcon = row.loading ? Loader2 : row.disabled ? LockKeyhole : row.done ? CheckCircle2 : CircleDashed;
  const isOpening = routingPath === row.path;
  const rowState = row.disabled ? 'unavailable' : isOpening ? 'opening' : expanded ? 'expanded' : 'idle';

  return (
    <div
      data-today-row={row.id}
      data-state={rowState}
      aria-disabled={row.disabled ? 'true' : undefined}
      className={`group w-full rounded-inner p-2 text-left transition-[background,transform] duration-200 active:scale-[0.99] md:rounded-card md:p-4 ${
        row.disabled
          ? 'bg-foreground/[0.035] text-muted-foreground dark:bg-white/[0.035]'
          : 'bg-foreground/[0.045] text-foreground hover:bg-foreground/[0.07] dark:bg-white/[0.055] dark:hover:bg-white/[0.085]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${row.label}: ${row.meta}${row.disabledReason ? `. ${row.disabledReason}` : ''}`}
        data-state={rowState}
        className="flex w-full items-center gap-2.5 text-left md:gap-3"
      >
        <span className={`flex h-6 w-6 items-center justify-center rounded-pill md:h-9 md:w-9 ${rowToneClass[row.tone] || rowToneClass.muted}`}>
          <StatusIcon className={`h-3 w-3 md:h-4 md:w-4 ${row.loading ? 'animate-spin' : ''}`} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold md:text-sm">{row.label}</span>
          <span className="block truncate text-[11px] text-muted-foreground md:text-xs">{row.meta}</span>
        </span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="ml-10 mt-3 text-xs leading-5 text-foreground/82 md:ml-12"
        >
          <p>{row.detail}</p>
          {row.disabledReason && (
            <p className="mt-2 text-muted-foreground">{row.disabledReason}</p>
          )}
          {row.path && row.actionLabel && (
            <button
              type="button"
              onClick={() => onAction(row.path)}
              data-state={isOpening ? 'opening' : 'idle'}
              aria-label={`${row.actionLabel}${isOpening ? ', opening' : ''}`}
              className="mt-3 inline-flex items-center gap-2 rounded-pill bg-foreground/[0.18] px-3 py-2 text-xs font-semibold text-foreground shadow-[0_8px_18px_rgb(0_0_0/0.10)] transition-[background,transform] active:scale-[0.98] hover:bg-foreground/[0.22] dark:bg-white/[0.24] dark:hover:bg-white/[0.30]"
            >
              {isOpening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {isOpening ? 'Opening...' : row.actionLabel}
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
};

const TodaySheet = ({ today, rows, expandedRow, onToggleRow, onPrimary, onRowAction, routingPath }) => (
  <motion.aside
    initial={{ opacity: 0, y: 18, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.46, delay: 0.08, ease: appleEase }}
    className="relative z-20 mt-auto mb-[calc(13rem+var(--safe-bottom))] rounded-t-sheet bg-card/78 p-3 text-foreground shadow-[0_24px_70px_rgb(0_0_0/0.16)] backdrop-blur-2xl dark:bg-card/55 md:mx-5 md:mb-5 md:rounded-sheet lg:mt-5 lg:w-[380px] lg:shrink-0 lg:self-stretch xl:w-[440px]"
  >
    <div className="mx-auto mb-3 h-1.5 w-[42px] rounded-pill bg-foreground/20" />

    <div className="rounded-modal bg-background/55 p-3 dark:bg-white/[0.05] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={`inline-flex rounded-pill px-3 py-1 text-[11px] font-semibold ${statusClass[today.tone] || statusClass.muted}`}>
            {today.status}
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight md:mt-4 md:text-2xl">{today.sheetTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{today.sheetHint}</p>
        </div>
        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-pill bg-foreground/[0.05] text-muted-foreground dark:bg-white/[0.06]">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      <button
        type="button"
        onClick={onPrimary}
        data-state={routingPath === today.path ? 'opening' : 'idle'}
        aria-label={`${today.primaryAction}${routingPath === today.path ? ', opening' : ''}`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-button bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-[0_16px_36px_rgb(0_0_0/0.16)] transition-[background,transform] hover:bg-foreground/90 active:scale-[0.98] dark:bg-white dark:text-black dark:hover:bg-white/90 md:mt-5 md:py-3.5"
      >
        {routingPath === today.path ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        {routingPath === today.path ? 'Opening...' : today.primaryAction}
      </button>
    </div>

    <div className="mt-2 max-h-[112px] space-y-2 overflow-y-auto no-scrollbar sm:max-h-[148px] md:mt-3 md:max-h-none md:overflow-visible">
      {rows.map((row) => (
        <DetailRow
          key={row.id}
          row={row}
          expanded={expandedRow === row.id}
          onToggle={() => onToggleRow(row.id)}
          onAction={onRowAction}
          routingPath={routingPath}
        />
      ))}
    </div>
  </motion.aside>
);

export const TodayHome = ({ role }) => {
  const navigate = useNavigate();
  const roleKind = useRoleKind(role);
  const {
    emergencyStats,
    verificationData,
    doctorsStats,
    visitsStats,
    userData,
    loading,
    useMockData,
    domainErrors,
  } = usePageData();
  const [expandedRow, setExpandedRow] = useState(null);
  const [routingPath, setRoutingPath] = useState(null);

  const todayDomainErrors = {
    admin: ['emergency', 'verification', 'doctors', 'users'],
    org_admin: ['emergency', 'verification', 'doctors', 'users'],
    provider: ['emergency', 'visits'],
    sponsor: ['analytics'],
    viewer: [],
  };
  const hasTodayDataError = (todayDomainErrors[roleKind] || todayDomainErrors.viewer)
    .some((domain) => Boolean(domainErrors?.[domain]));
  const hasTodayLoading = (todayDomainErrors[roleKind] || todayDomainErrors.viewer)
    .some((domain) => Boolean(loading?.[domain]));
  const live = !useMockData && !hasTodayDataError && !hasTodayLoading;
  const roleCopy = ROLE_COPY[roleKind] || ROLE_COPY.viewer;
  const visibleModuleRail = useMemo(
    () => getTodayModuleRailItems(roleKind),
    [roleKind]
  );

  const emergencyReviewCount = countOrNull(emergencyStats?.pending_approval ?? emergencyStats?.pending, live) ?? 0;
  const emergencyActiveCount = countOrNull(emergencyStats?.active, live) ?? 0;
  const approvalCount = countOrNull(verificationData?.pending, live) ?? 0;
  const visitCount = countOrNull(visitsStats?.today, live) ?? 0;
  const providerCount = resolveTodayProviderCount({ doctorsStats, userData, live });

  const today = useMemo(() => buildToday({
    roleKind,
    live,
    emergencyReviewCount,
    emergencyActiveCount,
    approvalCount,
    visitCount,
    providerCount,
  }), [approvalCount, emergencyActiveCount, emergencyReviewCount, live, providerCount, roleKind, visitCount]);

  const glanceItems = useMemo(() => buildGlanceItems({
    roleKind,
    live,
    emergencyReviewCount,
    emergencyActiveCount,
    approvalCount,
    visitCount,
    providerCount,
  }), [approvalCount, emergencyActiveCount, emergencyReviewCount, live, providerCount, roleKind, visitCount]);

  const headerAction = useMemo(() => (
    <span className="hidden md:inline-flex items-center rounded-pill bg-card/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {roleCopy.label}
    </span>
  ), [roleCopy.label]);

  usePageHeader('Today', headerAction);
  usePageFooter(null, 'status', false);
  usePageShell({ bleed: true, hideFab: true });

  const rows = useMemo(() => buildActionRows({
    roleKind,
    live,
    emergencyReviewCount,
    emergencyActiveCount,
    approvalCount,
    visitCount,
    providerCount,
    roleCopy,
    loading,
  }), [approvalCount, emergencyActiveCount, emergencyReviewCount, live, loading, providerCount, roleCopy, roleKind, visitCount]);

  const activeExpandedRow = useMemo(() => {
    if (expandedRow === '__collapsed__') return null;
    if (rows.some((row) => row.id === expandedRow)) return expandedRow;
    return null;
  }, [expandedRow, rows]);

  const handleToggleRow = useCallback((rowId) => {
    setExpandedRow((current) => (current === rowId ? '__collapsed__' : rowId));
  }, []);

  const handleAction = useCallback((path) => {
    if (!path) return;
    setRoutingPath(path);
    window.setTimeout(() => {
      navigate(path);
    }, routeFeedbackMs);
  }, [navigate]);

  const handlePrimary = useCallback(() => {
    handleAction(today.path);
  }, [handleAction, today.path]);

  const todayPanelContext = useMemo(() => ({
    page: 'today',
    roleKind,
    roleLabel: roleCopy.label,
    live,
    loading: hasTodayLoading,
    hasError: hasTodayDataError || useMockData,
    today: {
      headline: today.headline,
      status: today.status,
      primaryAction: today.primaryAction,
      path: today.path,
      sheetTitle: today.sheetTitle,
      sheetHint: today.sheetHint,
      tone: today.tone,
    },
    glanceItems,
    rows,
    counts: {
      requests: emergencyReviewCount,
      activeRequests: emergencyActiveCount,
      approvals: approvalCount,
      visits: visitCount,
      staff: providerCount,
    },
    routingPath,
    onNavigate: handleAction,
  }), [
    approvalCount,
    emergencyActiveCount,
    emergencyReviewCount,
    glanceItems,
    handleAction,
    hasTodayDataError,
    hasTodayLoading,
    live,
    providerCount,
    roleCopy.label,
    roleKind,
    routingPath,
    rows,
    today.headline,
    today.path,
    today.primaryAction,
    today.sheetHint,
    today.sheetTitle,
    today.status,
    today.tone,
    useMockData,
    visitCount,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const publishTodayRouteContext = () => {
      window.dispatchEvent(new CustomEvent('todayRouteContextUpdated', {
        detail: todayPanelContext,
      }));
    };

    publishTodayRouteContext();
    window.addEventListener('requestTodayRouteContext', publishTodayRouteContext);

    return () => {
      window.removeEventListener('requestTodayRouteContext', publishTodayRouteContext);
    };
  }, [todayPanelContext]);

  return (
    <div className="min-h-[calc(100dvh-3rem)]">
      <SEOHead title="Today" description="Role-scoped home for iVisit Console." />

      <section className="relative flex min-h-[calc(100dvh-3rem)] overflow-hidden bg-background text-foreground">
        <AtlasLayer />
        <ConsoleModuleRail
          items={visibleModuleRail}
          activePath="/"
          onNavigate={handleAction}
          routingPath={routingPath}
        />

        <div className="relative z-10 flex min-h-full w-full min-w-0 flex-col lg:flex-row lg:items-center">
          <TodayCenter
            today={today}
            roleCopy={roleCopy}
            live={live}
            glanceItems={glanceItems}
            onAction={handleAction}
            routingPath={routingPath}
          />
          <TodaySheet
            today={today}
            rows={rows}
            expandedRow={activeExpandedRow}
            onToggleRow={handleToggleRow}
            onPrimary={handlePrimary}
            onRowAction={handleAction}
            routingPath={routingPath}
          />
        </div>
      </section>
    </div>
  );
};

export default TodayHome;
