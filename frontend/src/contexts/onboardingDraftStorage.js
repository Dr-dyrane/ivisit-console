export const ONBOARDING_STORAGE_KEY = 'ivisit_onboarding_data_v2';
export const ONBOARDING_STEP_KEY = 'ivisit_onboarding_step_v2';

export const clearOnboardingDraftStorage = (storage = globalThis.sessionStorage) => {
  try {
    storage?.removeItem(ONBOARDING_STORAGE_KEY);
    storage?.removeItem(ONBOARDING_STEP_KEY);
  } catch {
    // Authentication state still clears when browser storage is unavailable.
  }
};
