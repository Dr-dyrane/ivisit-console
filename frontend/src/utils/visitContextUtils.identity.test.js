import { getDoctor, getDoctors } from '../services/doctorsService';
import { getEmergencyRequest, getEmergencyRequests } from '../services/emergencyService';
import { getHospital, getHospitals } from '../services/hospitalsService';
import { getProfile, getProfiles } from '../services/profilesService';
import { fetchVisitContext } from './visitContextUtils';

jest.mock('../services/doctorsService', () => ({
  getDoctor: jest.fn(),
  getDoctors: jest.fn(),
}));

jest.mock('../services/emergencyService', () => ({
  getEmergencyRequest: jest.fn(),
  getEmergencyRequests: jest.fn(),
}));

jest.mock('../services/hospitalsService', () => ({
  getHospital: jest.fn(),
  getHospitals: jest.fn(),
}));

jest.mock('../services/profilesService', () => ({
  getProfile: jest.fn(),
  getProfiles: jest.fn(),
}));

describe('visit detail identity context', () => {
  const patientId = '11111111-1111-4111-8111-111111111111';
  const doctorId = '22222222-2222-4222-8222-222222222222';
  const responderId = '33333333-3333-4333-8333-333333333333';
  const requestId = '44444444-4444-4444-8444-444444444444';
  const hospitalId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    jest.clearAllMocks();

    getProfiles.mockResolvedValue([{
      id: doctorId,
      full_name: 'Dr. Malik Stone',
      role: 'provider',
      provider_type: 'doctor',
    }]);
    getProfile.mockImplementation(async (profileId) => {
      if (profileId === responderId) {
        return {
          id: responderId,
          full_name: 'Riley Driver',
          role: 'provider',
          provider_type: 'driver',
        };
      }
      return {
        id: patientId,
        full_name: 'Ada Patient',
        email: 'ada@example.com',
        role: 'patient',
      };
    });
    getDoctors.mockResolvedValue([]);
    getDoctor.mockResolvedValue({
      id: doctorId,
      name: 'Dr. Malik Stone',
      specialization: 'Emergency Medicine',
    });
    getHospitals.mockResolvedValue([]);
    getHospital.mockResolvedValue({ id: hospitalId, name: 'General Hospital' });
    getEmergencyRequests.mockResolvedValue([]);
    getEmergencyRequest.mockResolvedValue({
      id: requestId,
      user_id: patientId,
      hospital_id: hospitalId,
      assigned_doctor_id: doctorId,
      responder_id: responderId,
      responder_name: 'Riley Driver',
      patient_snapshot: { fullName: 'Ada Patient' },
      service_type: 'ambulance',
      status: 'accepted',
    });
  });

  it('does not replace the request patient with an assigned provider during detail hydration', async () => {
    const context = await fetchVisitContext({
      id: '66666666-6666-4666-8666-666666666666',
      request_id: requestId,
      user_id: patientId,
      hospital_id: hospitalId,
      patient: {
        id: patientId,
        full_name: 'Ada Patient',
        email: 'ada@example.com',
      },
      doctor_name: 'Dr. Malik Stone',
    });

    expect(context.patient).toMatchObject({
      id: patientId,
      fullName: 'Ada Patient',
    });
    expect(context.doctor).toMatchObject({
      id: doctorId,
      name: 'Dr. Malik Stone',
    });
    expect(context.responder).toMatchObject({
      id: responderId,
      name: 'Riley Driver',
    });
    expect(context.patient.id).not.toBe(context.doctor.id);
    expect(context.patient.id).not.toBe(context.responder.id);
    expect(context.doctor.name).not.toBe(context.responder.name);
    expect(getProfiles).not.toHaveBeenCalled();
  });
});
