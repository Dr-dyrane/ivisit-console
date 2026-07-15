import { buildRequestVisitIdentityProjection } from './requestVisitIdentityProjection';

describe('request-to-visit identity projection', () => {
  const patientId = '11111111-1111-4111-8111-111111111111';
  const doctorId = '22222222-2222-4222-8222-222222222222';
  const responderId = '33333333-3333-4333-8333-333333333333';
  const requestId = '44444444-4444-4444-8444-444444444444';

  it('rejects a provider row as patient hydration and keeps the canonical nested patient', () => {
    const projection = buildRequestVisitIdentityProjection({
      request: {
        id: requestId,
        user_id: patientId,
        assigned_doctor_id: doctorId,
        patient_snapshot: { fullName: 'Ada Snapshot' },
      },
      visit: {
        id: '55555555-5555-4555-8555-555555555555',
        request_id: requestId,
        user_id: patientId,
        patient: {
          id: patientId,
          full_name: 'Ada Patient',
          username: 'ada.patient',
          email: 'ada@example.com',
        },
        doctor_name: 'Dr. Malik Stone',
      },
      patientProfile: {
        id: doctorId,
        full_name: 'Dr. Malik Stone',
        provider_type: 'doctor',
      },
    });

    expect(projection.patient).toMatchObject({
      profileId: patientId,
      name: 'Ada Patient',
      username: 'ada.patient',
      email: 'ada@example.com',
      source: 'profile_relation',
    });
    expect(projection.patient.name).not.toBe(projection.doctor.name);
  });

  it('keeps doctor table identity separate from driver/responder profile identity', () => {
    const projection = buildRequestVisitIdentityProjection({
      request: {
        id: requestId,
        user_id: patientId,
        assigned_doctor_id: doctorId,
        responder_id: responderId,
        responder_name: 'Stale responder snapshot',
        ambulance_id: '66666666-6666-4666-8666-666666666666',
      },
      visit: {
        request_id: requestId,
        user_id: patientId,
        doctor_name: 'Dr. Malik Stone',
      },
      patientProfile: { id: patientId, full_name: 'Ada Patient' },
      doctorRecord: {
        id: doctorId,
        name: 'Dr. Malik Stone',
        specialization: 'Emergency Medicine',
      },
      responderProfile: {
        id: responderId,
        full_name: 'Riley Driver',
        provider_type: 'driver',
      },
    });

    expect(projection.keys).toMatchObject({
      patientProfileId: patientId,
      doctorId,
      responderProfileId: responderId,
    });
    expect(projection.doctor).toMatchObject({
      doctorId,
      name: 'Dr. Malik Stone',
      hasDoctor: true,
    });
    expect(projection.responder).toMatchObject({
      profileId: responderId,
      name: 'Riley Driver',
      hasResponder: true,
    });
    expect(projection.doctor.name).not.toBe(projection.responder.name);
    expect(projection.responder.profileId).not.toBe(projection.responder.ambulanceId);
  });

  it('records a request/visit patient UUID mismatch and keeps request-owned patient truth', () => {
    const projection = buildRequestVisitIdentityProjection({
      request: {
        id: requestId,
        user_id: patientId,
        patient_snapshot: '{"fullName":"Ada Patient"}',
      },
      visit: {
        request_id: requestId,
        user_id: responderId,
        patient: { id: responderId, full_name: 'Riley Driver' },
      },
    });

    expect(projection.patient).toMatchObject({
      profileId: patientId,
      name: 'Ada Patient',
      source: 'patient_snapshot',
    });
    expect(projection.mismatches.patientProfileId).toBe(true);
  });

  it('keeps an offered ambulance separate from an accepted responder', () => {
    const projection = buildRequestVisitIdentityProjection({
      request: {
        id: requestId,
        user_id: patientId,
        ambulance_id: '66666666-6666-4666-8666-666666666666',
        responder_vehicle_plate: 'AMB-42',
      },
    });

    expect(projection.responder).toMatchObject({
      profileId: null,
      ambulanceId: '66666666-6666-4666-8666-666666666666',
      name: 'Unassigned',
      vehiclePlate: 'AMB-42',
      hasResponder: false,
      source: 'unassigned',
    });
  });
});
