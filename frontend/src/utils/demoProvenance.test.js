import {
  getOrganizationDataClass,
  isDemoOrganization,
} from './demoProvenance';

describe('demo organization provenance', () => {
  it('recognizes canonical bootstrap ownership markers', () => {
    expect(isDemoOrganization({
      contact_email: 'demo+coverage-run@ivisit-demo.local',
    })).toBe(true);
    expect(isDemoOrganization({
      name: 'iVisit Coverage Network RUN123',
    })).toBe(true);
  });

  it('does not classify ordinary organizations from loose demo-like copy', () => {
    expect(isDemoOrganization({
      name: 'Demo Community Hospital',
      contact_email: 'admin@hospital.example',
    })).toBe(false);
    expect(getOrganizationDataClass({
      name: 'LifeStream Health',
      contact_email: 'operations@lifestream.example',
    })).toBe('operational');
  });

  it('returns simulated only for proven demo ownership', () => {
    expect(getOrganizationDataClass({
      contact_email: 'provider@ivisit-demo.local',
    })).toBe('simulated');
  });
});
