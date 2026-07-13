import { supabase } from '../lib/supabase';
import { onboardingService } from './onboardingService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    storage: { from: jest.fn() },
    rpc: jest.fn(),
  },
}));

const makeFormData = () => ({
  organizationType: 'hospital',
  organizationName: 'Test Hospital',
  registrationNumber: 'REG-1',
  contactEmail: 'admin@example.com',
  phone: '+10000000000',
  address: '1 Test Street',
  city: 'Test City',
  state: 'Test State',
  termsAccepted: true,
  documents: [{
    documentType: 'license',
    file: {
      name: 'license.pdf',
      type: 'application/pdf',
      size: 128,
    },
  }],
});

describe('onboarding document cleanup', () => {
  let bucket;

  beforeEach(() => {
    jest.clearAllMocks();
    bucket = {
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    supabase.storage.from.mockReturnValue(bucket);
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1', email: 'admin@example.com' } } },
      error: null,
    });
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'ORGANIZATION_NAME_INVALID' },
    });
  });

  it('preserves the provisioning failure when uploaded evidence is removed', async () => {
    await expect(onboardingService.submitOnboarding(makeFormData())).rejects.toMatchObject({
      code: 'ORGANIZATION_NAME_INVALID',
      message: 'Enter the organization name.',
    });

    expect(bucket.remove).toHaveBeenCalledWith([
      expect.stringMatching(/^onboarding\/user-1\/.+\.pdf$/),
    ]);
  });

  it('reports a Storage remove response error instead of hiding cleanup failure', async () => {
    bucket.remove.mockResolvedValue({
      data: null,
      error: { message: 'Storage remove denied' },
    });

    await expect(onboardingService.submitOnboarding(makeFormData())).rejects.toMatchObject({
      code: 'DOCUMENT_CLEANUP_FAILED',
      message: 'Registration did not finish, and uploaded documents could not be removed. Contact support before trying again.',
    });
  });

  it('reports a rejected Storage remove request as cleanup failure', async () => {
    bucket.remove.mockRejectedValue(new Error('Storage unavailable'));

    await expect(onboardingService.submitOnboarding(makeFormData())).rejects.toMatchObject({
      code: 'DOCUMENT_CLEANUP_FAILED',
      message: 'Registration did not finish, and uploaded documents could not be removed. Contact support before trying again.',
    });
  });
});
