import fs from 'fs';

const read = (path) => fs.readFileSync(path, 'utf8');

describe('request and visit detail identity contract', () => {
  const contextSource = () => read('src/utils/visitContextUtils.js');
  const projectionSource = () => read('src/utils/requestVisitIdentityProjection.js');
  const mapperSource = () => read('src/utils/emergencyRequestMapper.js');
  const visitModalSource = () => [
    read('src/components/modals/VisitModal.jsx'),
    read('src/components/modals/VisitModalSections.jsx'),
  ].join('\n');
  const requestModalSource = () => [
    read('src/components/modals/EmergencyDetailsModal.jsx'),
    read('src/components/modals/EmergencyDetailsSections.jsx'),
  ].join('\n');

  it('uses exact FK-owned reads instead of broad profile, provider, facility, or request lists', () => {
    const source = contextSource();

    expect(source).toContain("import { getProfile } from '../services/profilesService';");
    expect(source).toContain("import { getDoctor } from '../services/doctorsService';");
    expect(source).toContain("import { getEmergencyRequest } from '../services/emergencyService';");
    expect(source).toContain("import { getHospital } from '../services/hospitalsService';");
    expect(source).not.toContain('getProfiles');
    expect(source).not.toContain('getDoctors');
    expect(source).not.toContain('getEmergencyRequests');
    expect(source).not.toContain('getHospitals');
  });

  it('keeps patient, doctor, responder profile, and ambulance UUID lanes explicit', () => {
    const projection = projectionSource();
    const mapper = mapperSource();

    expect(projection).toContain('patientProfileId');
    expect(projection).toContain('doctorId');
    expect(projection).toContain('responderProfileId');
    expect(projection).toContain('ambulanceId');
    expect(projection).toContain('visit?.patient');
    expect(projection).toContain('visit?.profiles');
    expect(mapper).toContain('doctorDisplay: {');
    expect(mapper).toContain('id: identityProjection.responder.profileId');
    expect(mapper).not.toContain('id: row?.ambulance_id || row?.responder_id');
  });

  it('renders doctor and driver/responder as distinct labels in both detail modals', () => {
    const visitModal = visitModalSource();
    const requestModal = requestModalSource();

    expect(visitModal).toContain('>Doctor</Label>');
    expect(visitModal).toContain('>Driver / Responder</Label>');
    expect(requestModal).toContain('label="Doctor"');
    expect(requestModal).toContain('label="Driver / Responder"');
    expect(visitModal).toContain('identityProjection.patient.name');
    expect(requestModal).toContain("const requesterUsername = patient.username || 'Patient';");
    expect(requestModal).not.toContain('activeRequest.profiles?.username');
    expect(requestModal).toContain('fetchRequestVisitIdentity({ request: activeRequest, visit: visitOutcome })');
  });

  it.each([
    'src/components/modals/VisitModal.jsx',
    'src/components/modals/VisitModalSections.jsx',
    'src/components/modals/EmergencyDetailsModal.jsx',
    'src/components/modals/EmergencyDetailsSections.jsx',
    'src/utils/visitContextUtils.js',
    'src/utils/requestVisitIdentityProjection.js',
  ])('%s stays within the production module ceiling', (path) => {
    expect(read(path).split(/\r?\n/).length).toBeLessThanOrEqual(500);
  });
});
