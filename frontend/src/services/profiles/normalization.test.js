import {
  buildProfileCreatePayload,
  buildProfileUpdatePayload,
  normalizeAuthProfile,
  toAdminProfilePayload,
} from './normalization';

describe('profile normalization', () => {
  it('normalizes auth-prefixed identity fields without changing fallback semantics', () => {
    expect(
      normalizeAuthProfile({
        id: 'profile-1',
        role: 'viewer',
        profile_role: 'provider',
        profile_username: 'doctor-one',
        profile_organization_id: 'org-1',
        profile_bvn_verified: true,
        profile_display_id: 'USR-1',
      })
    ).toEqual(
      expect.objectContaining({
        id: 'profile-1',
        role: 'provider',
        username: 'doctor-one',
        organization_id: 'org-1',
        bvn_verified: true,
        display_id: 'USR-1',
        organization_name: 'Independent',
      })
    );
  });

  it('preserves create defaults, UUID nullability, and avatar aliasing', () => {
    const payload = buildProfileCreatePayload({
      id: 'profile-1',
      email: '  USER@example.com ',
      phone: '   ',
      avatar_url: 'https://cdn.test/avatar.png',
      organization_id: '',
    });

    expect(payload).toEqual(
      expect.objectContaining({
        id: 'profile-1',
        email: 'USER@example.com',
        phone: null,
        image_uri: 'https://cdn.test/avatar.png',
        role: 'patient',
        organization_id: null,
        provider_type: null,
        bvn_verified: false,
      })
    );
    expect(payload.created_at).toEqual(expect.any(String));
    expect(payload.updated_at).toEqual(expect.any(String));
  });

  it('normalizes optional clears and preserves provider-role consistency', () => {
    expect(
      buildProfileUpdatePayload({
        username: '   ',
        organization_id: '',
        role: 'viewer',
        provider_type: 'doctor',
      })
    ).toEqual({
      username: null,
      organization_id: null,
      role: 'viewer',
      provider_type: null,
    });

    expect(buildProfileUpdatePayload({ provider_type: ' doctor ' })).toEqual({
      provider_type: 'doctor',
      role: 'provider',
    });
  });

  it('encodes only the admin receiver clear sentinels as empty strings', () => {
    expect(
      toAdminProfilePayload({
        username: null,
        provider_type: null,
        organization_id: null,
        bvn_verified: false,
      })
    ).toEqual({
      username: '',
      provider_type: '',
      organization_id: null,
      bvn_verified: false,
    });
  });
});
