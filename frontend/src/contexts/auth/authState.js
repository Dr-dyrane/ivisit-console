export const ASSURANCE_STATUS = Object.freeze({
  CHECKING: 'checking',
  SATISFIED: 'satisfied',
  MFA_REQUIRED: 'mfa_required',
  ERROR: 'error',
  SIGNED_OUT: 'signed_out',
});

const AUTH_OPERATION_TIMEOUT_MS = 10000;

export const createAssuranceState = (
  status = ASSURANCE_STATUS.CHECKING,
  overrides = {},
) => ({
  status,
  currentLevel: null,
  nextLevel: null,
  checkedUserId: null,
  error: null,
  ...overrides,
});

export const createMfaChallengeState = (overrides = {}) => ({
  status: 'idle',
  userId: null,
  factorId: null,
  challengeId: null,
  error: null,
  ...overrides,
});

export const classifyAssuranceLevel = (assurance) => {
  const currentLevel = assurance?.currentLevel;
  const nextLevel = assurance?.nextLevel;
  const knownLevels = ['aal1', 'aal2'];

  if (!knownLevels.includes(currentLevel) || !knownLevels.includes(nextLevel)) {
    return ASSURANCE_STATUS.ERROR;
  }

  if (currentLevel === 'aal1' && nextLevel === 'aal2') {
    return ASSURANCE_STATUS.MFA_REQUIRED;
  }

  if (currentLevel === nextLevel) {
    return ASSURANCE_STATUS.SATISFIED;
  }

  return ASSURANCE_STATUS.ERROR;
};

export const withAuthTimeout = (operation) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error('Auth operation timed out')),
      AUTH_OPERATION_TIMEOUT_MS,
    );
  });

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timeoutId));
};
