export const resolveAnalyticsSource = async (request) => {
  try {
    return await request;
  } catch (error) {
    return { data: null, count: 0, error };
  }
};

export const getAnalyticsSourceErrorKind = (error) => {
  const status = String(error?.status || error?.code || '');
  const message = String(error?.message || error?.details || error || '');
  const sourceText = `${status} ${message}`;

  return /42501|401|403|permission|policy|rls|not authorized|forbidden|jwt/i.test(sourceText)
    ? 'denied'
    : 'failed';
};

export const getAnalyticsSourceIssue = (source, result) => {
  if (!result?.error) return null;

  return {
    source,
    kind: getAnalyticsSourceErrorKind(result.error),
  };
};

export const toExactCount = (value) => (
  value !== null && value !== undefined && Number.isFinite(Number(value))
    ? Number(value)
    : null
);
