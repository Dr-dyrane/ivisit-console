import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

let mockRoleFlags = {};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: () => Boolean(mockRoleFlags.admin),
    isDispatcher: () => Boolean(mockRoleFlags.dispatcher),
    isOrgAdmin: () => Boolean(mockRoleFlags.orgAdmin),
    isProvider: () => Boolean(mockRoleFlags.provider),
    isPatient: () => Boolean(mockRoleFlags.patient),
    isViewer: () => Boolean(mockRoleFlags.viewer),
    isSponsor: () => Boolean(mockRoleFlags.sponsor),
  }),
}));

jest.mock('./TodayHome', () => ({
  TodayHome: ({ role }) => <div data-surface="today" data-role={role} />,
}));

jest.mock('./bento/LegacyBentoHome', () => ({
  LegacyBentoHome: () => <div data-surface="legacy-bento" />,
}));

import { BentoHome } from './BentoHome';

const renderHome = (flags) => {
  mockRoleFlags = flags;
  return renderToStaticMarkup(<BentoHome />);
};

describe('BentoHome composition contract', () => {
  afterEach(() => {
    mockRoleFlags = {};
  });

  it.each([
    ['admin', { admin: true }, 'admin'],
    ['organization admin', { orgAdmin: true }, 'org_admin'],
    ['dispatcher', { dispatcher: true }, 'dispatcher'],
    ['provider', { provider: true }, 'provider'],
    ['sponsor', { sponsor: true }, 'sponsor'],
    ['viewer', { viewer: true }, 'viewer'],
  ])('mounts canonical Today for %s', (_label, flags, role) => {
    const html = renderHome(flags);

    expect(html).toContain('data-surface="today"');
    expect(html).toContain(`data-role="${role}"`);
    expect(html).not.toContain('legacy-bento');
  });

  it('keeps the legacy surface only for patient and unmatched fallback identities', () => {
    expect(renderHome({ patient: true })).toContain('data-surface="legacy-bento"');
    expect(renderHome({})).toContain('data-surface="legacy-bento"');
  });

  it('preserves admin precedence for overlapping legacy role predicates', () => {
    const html = renderHome({ admin: true, orgAdmin: true, provider: true });

    expect(html).toContain('data-role="admin"');
    expect(html).not.toContain('legacy-bento');
  });
});
