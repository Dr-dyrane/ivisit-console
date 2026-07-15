import { supabase } from '../../lib/supabase';
import { enrichVisitsForPage } from './pageEnrichment';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const createQueryBuilder = (rows) => {
  let filterField = null;
  let filterValues = [];
  const builder = {
    select: jest.fn(() => builder),
    in: jest.fn((field, values) => {
      filterField = field;
      filterValues = values;
      return builder;
    }),
    then: (resolve, reject) => Promise.resolve({
      data: filterField
        ? rows.filter((row) => filterValues.includes(row[filterField]))
        : rows,
      error: null,
    }).then(resolve, reject),
  };
  return builder;
};

const installTableRows = (tableRows) => {
  const queries = {};
  supabase.from.mockImplementation((table) => {
    const query = createQueryBuilder(tableRows[table] || []);
    if (!queries[table]) queries[table] = [];
    queries[table].push(query);
    return query;
  });
  return queries;
};

describe('visit page relationship enrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('projects responder profiles separately from assigned doctor records', async () => {
    const queries = installTableRows({
      emergency_requests: [{
        id: 'request-1',
        user_id: 'patient-1',
        hospital_id: 'hospital-1',
        hospital_name: 'General Hospital',
        status: 'accepted',
        service_type: 'ambulance',
        assigned_doctor_id: 'doctor-1',
        responder_id: 'responder-profile-1',
        responder_name: 'Stale responder snapshot',
        responder_phone: '555-0101',
        responder_vehicle_type: 'Advanced life support',
        responder_vehicle_plate: 'AMB-42',
        ambulance_id: 'ambulance-1',
      }],
      profiles: [
        { id: 'patient-1', full_name: 'Ada Patient', email: 'ada@example.com' },
        { id: 'responder-profile-1', full_name: 'Riley Driver', phone: '555-0102' },
      ],
      doctors: [{
        id: 'doctor-1',
        name: 'Dr. Malik Stone',
        specialization: 'Emergency Medicine',
      }],
      hospitals: [{ id: 'hospital-1', name: 'General Hospital', address: '1 Main St' }],
    });

    const [visit] = await enrichVisitsForPage([{
      id: 'visit-1',
      request_id: 'request-1',
      user_id: 'patient-1',
      status: 'scheduled',
      doctor_name: 'Stale doctor snapshot',
    }]);

    expect(visit).toMatchObject({
      status: 'in_progress',
      doctor_id: 'doctor-1',
      doctor_name: 'Dr. Malik Stone',
      responder_id: 'responder-profile-1',
      responder_name: 'Riley Driver',
      assignedDoctor: {
        id: 'doctor-1',
        name: 'Dr. Malik Stone',
      },
      responder: {
        id: 'responder-profile-1',
        name: 'Riley Driver',
        ambulanceId: 'ambulance-1',
        vehiclePlate: 'AMB-42',
      },
      identity: {
        keys: {
          doctorId: 'doctor-1',
          responderProfileId: 'responder-profile-1',
        },
        doctor: { source: 'doctor_relation' },
        responder: { source: 'profile_relation' },
      },
    });
    expect(visit.assignedDoctor.id).not.toBe(visit.responder.id);
    expect(visit.doctor_name).not.toBe(visit.responder_name);

    expect(queries.profiles[0].in).toHaveBeenCalledWith('id', expect.arrayContaining([
      'patient-1',
      'responder-profile-1',
    ]));
    expect(queries.doctors[0].in).toHaveBeenCalledWith('id', ['doctor-1']);
    expect(queries.doctors[0].in).not.toHaveBeenCalledWith('id', ['responder-profile-1']);
    expect(queries.emergency_requests[0].select.mock.calls[0][0]).toContain('responder_id');
  });

  it('does not turn an offered ambulance into an accepted responder', async () => {
    installTableRows({
      emergency_requests: [{
        id: 'request-2',
        user_id: 'patient-2',
        status: 'in_progress',
        service_type: 'ambulance',
        responder_id: null,
        responder_name: null,
        ambulance_id: 'ambulance-2',
        responder_vehicle_plate: 'AMB-99',
      }],
      profiles: [{ id: 'patient-2', full_name: 'Second Patient' }],
    });

    const [visit] = await enrichVisitsForPage([{
      id: 'visit-2',
      request_id: 'request-2',
      user_id: 'patient-2',
      status: 'scheduled',
    }]);

    expect(visit.identity.responder).toMatchObject({
      profileId: null,
      ambulanceId: 'ambulance-2',
      name: 'Unassigned',
      hasResponder: false,
      source: 'unassigned',
    });
    expect(visit).toMatchObject({
      ambulance_id: 'ambulance-2',
      responder_id: null,
      responder_name: null,
      responder: null,
    });
  });
});
