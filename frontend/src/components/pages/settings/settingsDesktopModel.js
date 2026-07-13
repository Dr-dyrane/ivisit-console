import {
  Moon,
  Phone,
  ShieldCheck,
  Sun,
  UserCog,
} from 'lucide-react';

export const SETTINGS_TONE_CLASS = {
  account: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  muted: 'bg-foreground/[0.055] text-muted-foreground dark:bg-white/[0.06]',
};

export const getSettingsSignal = (roleLabel) => ({
  icon: UserCog,
  label: `${roleLabel} account`,
  headline: 'Your account settings',
  subhead: 'Manage your profile, sign-in options, appearance, and current session.',
  tone: 'account',
});

export const getSettingsMetrics = ({ roleLabel, darkMode, phone }) => ([
  {
    id: 'access',
    label: 'Access',
    value: roleLabel,
    icon: ShieldCheck,
    priority: 1,
    toneClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
  },
  {
    id: 'theme',
    label: 'Theme',
    value: darkMode ? 'Dark' : 'Light',
    icon: darkMode ? Moon : Sun,
    priority: 2,
    toneClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-200',
  },
  {
    id: 'mobile',
    label: 'Phone',
    value: phone ? 'Added' : 'Not added',
    icon: Phone,
    priority: 3,
    toneClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-200',
  },
]);
