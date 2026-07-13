export function normalizeInsuranceBillingStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return ['pending', 'approved', 'paid', 'rejected'].includes(status) ? status : '';
}

function toCurrencyNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeInsuranceBillingOutcome(record) {
  if (!record) return record;

  return {
    ...record,
    status: normalizeInsuranceBillingStatus(record.status) || 'pending',
    claim_number: record.claim_number || '',
    total_amount: toCurrencyNumber(record.total_amount),
    insurance_amount: toCurrencyNumber(record.insurance_amount),
    user_amount: toCurrencyNumber(record.user_amount),
    coverage_percentage:
      record.coverage_percentage === null || record.coverage_percentage === undefined
        ? null
        : Number(record.coverage_percentage),
    billing_date: record.billing_date || '',
    paid_date: record.paid_date || '',
  };
}
