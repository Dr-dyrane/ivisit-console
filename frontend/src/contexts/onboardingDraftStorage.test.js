import {
  clearOnboardingDraftStorage,
  ONBOARDING_STEP_KEY,
  ONBOARDING_STORAGE_KEY,
} from './onboardingDraftStorage';

describe('onboarding draft storage', () => {
  it('clears both account-scoped onboarding keys on sign-out', () => {
    const storage = {
      removeItem: jest.fn(),
    };

    clearOnboardingDraftStorage(storage);

    expect(storage.removeItem).toHaveBeenNthCalledWith(1, ONBOARDING_STORAGE_KEY);
    expect(storage.removeItem).toHaveBeenNthCalledWith(2, ONBOARDING_STEP_KEY);
  });
});
