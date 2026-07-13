import {
  Ambulance,
  BarChart3,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

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
  driver: {
    label: 'Driver',
    primaryAction: 'Open requests',
    path: '/emergencies',
    icon: Ambulance,
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

export const countOrNull = (value, live) => {
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

export const pluralize = (count, singular, plural = `${singular}s`) => (
  count === 1 ? singular : plural
);
