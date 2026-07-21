import { resolveStoredOnboardingDraft } from './OnboardingContext';

describe('onboarding draft ownership', () => {
  const currentUser = {
    id: 'current-user',
    email: 'current@example.com',
  };

  it('restores a draft only for the same authenticated account', () => {
    const stored = JSON.stringify({
      ownerId: currentUser.id,
      data: {
        adminEmail: currentUser.email,
        contactEmail: 'operations@example.com',
        organizationName: 'Current Organization',
      },
    });

    expect(resolveStoredOnboardingDraft(stored, currentUser)).toMatchObject({
      adminEmail: currentUser.email,
      contactEmail: 'operations@example.com',
      organizationName: 'Current Organization',
    });
  });

  it('resets another account draft and seeds only the current identity', () => {
    const stored = JSON.stringify({
      ownerId: 'previous-user',
      data: {
        adminEmail: 'previous@example.com',
        contactEmail: 'previous@example.com',
        organizationName: 'Previous Organization',
        existingFacilityId: 'previous-facility',
      },
    });

    expect(resolveStoredOnboardingDraft(stored, currentUser)).toMatchObject({
      adminEmail: currentUser.email,
      contactEmail: currentUser.email,
      organizationName: '',
      existingFacilityId: null,
    });
  });

  it('does not expose an authenticated draft after sign-out', () => {
    const stored = JSON.stringify({
      ownerId: 'previous-user',
      data: {
        adminEmail: 'previous@example.com',
        contactEmail: 'previous@example.com',
        organizationName: 'Previous Organization',
      },
    });

    expect(resolveStoredOnboardingDraft(stored, null)).toMatchObject({
      adminEmail: '',
      contactEmail: '',
      organizationName: '',
    });
  });

  it('discards legacy unowned drafts instead of assigning them to another account', () => {
    const stored = JSON.stringify({
      adminEmail: 'previous@example.com',
      contactEmail: 'previous@example.com',
      organizationName: 'Legacy Organization',
    });

    expect(resolveStoredOnboardingDraft(stored, currentUser)).toMatchObject({
      adminEmail: currentUser.email,
      contactEmail: currentUser.email,
      organizationName: '',
    });
  });
});
