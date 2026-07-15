export const getInitials = (value = 'Record') => {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  return `${words[0]?.[0] || 'R'}${words[1]?.[0] || ''}`.toUpperCase();
};

export const formatTabletDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const titleCase = (value, fallback = '') => {
  const text = String(value || fallback).replace(/_/g, ' ').trim();
  return text.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const formatMoney = (value, currency = 'USD') => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};
