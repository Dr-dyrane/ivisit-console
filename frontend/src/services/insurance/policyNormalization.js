function parseCoverageDetails(value) {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return { ...value };
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function parseLinkedPaymentSnapshot(value) {
  if (!value) return null;
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

const normalizeInsurancePolicyStatus = (value) => (
  String(value || '').trim().toLowerCase() || 'unknown'
);

export function normalizeInsurancePolicy(record) {
  if (!record) return record;
  const details = parseCoverageDetails(record.coverage_details);
  const linkedPaymentSnapshot =
    parseLinkedPaymentSnapshot(details.linked_payment_method_snapshot) ||
    parseLinkedPaymentSnapshot(record.linked_payment_method);

  return {
    ...record,
    status: normalizeInsurancePolicyStatus(record.status),
    coverage_type: record.plan_type || details.coverage_type || '',
    policy_type: record.plan_type || details.coverage_type || '',
    start_date: record.starts_at || '',
    end_date: record.expires_at || '',
    policy_holder_name: details.policy_holder_name || '',
    group_number: details.group_number || '',
    front_image_url: details.front_image_url || '',
    back_image_url: details.back_image_url || '',
    linked_payment_method: linkedPaymentSnapshot || record.linked_payment_method || null,
    coverage_amount: details.coverage_amount ?? record.coverage_amount ?? null,
    coverage_percentage:
      record.coverage_percentage !== null && record.coverage_percentage !== undefined
        ? Number(record.coverage_percentage)
        : null,
  };
}
