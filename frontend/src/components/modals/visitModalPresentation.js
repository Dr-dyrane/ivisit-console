const TERMINAL_VISIT_STATUSES = new Set(['completed', 'cancelled', 'no-show']);

export const isTerminalVisitStatus = (status) => (
  TERMINAL_VISIT_STATUSES.has(String(status || '').toLowerCase())
);

export const formatVisitLabel = (value, fallback = 'Not set') => {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return text.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
};
