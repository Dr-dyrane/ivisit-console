import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Mail, Send, Shield, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getOrganizationOptions } from '../../services/organizationsService';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import ModalShell from '../ui/ModalShell';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const PROVIDER_TYPES = [
  { value: 'doctor', label: 'Doctor' },
  { value: 'driver', label: 'Driver' },
  { value: 'paramedic', label: 'Paramedic' },
  { value: 'ambulance_service', label: 'Ambulance service' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'clinic', label: 'Clinic' },
];

const readFunctionError = async (error) => {
  try {
    const body = await error?.context?.clone?.().json();
    if (body?.error) return body.error;
  } catch {
    // The public message below remains honest without exposing receiver detail.
  }
  return 'The invitation could not be sent. Try again.';
};

export const InviteUserModal = ({ isOpen, onClose, onInvited }) => {
  const { isAdmin, isOrgAdmin, orgId } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer');
  const [providerType, setProviderType] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const platformAdmin = isAdmin();
  const organizationAdmin = isOrgAdmin();
  const resolvedOrganizationId = organizationAdmin ? orgId : organizationId;
  const roleOptions = useMemo(() => (
    platformAdmin
      ? [
          { value: 'viewer', label: 'Viewer' },
          { value: 'provider', label: 'Provider' },
          { value: 'dispatcher', label: 'Dispatcher' },
          { value: 'org_admin', label: 'Organization admin' },
          { value: 'sponsor', label: 'Sponsor' },
        ]
      : [
          { value: 'viewer', label: 'Viewer' },
          { value: 'provider', label: 'Provider' },
          { value: 'dispatcher', label: 'Dispatcher' },
        ]
  ), [platformAdmin]);

  useEffect(() => {
    if (!isOpen) return;
    setEmail('');
    setRole('viewer');
    setProviderType('');
    setOrganizationId('');
    setFormError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !platformAdmin) return undefined;
    let active = true;
    setLoadingOrganizations(true);
    getOrganizationOptions({ limit: 200 })
      .then((items) => {
        if (active) setOrganizations(items);
      })
      .catch((error) => {
        if (active) {
          setOrganizations([]);
          setFormError(error.message || 'Organizations are unavailable right now.');
        }
      })
      .finally(() => {
        if (active) setLoadingOrganizations(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, platformAdmin]);

  const handleInvite = async (event) => {
    event.preventDefault();
    if (loading) return;
    setFormError('');

    if (!resolvedOrganizationId) {
      setFormError('Choose an organization.');
      return;
    }
    if (role === 'provider' && !providerType) {
      setFormError('Choose a provider type.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: email.trim().toLowerCase(),
          role,
          provider_type: role === 'provider' ? providerType : null,
          organization_id: resolvedOrganizationId,
        },
      });

      if (error) throw new Error(await readFunctionError(error));
      if (
        data?.success !== true
        || data?.delivery?.emailQueued !== true
        || data?.delivery?.roleGranted !== true
        || data?.delivery?.organizationLinked !== true
      ) {
        throw new Error(data?.error || 'The invitation could not be verified.');
      }

      toast.success('Invitation sent');
      await onInvited?.();
      onClose();
    } catch (error) {
      setFormError(error.message || 'The invitation could not be sent. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldShellClass = 'relative group';
  const fieldIconClass = 'absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground';
  const fieldControlClass = 'h-11 rounded-button bg-muted/30 pl-10';

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title="Invite user"
      subtitle="Send secure organization access"
      icon={<Send className="h-5 w-5 text-muted-foreground" />}
    >
      <div className="p-4 md:p-6">
        <form onSubmit={handleInvite} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-xs font-semibold text-muted-foreground">Email address</Label>
            <div className={fieldShellClass}>
              <Mail className={fieldIconClass} aria-hidden="true" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="colleague@organization.com"
                className={fieldControlClass}
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Access role</Label>
            <div className={fieldShellClass}>
              <Shield className={fieldIconClass} aria-hidden="true" />
              <Select value={role} onValueChange={(value) => { setRole(value); if (value !== 'provider') setProviderType(''); }} disabled={loading}>
                <SelectTrigger className={fieldControlClass}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-inner bg-background/95">
                  {roleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {role === 'provider' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Provider type</Label>
              <div className={fieldShellClass}>
                <Stethoscope className={fieldIconClass} aria-hidden="true" />
                <Select value={providerType} onValueChange={setProviderType} disabled={loading}>
                  <SelectTrigger className={fieldControlClass}>
                    <SelectValue placeholder="Select provider type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner bg-background/95">
                    {PROVIDER_TYPES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {platformAdmin && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Organization</Label>
              <div className={fieldShellClass}>
                {loadingOrganizations ? <Loader2 className={`${fieldIconClass} animate-spin`} aria-hidden="true" /> : <Building2 className={fieldIconClass} aria-hidden="true" />}
                <Select value={organizationId} onValueChange={setOrganizationId} disabled={loading || loadingOrganizations || organizations.length === 0}>
                  <SelectTrigger className={fieldControlClass}>
                    <SelectValue placeholder={loadingOrganizations ? 'Loading organizations' : 'Select organization'} />
                  </SelectTrigger>
                  <SelectContent className="rounded-inner bg-background/95">
                    {organizations.map((organization) => <SelectItem key={organization.id} value={organization.id}>{organization.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formError && <p role="alert" className="rounded-inner bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>}

          <Button
            type="submit"
            disabled={loading || loadingOrganizations}
            aria-busy={loading}
            data-state={loading ? 'pending' : 'ready'}
            className="h-12 w-full rounded-button bg-foreground text-sm font-semibold text-background shadow-e2 hover:bg-foreground/90"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending</> : <><Send className="h-4 w-4" /> Send invitation</>}
          </Button>
        </form>
      </div>
    </ModalShell>
  );
};
