import {
  getLifecycleUpdatedRelative,
  getScheduledClinicalWindow,
  getScheduledLifecycleChip,
  getVisitCareTeamMeta,
  getVisitPatientContact,
  humanizeVisitLifecycleState,
} from './visitEvidencePresentation';
import { visitStatusPillClass } from './visitPageModel';

const scheduledBase = {
  id: 'visit-sched-1',
  sourceKind: 'scheduled_visit',
  source_kind: 'scheduled_visit',
  care_mode: 'in_person',
  scheduled_start_at: '2026-07-16T16:00:00.000Z',
  scheduled_timezone: 'UTC',
};

describe('visit evidence presentation (ADOPT-33/34)', () => {
  describe('scheduled lifecycle chip', () => {
    it('humanizes lifecycle_state and appends the relative update stamp', () => {
      const updatedAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const chip = getScheduledLifecycleChip({
        ...scheduledBase,
        lifecycle_state: 'rescheduled',
        lifecycle_updated_at: updatedAt,
      });

      expect(chip).toMatchObject({
        stateKey: 'rescheduled',
        label: 'Rescheduled',
        updatedRelative: '2h ago',
        chipLabel: 'Rescheduled \u00b7 2h ago',
        className: visitStatusPillClass.scheduled,
      });
    });

    it('humanizes snake_case states without a bespoke label map', () => {
      expect(humanizeVisitLifecycleState('in_progress')).toBe('In progress');
      expect(humanizeVisitLifecycleState('no_show')).toBe('No show');
      expect(humanizeVisitLifecycleState('rating_pending')).toBe('Rating pending');
      expect(humanizeVisitLifecycleState('')).toBeNull();
      expect(humanizeVisitLifecycleState(null)).toBeNull();
    });

    it('keeps the label alone when lifecycle_updated_at is missing or invalid', () => {
      expect(getScheduledLifecycleChip({
        ...scheduledBase,
        lifecycle_state: 'completed',
      })).toMatchObject({ chipLabel: 'Completed', updatedRelative: null });

      expect(getScheduledLifecycleChip({
        ...scheduledBase,
        lifecycle_state: 'completed',
        lifecycle_updated_at: 'not-a-timestamp',
      })).toMatchObject({ chipLabel: 'Completed', updatedRelative: null });
      expect(getLifecycleUpdatedRelative('not-a-timestamp')).toBeNull();
    });

    it('returns honest null without lifecycle truth or outside the scheduled lane', () => {
      expect(getScheduledLifecycleChip({ ...scheduledBase })).toBeNull();
      expect(getScheduledLifecycleChip({ ...scheduledBase, lifecycle_state: '  ' })).toBeNull();
      expect(getScheduledLifecycleChip({
        id: 'visit-em-1',
        sourceKind: 'emergency_visit',
        lifecycle_state: 'initiated',
      })).toBeNull();
      expect(getScheduledLifecycleChip(null)).toBeNull();
    });

    it('tones known states from the canonical pill palette with a muted fallback', () => {
      const chipFor = (state) => getScheduledLifecycleChip({
        ...scheduledBase,
        lifecycle_state: state,
      });
      expect(chipFor('no_show').className).toBe(visitStatusPillClass.cancelled);
      expect(chipFor('rated').className).toBe(visitStatusPillClass.completed);
      expect(chipFor('unmodeled_state').className).toBe('bg-muted/34 text-muted-foreground');
    });
  });

  describe('scheduled clinical window', () => {
    it('formats start to scheduled_end_at in the facility timezone', () => {
      const window = getScheduledClinicalWindow({
        ...scheduledBase,
        scheduled_end_at: '2026-07-16T16:30:00.000Z',
      });
      expect(window).toMatch(/^Jul 16, 4:00\sPM to 4:30\sPM UTC$/);
    });

    it('keeps the end day visible when the window crosses midnight', () => {
      const window = getScheduledClinicalWindow({
        ...scheduledBase,
        scheduled_start_at: '2026-07-16T23:30:00.000Z',
        scheduled_end_at: '2026-07-17T00:15:00.000Z',
      });
      expect(window).toMatch(/^Jul 16, 11:30\sPM to Jul 17, 12:15\sAM UTC$/);
    });

    it('never fabricates a window without end truth or outside the scheduled lane', () => {
      expect(getScheduledClinicalWindow({ ...scheduledBase })).toBeNull();
      expect(getScheduledClinicalWindow({
        id: 'visit-em-1',
        sourceKind: 'emergency_visit',
        scheduled_end_at: '2026-07-16T16:30:00.000Z',
      })).toBeNull();
      expect(getScheduledClinicalWindow(null)).toBeNull();
    });

    it('stays honest when the facility timezone is missing', () => {
      expect(getScheduledClinicalWindow({
        ...scheduledBase,
        scheduled_timezone: null,
        scheduled_end_at: '2026-07-16T16:30:00.000Z',
      })).toBe('Timezone unavailable');
    });
  });

  describe('patient contact', () => {
    it('surfaces the fetched profiles.phone join value', () => {
      expect(getVisitPatientContact({
        patient: { full_name: 'Bea Patient', phone: ' +15550100 ' },
      })).toBe('+15550100');
    });

    it('falls back to identity phone but treats the No contact sentinel as absent', () => {
      expect(getVisitPatientContact({
        identity: { patient: { phone: '+15550111' } },
      })).toBe('+15550111');
      expect(getVisitPatientContact({
        identity: { patient: { phone: 'No contact' } },
      })).toBeNull();
      expect(getVisitPatientContact({ patient: { full_name: 'Bea Patient' } })).toBeNull();
      expect(getVisitPatientContact(null)).toBeNull();
    });
  });

  describe('care team meta', () => {
    it('surfaces doctor specialization from the fetched joins', () => {
      expect(getVisitCareTeamMeta({
        ...scheduledBase,
        assignedDoctor: { name: 'Dr. Priya Shah', specialization: 'Cardiology' },
      })).toEqual({ kind: 'doctor', specialty: 'Cardiology', contact: null });

      expect(getVisitCareTeamMeta({
        id: 'visit-em-2',
        request_id: 'request-2',
        type: 'clinical',
        identity: {
          doctor: { name: 'Dr. Malik Stone', specialty: 'Neurology', hasDoctor: true },
          responder: { hasResponder: false },
        },
      })).toEqual({ kind: 'doctor', specialty: 'Neurology', contact: null });
    });

    it('surfaces responder_phone for ambulance visits and stays null otherwise', () => {
      const ambulanceVisit = {
        id: 'visit-em-1',
        request_id: 'request-1',
        sourceKind: 'emergency_visit',
        type: 'ambulance',
        identity: {
          keys: { ambulanceId: 'ambulance-1' },
          responder: { name: 'Riley Driver', hasResponder: true, phone: '+15550122' },
        },
      };
      expect(getVisitCareTeamMeta(ambulanceVisit)).toEqual({
        kind: 'responder',
        specialty: null,
        contact: '+15550122',
      });

      expect(getVisitCareTeamMeta({
        ...ambulanceVisit,
        identity: {
          keys: { ambulanceId: 'ambulance-1' },
          responder: { name: 'Riley Driver', hasResponder: true, phone: null },
        },
      })).toEqual({ kind: 'responder', specialty: null, contact: null });

      expect(getVisitCareTeamMeta({
        ...ambulanceVisit,
        identity: {
          keys: { ambulanceId: 'ambulance-1' },
          responder: { name: 'Unassigned', hasResponder: false, phone: '+15550122' },
        },
      })).toEqual({ kind: 'responder', specialty: null, contact: null });
    });

    it('never reports a doctor specialty for responder rows', () => {
      expect(getVisitCareTeamMeta({
        id: 'visit-em-1',
        request_id: 'request-1',
        type: 'ambulance',
        specialty: 'Cardiology',
        identity: {
          keys: { ambulanceId: 'ambulance-1' },
          responder: { name: 'Riley Driver', hasResponder: true },
        },
      }).specialty).toBeNull();
    });
  });
});
