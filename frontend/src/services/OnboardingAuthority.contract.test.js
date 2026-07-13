import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('Console onboarding and invitation authority', () => {
  const automations = read('supabase/migrations/20260219000900_automations.sql');
  const security = read('supabase/migrations/20260219000700_security.sql');
  const rpcs = read('supabase/migrations/20260219010000_core_rpcs.sql');
  const organization = read('supabase/migrations/20260219000200_org_structure.sql');
  const checkUser = read('supabase/functions/check-user/index.ts');
  const inviteUser = read('supabase/functions/invite-user/index.ts');
  const onboarding = read('src/services/onboardingService.js');
  const types = read('src/types/database.ts');

  it('keeps public signup metadata unable to grant Console authority', () => {
    expect(automations).toContain('CREATE OR REPLACE FUNCTION public.handle_new_user()');
    expect(automations).toContain("'patient',");
    expect(automations).toContain("'pending'");
    expect(automations).not.toContain("NEW.raw_user_meta_data->>'role'");
    expect(security).toContain('REVOKE INSERT, DELETE ON TABLE public.profiles FROM anon, authenticated;');
    expect(security).toContain('REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;');
    expect(security).toContain('GRANT UPDATE (');
    expect(security).not.toMatch(/GRANT UPDATE \([^)]*role/s);
  });

  it('owns organization, wallet, evidence, and profile scope in one provisioning RPC', () => {
    expect(organization).toContain('CREATE TABLE IF NOT EXISTS public.organization_verification_documents');
    expect(organization).toContain('REFERENCES public.organizations(id) ON DELETE SET NULL');
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.get_console_identity_projection()');
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.search_onboarding_facilities(p_query TEXT)');
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.provision_console_organization(p_payload JSONB)');
    expect(rpcs).toContain('INSERT INTO public.organization_verification_documents');
    expect(rpcs).toContain('GRANT EXECUTE ON FUNCTION public.provision_console_organization(JSONB) TO authenticated, service_role;');
    expect(security).toContain('Users upload own onboarding evidence');
    expect(security).toContain("(storage.foldername(name))[1] = 'onboarding'");
    expect(onboarding).toContain("supabase.rpc('provision_console_organization'");
    expect(onboarding).not.toContain(".from('hospitals')");
  });

  it('keeps invitation role assignment service-only and scope-checked', () => {
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.complete_console_user_invitation(');
    expect(rpcs).toContain('REVOKE ALL ON FUNCTION public.complete_console_user_invitation(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;');
    expect(rpcs).toContain('GRANT EXECUTE ON FUNCTION public.complete_console_user_invitation(UUID, UUID, UUID, TEXT, TEXT) TO service_role;');
    expect(inviteUser).toContain("admin.auth.admin.inviteUserByEmail(email");
    expect(inviteUser).toContain("data: { invited_by: userData.user.id }");
    expect(inviteUser).toContain("admin.rpc('complete_console_user_invitation'");
    expect(inviteUser).toContain("!['admin', 'org_admin'].includes(actor.role)");
    expect(inviteUser).toContain("actor.role === 'org_admin'");
    expect(inviteUser).not.toContain('generateLink');
    expect(inviteUser).not.toMatch(/data:\s*\{[^}]*role/s);
  });

  it('retires account discovery and keeps generated types aligned', () => {
    expect(checkUser).toContain("status: 410");
    expect(checkUser).toContain('Account discovery is no longer available.');
    expect(checkUser).not.toContain('auth.admin');
    expect(types).toContain('organization_verification_documents: {');
    expect(types).toContain('complete_console_user_invitation: {');
    expect(types).toContain('get_console_identity_projection: { Args: never; Returns: Json }');
    expect(types).toContain('provision_console_organization: {');
    expect(types).toContain('search_onboarding_facilities: {');
  });

  it('projects complete facility scope and keeps organization statistics tenant-bound', () => {
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.get_console_identity_projection()');
    expect(rpcs).toContain("'facilityIds'");
    expect(rpcs).toContain('array_agg(');
    expect(rpcs).toContain('CREATE OR REPLACE FUNCTION public.get_user_statistics()');
    expect(rpcs).toContain("RAISE EXCEPTION 'USER_STATISTICS_SCOPE_DENIED'");
    expect(rpcs).toContain('profile.organization_id = v_actor_org_id');
    expect(rpcs).toContain('REVOKE ALL ON FUNCTION public.get_user_statistics() FROM PUBLIC, anon;');
    expect(rpcs).toContain('GRANT EXECUTE ON FUNCTION public.get_user_statistics() TO authenticated, service_role;');
  });
});
