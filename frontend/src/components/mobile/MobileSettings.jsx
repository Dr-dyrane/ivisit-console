import React, { useCallback } from 'react';
import {
  BadgeCheck,
  ChevronRight,
  HelpCircle,
  Key,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Shield,
  Smartphone,
  Sun,
  User
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { FEEDBACK_TYPES } from '../../contexts/FeedbackContext';
import { useFeedback } from '../../hooks/useFeedback';
import { MobilePageShell } from './MobilePageShell';
import { Hairline } from './canon/GroupedList';
import { useSkeletonWarmup } from './canon/Loading';
import { TapCard } from './canon/Tap';

const roleLabelFor = (role) => {
  if (!role) return 'Viewer';
  return role
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const displayNameFor = (profile) => (
  profile?.full_name
  || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  || profile?.username
  || 'Your account'
);

const SettingsSkeleton = () => (
  <div className="space-y-7" aria-hidden="true">
    <section className="px-4">
      <div className="surface-card rounded-card p-4">
        <div className="flex items-center gap-3">
          <span className="h-16 w-16 shrink-0 rounded-icon bg-muted/25 shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-5 w-3/5 rounded-pill bg-muted/25 shimmer" />
            <span className="block h-3 w-4/5 rounded-pill bg-muted/15 shimmer" />
            <span className="block h-6 w-24 rounded-pill bg-muted/20 shimmer" />
          </div>
        </div>
        <span className="mt-4 block h-9 w-full rounded-inner bg-muted/15 shimmer" />
      </div>
    </section>

    {[2, 1, 2].map((rows, sectionIndex) => (
      <section key={sectionIndex} className="px-4">
        <span className="mb-2 block h-3 w-20 rounded-pill bg-muted/20 shimmer" />
        <div className="rounded-inner bg-foreground/[0.06] px-3 py-1.5 dark:bg-white/[0.08]">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <React.Fragment key={rowIndex}>
              <div className="flex items-center gap-3 px-2 py-3">
                <span className="h-9 w-9 shrink-0 rounded-icon bg-muted/25 shimmer" />
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="block h-4 w-2/5 rounded-pill bg-muted/25 shimmer" />
                  <span className="block h-3 w-3/5 rounded-pill bg-muted/15 shimmer" />
                </div>
                <span className="h-4 w-4 shrink-0 rounded-icon bg-muted/20 shimmer" />
              </div>
              {rowIndex < rows - 1 && <Hairline inset={56} />}
            </React.Fragment>
          ))}
        </div>
      </section>
    ))}
  </div>
);

const Section = ({ label, children }) => (
  <section className="px-4">
    <h2 className="mb-2 px-1 text-[13px] font-bold leading-[17px] text-muted-foreground">
      {label}
    </h2>
    <div className="rounded-inner bg-foreground/[0.06] px-3 py-1.5 dark:bg-white/[0.08]">
      {children}
    </div>
  </section>
);

const ActionRow = ({
  icon: Icon,
  title,
  detail,
  onClick,
  toneClass = 'bg-muted/40 text-muted-foreground',
  pending = false,
  disabled = false,
  destructive = false
}) => (
  <TapCard
    onClick={pending || disabled ? undefined : onClick}
    disabled={pending || disabled}
    feedbackVariant={destructive ? FEEDBACK_TYPES.DESTRUCTIVE : FEEDBACK_TYPES.CLICK}
    feedbackColor={destructive ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))'}
    data-state={pending ? 'pending' : 'idle'}
    data-availability={disabled ? 'unavailable' : 'available'}
    aria-busy={pending}
    aria-disabled={disabled || undefined}
    className="flex min-h-[56px] w-full items-center gap-3 rounded-inner px-2 py-3 text-left transition-colors active:bg-foreground/[0.06] disabled:opacity-70 dark:active:bg-white/[0.08]"
  >
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass}`}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block text-[15px] font-medium leading-5 ${destructive ? 'text-destructive' : 'text-foreground'}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-xs leading-[17px] text-muted-foreground">
        {detail}
      </span>
    </span>
    {!pending && !disabled && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
  </TapCard>
);

const InfoRow = ({ icon: Icon, title, value, toneClass }) => (
  <div className="flex min-h-[56px] items-center gap-3 px-2 py-3">
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-icon ${toneClass}`}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-medium leading-5 text-foreground">{title}</span>
      <span className="mt-0.5 block truncate text-xs leading-[17px] text-muted-foreground">{value}</span>
    </span>
  </div>
);

export const MobileSettings = ({
  loading = false,
  profile,
  user,
  avatarUrl,
  avatarFallback,
  displayId,
  darkMode,
  onToggleDarkMode,
  onEditProfile,
  onOpenSecurity,
  onOpenSupport,
  onSignOut,
  isSigningOut = false,
  isProvider,
  hasDoctorProfile = false,
  doctorProfileLoading = false,
  onOpenDoctor
}) => {
  // grammar:hero=account-identity-card-is-the-settings-signal-hero
  const warmingUp = useSkeletonWarmup();
  const { triggerInfo } = useFeedback();
  const showSkeleton = warmingUp || loading || (!profile && !user);
  const accountEmail = user?.email || profile?.email || 'Email not available';
  const phone = profile?.phone || 'Not provided';
  const roleLabel = roleLabelFor(profile?.role);
  const displayName = displayNameFor(profile);

  const handleThemeChange = useCallback((checked) => {
    triggerInfo({
      color: 'hsl(var(--foreground))',
      haptic: true,
      sound: true
    });
    onToggleDarkMode?.(checked);
  }, [onToggleDarkMode, triggerInfo]);

  return (
    <MobilePageShell
      animatePageLoad={false}
      contentClassName="min-h-[calc(100dvh-3rem)] bg-background px-0 pb-32 pt-6 text-foreground"
    >
      {showSkeleton ? (
        <SettingsSkeleton />
      ) : (
        <div className="space-y-7">
          <section className="px-4">
            <div className="surface-card rounded-card p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 shrink-0 rounded-icon">
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback className="bg-muted text-xl font-bold text-muted-foreground">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-semibold leading-tight text-foreground">
                    {displayName}
                  </h1>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{accountEmail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className="rounded-pill bg-muted/40 text-[11px] font-semibold text-muted-foreground">
                      {roleLabel}
                    </Badge>
                    {profile?.bvn_verified && (
                      <Badge className="rounded-pill bg-emerald-500/10 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                        <BadgeCheck className="mr-1 h-3 w-3" />
                        Identity verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {displayId && (
                <div className="mt-4 rounded-inner bg-foreground/[0.04] px-3 py-2 font-mono text-[11px] text-muted-foreground dark:bg-white/[0.05]">
                  Account ID: {displayId}
                </div>
              )}
            </div>
          </section>

          <Section label="Account">
            <ActionRow
              icon={User}
              title="Edit profile"
              detail="Update your account details and photo"
              onClick={onEditProfile}
              toneClass="bg-sky-500/10 text-sky-700 dark:text-sky-200"
            />
            <Hairline inset={56} />
            <InfoRow
              icon={Mail}
              title="Email"
              value={accountEmail}
              toneClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
            />
            <Hairline inset={56} />
            <InfoRow
              icon={Smartphone}
              title="Phone"
              value={phone}
              toneClass="bg-amber-500/10 text-amber-700 dark:text-amber-200"
            />
          </Section>

          <Section label="Preferences">
            <div className="flex min-h-[56px] items-center gap-3 px-2 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-icon bg-violet-500/10 text-violet-700 dark:text-violet-200">
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium leading-5 text-foreground">Dark mode</span>
                <span className="mt-0.5 block text-xs leading-[17px] text-muted-foreground">
                  Applies on this device
                </span>
              </span>
              <Switch
                checked={darkMode}
                onCheckedChange={handleThemeChange}
                aria-label="Toggle dark mode"
              />
            </div>
          </Section>

          <Section label="Security and help">
            <ActionRow
              icon={Key}
              title="Password and authentication"
              detail="Review your account security options"
              onClick={onOpenSecurity}
              toneClass="bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
            />
            {isProvider && (
              <>
                <Hairline inset={56} />
                <ActionRow
                  icon={Shield}
                  title="Professional profile"
                  detail={doctorProfileLoading && !hasDoctorProfile
                    ? 'Checking provider details'
                    : hasDoctorProfile
                      ? 'View your provider details'
                      : 'No professional profile is available'}
                  onClick={hasDoctorProfile ? onOpenDoctor : undefined}
                  pending={doctorProfileLoading && !hasDoctorProfile}
                  disabled={!doctorProfileLoading && !hasDoctorProfile}
                  toneClass="bg-violet-500/10 text-violet-700 dark:text-violet-200"
                />
              </>
            )}
            <Hairline inset={56} />
            <ActionRow
              icon={HelpCircle}
              title="Support"
              detail="Open the support workspace"
              onClick={onOpenSupport}
              toneClass="bg-cyan-500/10 text-cyan-700 dark:text-cyan-200"
            />
          </Section>

          <Section label="Session">
            <ActionRow
              icon={LogOut}
              title={isSigningOut ? 'Signing out' : 'Sign out'}
              detail={isSigningOut ? 'Ending this session' : 'End this Console session'}
              onClick={onSignOut}
              pending={isSigningOut}
              destructive
              toneClass="bg-destructive/10 text-destructive"
            />
          </Section>
        </div>
      )}
    </MobilePageShell>
  );
};
