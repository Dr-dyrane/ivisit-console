import fs from 'fs';
import {
  getScheduledVisitById,
  getScheduledVisitsPageData,
  sanitizeScheduledVisitSearch,
  SCHEDULED_VISIT_PAGE_SIZE,
  SCHEDULED_VISIT_SELECT,
} from './scheduledQueries';
import { getCurrentUser } from '../authService';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../authService', () => ({
  getCurrentUser: jest.fn(),
}));

const VISIT_ID = '11111111-1111-4111-8111-111111111111';
const HOSPITAL_ID = '22222222-2222-4222-8222-222222222222';
const DOCTOR_ID = '33333333-3333-4333-8333-333333333333';

const scheduledRow = {
  id: VISIT_ID,
  display_id: 'VIS-1024',
  user_id: 'patient-1',
  doctor_id: DOCTOR_ID,
  hospital_id: HOSPITAL_ID,
  request_id: null,
  care_mode: 'telemedicine_async',
  scheduled_start_at: '2026-07-15T16:00:00.000Z',
  scheduled_end_at: '2026-07-15T16:30:00.000Z',
  scheduled_timezone: 'America/Los_Angeles',
  status: 'upcoming',
  patient: { id: 'patient-1', full_name: 'Patient One' },
  doctor_record: { id: DOCTOR_ID, profile_id: 'profile-1', name: 'Dr. Morgan Lee' },
  hospital_record: { id: HOSPITAL_ID, name: 'North Clinic', timezone: 'America/Los_Angeles' },
};

const createQueryBuilder = (result) => {
  const builder = {};
  ['abortSignal', 'eq', 'gte', 'in', 'is', 'lt', 'not', 'or', 'order', 'range', 'select'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

describe('scheduled visit query contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' });
  });

  it('uses exact server paging, source predicates, counts, and allowlisted search fields', async () => {
    const page = createQueryBuilder({ data: [scheduledRow], error: null, count: 1 });
    const counts = [1, 1, 0, 0, 0].map((count) => createQueryBuilder({ count, error: null }));
    supabase.from
      .mockReturnValueOnce(page)
      .mockReturnValueOnce(counts[0])
      .mockReturnValueOnce(counts[1])
      .mockReturnValueOnce(counts[2])
      .mockReturnValueOnce(counts[3])
      .mockReturnValueOnce(counts[4]);

    const result = await getScheduledVisitsPageData({
      filters: { search: 'VIS-1024,%', care_mode: ['telemedicine_async'] },
      range: { start: 0, end: 999 },
      sortConfig: { key: 'scheduled_start_at', direction: 'asc' },
    });

    expect(SCHEDULED_VISIT_PAGE_SIZE).toBe(20);
    expect(page.range).toHaveBeenCalledWith(0, 19);
    expect(page.is).toHaveBeenCalledWith('request_id', null);
    expect(page.in).toHaveBeenCalledWith('care_mode', ['in_person', 'telemedicine_async']);
    expect(page.not).toHaveBeenCalledWith('scheduled_start_at', 'is', null);
    expect(page.or).toHaveBeenCalledWith([
      'display_id.ilike.%VIS-1024%',
      'type.ilike.%VIS-1024%',
      'hospital_name.ilike.%VIS-1024%',
      'doctor_name.ilike.%VIS-1024%',
      'specialty.ilike.%VIS-1024%',
    ].join(','));
    expect(result).toMatchObject({
      count: 1,
      countBasis: 'server_exact',
      pageSize: 20,
      stats: { total: 1, scheduled: 1, inProgress: 0, completed: 0, cancelled: 0 },
    });
    expect(result.visits[0]).toMatchObject({
      id: VISIT_ID,
      status: 'scheduled',
      sourceKind: 'scheduled_visit',
      careModeLabel: 'Async consult',
      asyncConsultAvailability: 'Active',
    });
  });

  it('scopes organization detail reads to admitted facility IDs', async () => {
    getCurrentUser.mockResolvedValueOnce({
      id: 'org-admin-1',
      role: 'org_admin',
      hospital_ids: [HOSPITAL_ID],
    });
    const query = createQueryBuilder({ data: scheduledRow, error: null });
    supabase.from.mockReturnValueOnce(query);

    await expect(getScheduledVisitById(VISIT_ID)).resolves.toMatchObject({ id: VISIT_ID });
    expect(query.in).toHaveBeenCalledWith('hospital_id', [HOSPITAL_ID]);
    expect(query.eq).toHaveBeenCalledWith('id', VISIT_ID);
  });

  it('scopes provider reads through the linked doctor identity', async () => {
    getCurrentUser.mockResolvedValueOnce({ id: 'profile-1', role: 'provider' });
    const doctorQuery = createQueryBuilder({ data: { id: DOCTOR_ID }, error: null });
    const visitQuery = createQueryBuilder({ data: scheduledRow, error: null });
    supabase.from.mockReturnValueOnce(doctorQuery).mockReturnValueOnce(visitQuery);

    await getScheduledVisitById(VISIT_ID);

    expect(supabase.from.mock.calls).toEqual([['doctors'], ['visits']]);
    expect(doctorQuery.eq).toHaveBeenCalledWith('profile_id', 'profile-1');
    expect(visitQuery.eq).toHaveBeenCalledWith('doctor_id', DOCTOR_ID);
  });

  it('keeps patient search and consult content outside the projection', () => {
    expect(sanitizeScheduledVisitSearch('  Ada,%  ')).toBe('Ada');
    expect(SCHEDULED_VISIT_SELECT).not.toMatch(/message|attachment|media|consult_content|notes/i);
    expect(SCHEDULED_VISIT_SELECT).toContain('patient:profiles!visits_user_id_fkey');

    const source = fs.readFileSync('src/services/visits/scheduledQueries.js', 'utf8');
    expect(source).not.toContain('full_name.ilike');
    expect(source).not.toContain('email.ilike');
  });
});
