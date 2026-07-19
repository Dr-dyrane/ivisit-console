const DEMO_EMAIL_SUFFIX = '@ivisit-demo.local';
const COVERAGE_ORGANIZATION_PREFIX = 'ivisit coverage network';

const normalize = (value) => String(value ?? '').trim().toLowerCase();

/**
 * Classifies the existing server-owned demo organization contract without
 * adding a parallel database field. Both markers are written by the canonical
 * demo bootstrap and are intentionally stricter than a loose "demo" name scan.
 */
export const isDemoOrganization = (organization) => {
  const email = normalize(organization?.contact_email || organization?.email);
  const name = normalize(organization?.name);

  return email.endsWith(DEMO_EMAIL_SUFFIX)
    || name.startsWith(COVERAGE_ORGANIZATION_PREFIX);
};

export const getOrganizationDataClass = (organization) => (
  isDemoOrganization(organization) ? 'simulated' : 'operational'
);
