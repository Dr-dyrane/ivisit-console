import {
  buildEmergencyRequestSubmission,
  createEmergencyRequestDraft,
  getRequestCoordinates,
  mergeEmergencyRequestDraft,
  normalizeEmergencyStatus,
  normalizeServiceType,
} from './requestModel';

describe('EmergencyRequestModal request model', () => {
  it('normalizes only the established lifecycle aliases and supported service types', () => {
    expect(normalizeEmergencyStatus('pending')).toBe('pending_approval');
    expect(normalizeEmergencyStatus('DISPATCHED')).toBe('in_progress');
    expect(normalizeEmergencyStatus('en_route')).toBe('accepted');
    expect(normalizeEmergencyStatus('canceled')).toBe('cancelled');
    expect(normalizeEmergencyStatus('arrived')).toBe('arrived');
    expect(normalizeServiceType(' BED ')).toBe('bed');
    expect(normalizeServiceType('cardiac')).toBe('ambulance');
  });

  it('hydrates request fields without treating provider or incident identity as a service fallback', () => {
    const previous = createEmergencyRequestDraft({
      user_id: 'patient-previous',
      service_type: 'bed',
      emergency_type: 'stroke',
    });
    const request = {
      id: 'request-1',
      user_id: 'patient-1',
      responder_id: 'responder-profile-1',
      doctor_id: 'doctor-1',
      emergency_type: 'cardiac',
      service_type: 'booking',
      status: 'en_route',
      patient_snapshot: { incident_type: 'respiratory' },
    };

    expect(mergeEmergencyRequestDraft(previous, request)).toEqual(expect.objectContaining({
      id: 'request-1',
      user_id: 'patient-1',
      responder_id: 'responder-profile-1',
      doctor_id: 'doctor-1',
      service_type: 'booking',
      emergency_type: 'respiratory',
      status: 'accepted',
    }));
  });

  it.each([
    [{ latitude: null, longitude: null }, true],
    [{ latitude: 6.45, longitude: 3.39 }, true],
    [{ latitude: '', longitude: '' }, true],
    [{ latitude: 6.45, longitude: '' }, false],
    [{ latitude: '', longitude: 3.39 }, false],
    [{ latitude: 91, longitude: 3.39 }, false],
    [{ latitude: 6.45, longitude: -181 }, false],
    [{ latitude: 'not-a-number', longitude: 3.39 }, false],
  ])('validates latitude and longitude as one bounded pair: %j', (coordinates, isValid) => {
    expect(getRequestCoordinates(coordinates).isValid).toBe(isValid);
  });

  it('builds the exact create receiver payload and preserves patient snapshot fields', () => {
    const formData = {
      profiles: { id: 'patient-joined-row' },
      profile: { id: 'patient-fallback-row' },
      user_id: 'patient-1',
      doctor_id: 'doctor-1',
      responder_id: 'responder-profile-1',
      ambulance_id: 'ambulance-1',
      service_type: 'BED',
      specialty: 'cardiology',
      status: 'completed',
      hospital_id: 'hospital-1',
      hospital_name: 'Care Hospital',
      ambulance_type: 'advanced',
      bed_number: 'B-12',
      total_cost: 0,
      payment_status: 'pending',
      priority: 'high',
      emergency_type: 'cardiac',
      location: '12 Care Street',
      latitude: '6.45',
      longitude: '3.39',
      description: 'Patient needs support',
      patient_snapshot: {
        patient_name: 'Ada Patient',
        blood_type: 'O+',
        incident_type: 'old-value',
      },
    };

    const submission = buildEmergencyRequestSubmission(formData, true);

    expect(submission.submitData).not.toHaveProperty('profiles');
    expect(submission.normalizedStatus).toBe('completed');
    expect(submission.payload).toEqual({
      user_id: 'patient-1',
      service_type: 'bed',
      specialty: 'cardiology',
      status: 'pending_approval',
      hospital_id: 'hospital-1',
      hospital_name: 'Care Hospital',
      ambulance_type: 'advanced',
      bed_number: 'B-12',
      total_cost: 0,
      payment_status: 'pending',
      patient_snapshot: {
        patient_name: 'Ada Patient',
        blood_type: 'O+',
        incident_type: 'cardiac',
        priority: 'high',
        location_text: '12 Care Street',
        description: 'Patient needs support',
      },
      patient_location: { lat: 6.45, lng: 3.39 },
      description: 'Patient needs support',
    });
    expect(submission.payload).not.toHaveProperty('doctor_id');
    expect(submission.payload).not.toHaveProperty('responder_id');
    expect(submission.payload).not.toHaveProperty('ambulance_id');
  });

  it('keeps edit status canonical and omits absent coordinates without manufacturing location truth', () => {
    const { payload } = buildEmergencyRequestSubmission({
      user_id: 'patient-2',
      service_type: 'ambulance',
      status: 'responding',
      priority: 'medium',
      emergency_type: 'accident',
      latitude: null,
      longitude: null,
      description: '',
    }, false);

    expect(payload.status).toBe('accepted');
    expect(payload.patient_location).toBeUndefined();
    expect(payload.description).toBeUndefined();
  });
});
