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
  isProvider,
  onOpenDoctor
}) => {
  const roleLabel = profile?.role?.replace('_', ' ').toUpperCase() || 'VIEWER';

  return (
    <MobilePageShell contentClassName="px-2 pt-4 pb-4 text-foreground">
      <section className="mb-3 px-1">
        <div className="apple-glass-heavy rounded-3xl p-4 border-0">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-16 w-16 rounded-2xl border border-white/10">
              <AvatarImage src={avatarUrl} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xl">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight truncate">{profile?.username || 'User Profile'}</h2>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email || profile?.email || 'No email'}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge className="bg-primary/20 text-primary border-0 text-[9px] uppercase">{roleLabel}</Badge>
                {profile?.bvn_verified && (
                  <Badge className="bg-success/20 text-success border-0 text-[9px] uppercase">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {displayId && (
            <div className="text-[10px] font-mono text-muted-foreground/80 bg-white/[0.03] rounded-xl px-3 py-2">
              ID: {displayId}
            </div>
          )}
        </div>
      </section>

      <MobileSectionHeader label="Account" color="hsl(var(--primary))" />
      <div className="space-y-1">
        <MobileMetricRow
          icon={User}
          label="PROFILE"
          value="Edit Profile"
          onClick={onEditProfile}
          color="hsl(var(--primary))"
          rightBlade={{ badge: 'OPEN', direction: 'flat', label: 'Action', value: 'Profile', color: 'hsl(var(--primary))' }}
        />
        <MobileMetricRow
          icon={Mail}
          label="EMAIL"
          value={user?.email || profile?.email || 'No email'}
          color="hsl(var(--info))"
          rightBlade={{ badge: 'BOUND', direction: 'flat', label: 'Status', value: 'Active', color: 'hsl(var(--info))' }}
        />
        <MobileMetricRow
          icon={Smartphone}
          label="PHONE"
          value={profile?.phone || 'Not linked'}
          color="hsl(var(--warning))"
          rightBlade={{ badge: profile?.phone ? 'VERIFIED' : 'MISSING', direction: profile?.phone ? 'up' : 'down', label: 'Contact', value: profile?.phone ? 'Ready' : 'Required', color: profile?.phone ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}
        />
      </div>

      <MobileSectionHeader label="Preferences" color="hsl(var(--secondary))" />
      <div className="apple-glass-heavy rounded-2xl p-3 flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">Theme</p>
          <p className="text-sm font-semibold">Dark Mode</p>
        </div>
        <Switch checked={darkMode} onCheckedChange={onToggleDarkMode} aria-label="Toggle dark mode" />
      </div>

      <MobileSectionHeader label="Security" color="hsl(var(--info))" />
      <div className="space-y-1">
        <MobileMetricRow
          icon={Key}
          label="ACCESS"
          value="Change Password"
          onClick={onOpenSecurity}
          color="hsl(var(--info))"
          rightBlade={{ badge: 'OPEN', direction: 'flat', label: 'Action', value: 'Security', color: 'hsl(var(--info))' }}
        />
        <MobileMetricRow
          icon={HelpCircle}
          label="SUPPORT"
          value="Help Center"
          onClick={onOpenSupport}
          color="hsl(var(--secondary))"
          rightBlade={{ badge: 'OPEN', direction: 'flat', label: 'Action', value: 'Support', color: 'hsl(var(--secondary))' }}
        />
        {isProvider && (
          <MobileMetricRow
            icon={Shield}
            label="DOCTOR"
            value="Professional Profile"
            onClick={onOpenDoctor}
            color="hsl(var(--spark))"
            rightBlade={{ badge: 'VIEW', direction: 'flat', label: 'Action', value: 'Profile', color: 'hsl(var(--spark))' }}
          />
        )}
        <MobileMetricRow
          icon={LogOut}
          label="SESSION"
          value="Sign Out"
          onClick={onSignOut}
          color="hsl(var(--destructive))"
          rightBlade={{ badge: 'EXIT', direction: 'down', label: 'Action', value: 'Logout', color: 'hsl(var(--destructive))' }}
        />
      </div>
    </MobilePageShell>
  );
};
