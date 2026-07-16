import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { VisitsDetailRail } from './VisitsDesktopWorkspace';

// Non-vacuous ADOPT-33/34 gates: these render the actual rail and assert the
// already-fetched lifecycle, clinical-window, and contact/specialty truth
// reaches the DOM -- and that missing truth renders as honest absence.

const scheduledVisit = {
  id: 'visit-scheduled-evidence',
  display_id: 'VIS-2001',
  sourceKind: 'scheduled_visit',
  source_kind: 'scheduled_visit',
  care_mode: 'in_person',
  careModeLabel: 'In person',
  status: 'scheduled',
  lifecycle_state: 'rescheduled',
  lifecycle_updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  scheduled_start_at: '2026-07-16T16:00:00.000Z',
  scheduled_end_at: '2026-07-16T16:30:00.000Z',
  scheduled_timezone: 'UTC',
  hospital_name: 'General Hospital',
  patient: { full_name: 'Bea Patient', phone: '+15550100' },
  assignedDoctor: { name: 'Dr. Priya Shah', specialization: 'Cardiology' },
};

const emergencyVisit = {
  id: 'visit-emergency-evidence',
  request_id: 'request-1',
  sourceKind: 'emergency_visit',
  source_kind: 'emergency_visit',
  visit_type: 'ambulance',
  type: 'ambulance',
  status: 'in_progress',
  date: '2026-07-15T16:00:00.000Z',
  hospital_name: 'General Hospital',
  patient: { full_name: 'Ada Patient', phone: '+15550188' },
  identity: {
    keys: { ambulanceId: 'ambulance-1' },
    patient: { name: 'Ada Patient' },
    doctor: { name: 'Unassigned', hasDoctor: false },
    responder: { name: 'Riley Driver', hasResponder: true, phone: '+15550122' },
  },
};

describe('VisitsDetailRail adopted evidence bindings', () => {
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

  const renderRail = (visit) => act(() => root.render(
    <VisitsDetailRail
      visit={visit}
      loading={false}
      canEdit={false}
      onView={jest.fn()}
      onEdit={jest.fn()}
      onManageScheduledVisit={jest.fn()}
      canManageScheduledVisit={jest.fn(() => false)}
    />,
  ));

  it('renders the scheduled lifecycle chip with the relative update stamp', () => {
    renderRail(scheduledVisit);

    const chip = container.querySelector('[data-testid="visit-lifecycle-chip"]');
    expect(chip).not.toBeNull();
    expect(chip.textContent).toContain('Rescheduled');
    expect(chip.textContent).toContain('2h ago');
  });

  it('renders the clinical window from scheduled_start_at to scheduled_end_at', () => {
    renderRail(scheduledVisit);

    expect(container.textContent).toContain('Clinical window');
    expect(container.textContent).toMatch(/Jul 16, 4:00\sPM to 4:30\sPM UTC/);
  });

  it('renders patient contact and doctor specialty from the fetched joins', () => {
    renderRail(scheduledVisit);

    expect(container.textContent).toContain('Patient contact');
    expect(container.textContent).toContain('+15550100');
    expect(container.textContent).toContain('Specialty');
    expect(container.textContent).toContain('Cardiology');
    expect(container.textContent).not.toContain('Responder contact');
  });

  it('renders responder contact for ambulance visits instead of a specialty line', () => {
    renderRail(emergencyVisit);

    expect(container.textContent).toContain('Responder contact');
    expect(container.textContent).toContain('+15550122');
    expect(container.textContent).toContain('Patient contact');
    expect(container.textContent).toContain('+15550188');
    expect(container.textContent).not.toContain('Specialty');
    expect(container.querySelector('[data-testid="visit-lifecycle-chip"]')).toBeNull();
  });

  // ADOPT-65: record-level updated_at renders as a DISPLAY-ONLY relative line
  // (the sortable Time header stays date/scheduled_start_at); missing truth
  // renders honest absence, never 'Unknown time'.
  it('renders the record Updated line only when updated_at is fetched', () => {
    renderRail({
      ...emergencyVisit,
      updated_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    });
    expect(container.textContent).toContain('Updated');
    expect(container.textContent).toContain('3h ago');

    renderRail(emergencyVisit);
    expect(container.textContent).not.toContain('Updated');
  });

  it('renders honest absence when the adopted truth is missing', () => {
    renderRail({
      id: 'visit-scheduled-bare',
      sourceKind: 'scheduled_visit',
      source_kind: 'scheduled_visit',
      care_mode: 'in_person',
      careModeLabel: 'In person',
      status: 'scheduled',
      scheduled_start_at: '2026-07-16T16:00:00.000Z',
      scheduled_timezone: 'UTC',
      hospital_name: 'General Hospital',
      patient: { full_name: 'Bea Patient' },
      assignedDoctor: { name: 'Dr. Priya Shah' },
    });

    expect(container.querySelector('[data-testid="visit-lifecycle-chip"]')).toBeNull();
    expect(container.textContent).not.toContain('Clinical window');
    expect(container.textContent).not.toContain('Patient contact');
    expect(container.textContent).not.toContain('Specialty');
    expect(container.textContent).not.toContain('Responder contact');
  });
});
