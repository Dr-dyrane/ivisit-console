import { getScheduledVisitActionCapabilities } from './useScheduledVisitActions';

const PROFILE_ID = 'profile-1';
const visit = {
  id: 'visit-1',
  sourceKind: 'scheduled_visit',
  status: 'scheduled',
  scheduled_start_at: '2026-07-15T16:00:00.000Z',
  scheduled_end_at: '2026-07-15T16:30:00.000Z',
  assignedDoctor: { id: 'doctor-1', profile_id: PROFILE_ID },
};

describe('scheduled visit action capabilities', () => {
  const duringClinicalWindow = new Date('2026-07-15T16:05:00.000Z');

  it('keeps action release independent and closed when disabled', () => {
    expect(getScheduledVisitActionCapabilities({
      visit,
      roleKind: 'admin',
      profileId: PROFILE_ID,
      actionsEnabled: false,
      now: duringClinicalWindow,
    })).toEqual([]);
  });

  it('gives administrators scheduling and eligible clinical actions', () => {
    expect(getScheduledVisitActionCapabilities({
      visit,
      roleKind: 'org_admin',
      profileId: 'another-profile',
      actionsEnabled: true,
      now: duringClinicalWindow,
    }).map((action) => [action.id, action.enabled])).toEqual([
      ['reschedule', true],
      ['cancel', true],
      ['start', true],
      ['no_show', false],
    ]);
  });

  it('limits providers to their own visit and clinical transitions', () => {
    expect(getScheduledVisitActionCapabilities({
      visit,
      roleKind: 'provider',
      profileId: PROFILE_ID,
      actionsEnabled: true,
      now: duringClinicalWindow,
    }).map((action) => action.id)).toEqual(['start', 'no_show']);

    expect(getScheduledVisitActionCapabilities({
      visit,
      roleKind: 'provider',
      profileId: 'unassigned-profile',
      actionsEnabled: true,
      now: duringClinicalWindow,
    })).toEqual([]);
  });

  it('offers completion only for admitted actors on in-progress visits', () => {
    expect(getScheduledVisitActionCapabilities({
      visit: { ...visit, status: 'in_progress' },
      roleKind: 'provider',
      profileId: PROFILE_ID,
      actionsEnabled: true,
      now: duringClinicalWindow,
    })).toEqual([{ id: 'complete', label: 'Complete visit', tone: 'default', enabled: true }]);
  });

  it('never exposes scheduled commands for emergency or legacy records', () => {
    expect(getScheduledVisitActionCapabilities({
      visit: { ...visit, sourceKind: 'emergency_visit' },
      roleKind: 'admin',
      profileId: PROFILE_ID,
      actionsEnabled: true,
      now: duringClinicalWindow,
    })).toEqual([]);
  });
});
