import { supabase } from '../lib/supabase';
import { applyAuthFilter, getCurrentUser } from './authService';
import { supabaseMapService } from './supabaseMapService';

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('./authService', () => ({
  applyAuthFilter: jest.fn((query) => query),
  getCurrentUser: jest.fn(),
}));

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const HOSPITAL_ID = '22222222-2222-4222-8222-222222222222';
const DISPATCH_SCOPE = `dispatch_organization_id.eq.${ORGANIZATION_ID}`;

const createQueryBuilder = (result) => {
  const builder = {};
  ['eq', 'in', 'is', 'limit', 'or', 'order', 'select'].forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return builder;
};

const installQueryBuilders = () => {
  const buildersByTable = new Map();
  supabase.from.mockImplementation((table) => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    const tableBuilders = buildersByTable.get(table) || [];
    tableBuilders.push(builder);
    buildersByTable.set(table, tableBuilders);
    return builder;
  });
  return buildersByTable;
};

describe('map emergency organization scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyAuthFilter.mockImplementation((query) => query);
  });

  it('applies facility-or-standalone scope to the map feed and every emergency count', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'org-admin-1',
      role: 'org_admin',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [HOSPITAL_ID],
    });
    const buildersByTable = installQueryBuilders();

    await supabaseMapService.fetchInitialMapData({ quiet: true });

    const emergencyBuilders = buildersByTable.get('emergency_requests');
    expect(emergencyBuilders).toHaveLength(4);
    emergencyBuilders.forEach((builder) => {
      expect(builder.or).toHaveBeenCalledWith(
        `hospital_id.in.(${HOSPITAL_ID}),${DISPATCH_SCOPE}`
      );
      expect(builder.eq).not.toHaveBeenCalledWith('hospital_id', ORGANIZATION_ID);
    });
  });

  it('keeps a standalone dispatcher map inside its exact dispatch and fleet organization scope', async () => {
    getCurrentUser.mockResolvedValue({
      id: 'dispatcher-1',
      role: 'dispatcher',
      organization_id: ORGANIZATION_ID,
      hospital_ids: [],
    });
    const buildersByTable = installQueryBuilders();

    await supabaseMapService.fetchInitialMapData({ quiet: true });

    const emergencyBuilders = buildersByTable.get('emergency_requests');
    expect(emergencyBuilders).toHaveLength(4);
    emergencyBuilders.forEach((builder) => {
      expect(builder.eq).toHaveBeenCalledWith('dispatch_organization_id', ORGANIZATION_ID);
      expect(builder.eq).not.toHaveBeenCalledWith('hospital_id', ORGANIZATION_ID);
      expect(builder.or).not.toHaveBeenCalled();
    });

    const ambulanceBuilder = buildersByTable.get('ambulances')[0];
    expect(ambulanceBuilder.eq).toHaveBeenCalledWith('organization_id', ORGANIZATION_ID);
    expect(applyAuthFilter).not.toHaveBeenCalledWith(
      ambulanceBuilder,
      expect.anything(),
      expect.anything()
    );
  });
});
