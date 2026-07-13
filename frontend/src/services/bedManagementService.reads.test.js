import { bedManagementService } from './bedManagementService';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

const makeBuilder = (response) => {
  const builder = {};
  ['select', 'eq', 'in', 'order'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(response).then(resolve, reject);
  return builder;
};

describe('bed management read failures', () => {
  let consoleError;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('does not convert a failed reservation read into an empty list', async () => {
    const failure = { code: 'AUDIT_READ_FAILED', message: 'reservation read failed' };
    supabase.from.mockReturnValue(makeBuilder({ data: null, error: failure }));

    await expect(bedManagementService.getActiveReservations('hospital-1')).rejects.toBe(failure);
  });

  it('does not convert a failed utilization read into a zeroed projection', async () => {
    const failure = { code: 'AUDIT_READ_FAILED', message: 'utilization read failed' };
    supabase.from.mockReturnValue(makeBuilder({ data: null, error: failure }));

    await expect(bedManagementService.getBedUtilization('hospital-1')).rejects.toBe(failure);
  });
});
