import fs from 'fs';
import path from 'path';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MobileVisitRow } from '../../mobile/visits/MobileVisitRows';
import { TabletVisits } from '../../tablet/TabletVisits';
import { getVisitCareTeamDisplay } from '../../../utils/visitRowProjection';
import { VisitsDetailRail } from './VisitsDesktopWorkspace';

jest.mock('../../mobile/canon/GroupedList', () => {
  const ReactRuntime = require('react');
  return {
    MobileListRow: ({ title, meta }) => ReactRuntime.createElement(
      'article',
      { 'data-testid': 'mobile-visit-row' },
      ReactRuntime.createElement('span', { 'data-mobile-title': true }, title),
      ReactRuntime.createElement('span', { 'data-mobile-meta': true }, meta),
    ),
  };
});

jest.mock('../../tablet/TabletCollectionPage', () => {
  const ReactRuntime = require('react');
  return {
    TabletCollectionPage: ({ records }) => ReactRuntime.createElement(
      'section',
      { 'data-testid': 'tablet-visit-list' },
      records.map((record) => ReactRuntime.createElement(
        'article',
        { key: record.id, 'data-tablet-visit': record.id },
        ReactRuntime.createElement('span', { 'data-tablet-title': true }, record.title),
        ReactRuntime.createElement('span', { 'data-tablet-meta': true }, record.meta),
      )),
    ),
  };
});

jest.mock('../../tablet/TabletCollectionControls', () => ({
  TabletPaginationFooter: () => null,
}));

const emergencyVisit = {
  id: 'visit-emergency',
  request_id: 'request-1',
  sourceKind: 'emergency_visit',
  source_kind: 'emergency_visit',
  visit_type: 'ambulance',
  type: 'ambulance',
  status: 'in_progress',
  date: '2026-07-15T16:00:00.000Z',
  hospital_name: 'General Hospital',
  identity: {
    patient: { name: 'Ada Patient' },
    doctor: { name: 'Dr. Malik Stone', hasDoctor: true },
    responder: { name: 'Riley Driver', hasResponder: true },
  },
};

const scheduledVisit = {
  id: 'visit-scheduled',
  sourceKind: 'scheduled_visit',
  source_kind: 'scheduled_visit',
  care_mode: 'in_person',
  careModeLabel: 'In person',
  visit_type: 'clinical_visit',
  type: 'clinical_visit',
  status: 'scheduled',
  scheduled_start_at: '2026-07-16T16:00:00.000Z',
  scheduled_timezone: 'UTC',
  hospital_name: 'General Hospital',
  patient: { full_name: 'Bea Patient' },
  assignedDoctor: { name: 'Dr. Priya Shah' },
};

describe('responsive visit identity presentation', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (node) => act(() => root.render(node));

  it('keeps the patient primary while mobile and tablet ambulance rows identify the driver', () => {
    render(<MobileVisitRow visit={emergencyVisit} onOpen={jest.fn()} />);

    expect(container.querySelector('[data-mobile-title]').textContent).toBe('Ada Patient');
    expect(container.querySelector('[data-mobile-meta]').textContent).toContain('Driver: Riley Driver');
    expect(container.querySelector('[data-mobile-meta]').textContent).not.toContain('Dr. Malik Stone');

    render(<TabletVisits visits={[emergencyVisit]} filters={{}} setFilters={jest.fn()} />);

    expect(container.querySelector('[data-tablet-title]').textContent).toBe('Ada Patient');
    expect(container.querySelector('[data-tablet-meta]').textContent).toContain('Driver: Riley Driver');
    expect(container.querySelector('[data-tablet-meta]').textContent).not.toContain('Dr. Malik Stone');
  });

  it('keeps the patient hero while the shared tablet and desktop rail identifies the responder', () => {
    render(
      <VisitsDetailRail
        visit={emergencyVisit}
        loading={false}
        canEdit={false}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onManageScheduledVisit={jest.fn()}
        canManageScheduledVisit={jest.fn(() => false)}
      />,
    );

    expect(container.textContent).toContain('Ada Patient');
    expect(container.textContent).toContain('Responder');
    expect(container.textContent).toContain('Riley Driver');
    expect(container.textContent).not.toContain('Dr. Malik Stone');
  });

  it('shows doctor and practitioner identity for scheduled and clinical care', () => {
    render(<MobileVisitRow visit={scheduledVisit} onOpen={jest.fn()} />);
    expect(container.querySelector('[data-mobile-title]').textContent).toBe('Bea Patient');
    expect(container.querySelector('[data-mobile-meta]').textContent).toContain('Doctor: Dr. Priya Shah');

    render(<TabletVisits visits={[scheduledVisit]} filters={{}} setFilters={jest.fn()} />);
    expect(container.querySelector('[data-tablet-title]').textContent).toBe('Bea Patient');
    expect(container.querySelector('[data-tablet-meta]').textContent).toContain('Doctor: Dr. Priya Shah');

    render(
      <VisitsDetailRail
        visit={scheduledVisit}
        loading={false}
        canEdit={false}
        onView={jest.fn()}
        onEdit={jest.fn()}
        onManageScheduledVisit={jest.fn()}
        canManageScheduledVisit={jest.fn(() => false)}
      />,
    );
    expect(container.textContent).toContain('Bea Patient');
    expect(container.textContent).toContain('Practitioner');
    expect(container.textContent).toContain('Dr. Priya Shah');

    expect(getVisitCareTeamDisplay({
      ...scheduledVisit,
      sourceKind: 'legacy_visit',
      source_kind: 'legacy_visit',
    })).toMatchObject({
      kind: 'doctor',
      rowLabel: 'Doctor',
      detailLabel: 'Practitioner',
      name: 'Dr. Priya Shah',
    });
  });

  it('keeps canonical unassigned responder truth instead of falling back to a doctor', () => {
    expect(getVisitCareTeamDisplay({
      ...emergencyVisit,
      responder_name: 'Stale responder snapshot',
      identity: {
        ...emergencyVisit.identity,
        responder: { name: 'Unassigned', hasResponder: false },
      },
    })).toEqual({
      kind: 'responder',
      rowLabel: 'Driver',
      detailLabel: 'Responder',
      name: 'Unassigned',
    });
  });

  it('uses canonical ambulance identity when a legacy visit type is generic', () => {
    expect(getVisitCareTeamDisplay({
      ...emergencyVisit,
      type: 'emergency',
      visit_type: 'emergency',
      identity: {
        ...emergencyVisit.identity,
        keys: { ambulanceId: 'ambulance-1' },
      },
    })).toMatchObject({
      kind: 'responder',
      rowLabel: 'Driver',
      detailLabel: 'Responder',
      name: 'Riley Driver',
    });
  });

  it('threads the same care-team projection into the mobile detail sheet', () => {
    const mobile = fs.readFileSync(path.resolve(__dirname, '../../mobile/MobileVisits.jsx'), 'utf8');

    expect(mobile).toContain('const careTeam = row.careTeam;');
    expect(mobile).toContain("label: careTeam.detailLabel, value: careTeam.name");
    expect(mobile).toContain('title={row.patientName}');
  });
});
