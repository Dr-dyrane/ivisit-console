import React from 'react';
import {
  User,
  Mail,
  Smartphone,
  Shield,
  HelpCircle,
  Key,
  LogOut,
  BadgeCheck
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { MobilePageShell } from './MobilePageShell';
import { MobileSectionHeader, MobileMetricRow } from './MobileMetricList';

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
  onOpenDoctor
}) => {
  const roleLabel = profile?.role
    ? profile.role
      .replace('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Viewer';
  const signOutBlade = isSigningOut
    ? { badge: 'Wait', direction: 'flat', label: 'Status', value: 'Signing out', color: 'hsl(var(--destructive))' }
    : { badge: 'Exit', direction: 'down', label: 'Action', value: 'Sign out', color: 'hsl(var(--destructive))' };

  return (
    <MobilePageShell contentClassName="pt-4 pb-4 text-foreground">
      <section className="mb-3 px-1">
        {loading ? (
          <div className="surface-card rounded-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-16 w-16 rounded-icon bg-muted/20 shimmer" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-5 w-32 rounded-pill bg-muted/20 shimmer" />
                <div className="h-3 w-44 rounded-pill bg-muted/15 shimmer" />
                <div className="h-5 w-24 rounded-pill bg-muted/15 shimmer" />
              </div>
            </div>
            <div className="h-8 w-full rounded-inner bg-muted/15 shimmer" />
          </div>
        ) : (
        <div className="surface-card rounded-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-16 w-16 rounded-icon">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xl">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-black">{profile?.username || 'User Profile'}</h2>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email || profile?.email || 'No email'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="rounded-pill bg-muted/40 text-muted-foreground text-[11px] font-semibold">{roleLabel}</Badge>
                {profile?.bvn_verified && (
                  <Badge className="rounded-pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-200 text-[11px] font-semibold">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {displayId && (
            <div className="surface-card rounded-pill px-3 py-2 font-mono text-[11px] text-muted-foreground/80">
              ID: {displayId}
            </div>
          )}
        </div>
        )}
      </section>

      {/* Non-danger rows use literal palette/neutral hues — the semantic --primary/--info/
          --warning/--success/--secondary tokens all collapse to crimson (red-token trap). */}
      <MobileSectionHeader label="Account" color="hsl(var(--foreground))" labelTone="plain" />
      <div className="space-y-1">
        <MobileMetricRow
          icon={User}
          label="Profile"
          value="Edit Profile"
          onClick={onEditProfile}
          color="hsl(var(--foreground))"
          rightBlade={{ badge: 'Open', direction: 'flat', label: 'Action', value: 'Profile', color: 'hsl(var(--foreground))' }}
        />
        <MobileMetricRow
          icon={Mail}
          label="Email"
          value={user?.email || profile?.email || 'No email'}
          color="hsl(199 89% 48%)"
          rightBlade={{ badge: 'Bound', direction: 'flat', label: 'Status', value: 'Active', color: 'hsl(199 89% 48%)' }}
        />
        <MobileMetricRow
          icon={Smartphone}
          label="Phone"
          value={profile?.phone || 'Not linked'}
          color="hsl(38 92% 50%)"
          rightBlade={{ badge: profile?.phone ? 'Verified' : 'Missing', direction: profile?.phone ? 'up' : 'down', label: 'Contact', value: profile?.phone ? 'Ready' : 'Required', color: profile?.phone ? 'hsl(160 84% 39%)' : 'hsl(38 92% 50%)' }}
        />
      </div>

      <MobileSectionHeader label="Preferences" color="hsl(var(--foreground))" labelTone="plain" />
      <div className="surface-card mb-2 flex items-center justify-between rounded-inner p-3">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-muted-foreground/70">Theme</p>
          <p className="text-sm font-semibold">Dark Mode</p>
        </div>
        <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} aria-label="Toggle dark mode" />
      </div>

      <MobileSectionHeader label="Security" color="hsl(199 89% 48%)" labelTone="plain" />
      <div className="space-y-1">
        <MobileMetricRow
          icon={Key}
          label="Access"
          value="Change Password"
          onClick={onOpenSecurity}
          color="hsl(199 89% 48%)"
          rightBlade={{ badge: 'Open', direction: 'flat', label: 'Action', value: 'Security', color: 'hsl(199 89% 48%)' }}
        />
        <MobileMetricRow
          icon={HelpCircle}
          label="Support"
          value="Help Center"
          onClick={onOpenSupport}
          color="hsl(var(--foreground))"
          rightBlade={{ badge: 'Open', direction: 'flat', label: 'Action', value: 'Support', color: 'hsl(var(--foreground))' }}
        />
        {isProvider && (
          <MobileMetricRow
            icon={Shield}
            label="Doctor"
            value="Professional Profile"
            onClick={onOpenDoctor}
            color="hsl(var(--spark))"
            rightBlade={{ badge: 'View', direction: 'flat', label: 'Action', value: 'Profile', color: 'hsl(var(--spark))' }}
          />
        )}
        <MobileMetricRow
          icon={LogOut}
          label="Session"
          value={isSigningOut ? 'Signing out...' : 'Sign Out'}
          onClick={isSigningOut ? undefined : onSignOut}
          color="hsl(var(--destructive))"
          rightBlade={signOutBlade}
        />
      </div>
    </MobilePageShell>
  );
};
