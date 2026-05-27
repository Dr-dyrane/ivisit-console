import { canonicalizeEmergencyStatus } from './emergencyStatus';

const CASH_METHODS = new Set(['cash', 'cash_payment']);

const toCleanString = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const pickFirstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    return value;
  }
  return null;
};

export const normalizePaymentMethod = (value) => {
  const normalized = toCleanString(value).toLowerCase();
  return normalized || null;
};

export const isCashPaymentMethod = (value) => CASH_METHODS.has(normalizePaymentMethod(value));

export const formatEmergencyServiceToken = (value, fallback = 'Standard') => {
  if (!value) return fallback;

  if (typeof value === 'object') {
    return value.title || value.name || value.type || fallback;
  }

  if (typeof value !== 'string') return fallback;

  const trimmedValue = value.trim();
  if (!trimmedValue) return fallback;

  if (trimmedValue.startsWith('{') || trimmedValue.startsWith('[')) {
    try {
      const parsedValue = JSON.parse(trimmedValue);
      return parsedValue?.title || parsedValue?.name || parsedValue?.type || trimmedValue;
    } catch {
      return trimmedValue;
    }
  }

  return trimmedValue
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const buildLatestPaymentMap = (paymentRows = []) => {
  const paymentByRequestId = new Map();
  for (const payment of paymentRows) {
    const requestId = payment?.emergency_request_id;
    if (!requestId || paymentByRequestId.has(requestId)) {
      continue;
    }
    paymentByRequestId.set(requestId, payment);
  }
  return paymentByRequestId;
};

export const normalizeEmergencyRequestRow = (row, paymentRecord = null) => {
  const paymentMethod = normalizePaymentMethod(
    pickFirstNonEmpty(row?.payment_method, row?.payment_method_id, paymentRecord?.payment_method)
  );
  const paymentStatus = pickFirstNonEmpty(row?.payment_status, paymentRecord?.status);
  const etaDisplay = pickFirstNonEmpty(
    row?.eta_display,
    row?.next_estimated_arrival,
    row?.estimated_arrival
  );
  const bedCategory = pickFirstNonEmpty(row?.bed_category, row?.bed_type);

  return {
    ...row,
    status: canonicalizeEmergencyStatus(row?.status, row?.status),
    payment_method: paymentMethod,
    payment_method_id: row?.payment_method_id ?? paymentMethod,
    payment_status: paymentStatus ?? null,
    eta_display: etaDisplay ?? null,
    bed_category: bedCategory ?? null,
    bed_type: row?.bed_type ?? bedCategory ?? null,
  };
};
