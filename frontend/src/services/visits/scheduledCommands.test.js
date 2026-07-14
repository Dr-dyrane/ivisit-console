import {
  transitionScheduledVisit,
  zonedLocalDateTimeToUtc,
} from './scheduledCommands';
import { normalizeVisitForUI } from './normalization';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const VISIT_ID = '11111111-1111-4111-8111-111111111111';

describe('scheduled visit command contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends only receiver-accepted transition fields', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: {
        id: VISIT_ID,
        request_id: null,
        care_mode: 'in_person',
        scheduled_start_at: '2026-07-15T16:00:00.000Z',
        status: 'upcoming',
      },
      error: null,
    });

    const result = await transitionScheduledVisit({
      visitId: VISIT_ID,
      action: 'reschedule',
      scheduledStartAt: '2026-07-16T17:00:00.000Z',
      reason: ' Patient requested a later time. ',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('transition_scheduled_visit', {
      p_visit_id: VISIT_ID,
      p_action: 'reschedule',
      p_scheduled_start_at: '2026-07-16T17:00:00.000Z',
      p_reason: 'Patient requested a later time.',
    });
    expect(result).toMatchObject({ id: VISIT_ID, sourceKind: 'scheduled_visit', status: 'scheduled' });
  });

  it('fails before RPC for unsupported actions or incomplete rescheduling', async () => {
    await expect(transitionScheduledVisit({ visitId: VISIT_ID, action: 'delete' }))
      .rejects.toMatchObject({ name: 'ScheduledVisitActionError' });
    await expect(transitionScheduledVisit({ visitId: VISIT_ID, action: 'reschedule' }))
      .rejects.toThrow('Choose a new start time before rescheduling.');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('converts facility-local time to UTC and rejects nonexistent DST times', () => {
    expect(zonedLocalDateTimeToUtc('2026-07-15T09:00', 'America/Los_Angeles'))
      .toBe('2026-07-15T16:00:00.000Z');
    expect(() => zonedLocalDateTimeToUtc('2026-03-08T02:30', 'America/Los_Angeles'))
      .toThrow('does not exist');
  });

  it('preserves resolved emergency status while classifying scheduled visits separately', () => {
    expect(normalizeVisitForUI({
      id: 'emergency-visit',
      request_id: 'request-1',
      source_status: 'scheduled',
      status: 'in_progress',
    })).toMatchObject({ sourceKind: 'emergency_visit', status: 'in_progress' });
    expect(normalizeVisitForUI({
      id: 'scheduled-visit',
      request_id: null,
      care_mode: 'telemedicine_async',
      scheduled_start_at: '2026-07-15T16:00:00.000Z',
      status: 'upcoming',
    })).toMatchObject({
      sourceKind: 'scheduled_visit',
      status: 'scheduled',
      asyncConsultAvailability: 'Active',
    });
  });
});
