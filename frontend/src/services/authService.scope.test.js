import { applyAuthFilter } from './authService';

const createQuery = () => {
  const query = {};
  query.eq = jest.fn(() => query);
  query.in = jest.fn(() => query);
  query.or = jest.fn(() => query);
  return query;
};

describe('applyAuthFilter emergency persona scope', () => {
  it('scopes responder providers to their own assigned requests before hospital scope', () => {
    const query = createQuery();

    applyAuthFilter(query, {
      id: 'driver-1',
      role: 'provider',
      provider_type: 'driver',
      hospital_ids: ['hospital-1'],
    }, {
      resourceType: 'emergency',
      orgIdField: 'hospital_id',
      providerIdField: 'responder_id',
    });

    expect(query.eq).toHaveBeenCalledWith('responder_id', 'driver-1');
    expect(query.eq).not.toHaveBeenCalledWith('hospital_id', 'hospital-1');
  });

  it('scopes dispatchers to facilities in their canonical organization projection', () => {
    const query = createQuery();

    applyAuthFilter(query, {
      id: 'dispatcher-1',
      role: 'dispatcher',
      organization_id: 'organization-1',
      hospital_ids: ['hospital-1', 'hospital-2'],
    }, {
      resourceType: 'emergency',
      orgIdField: 'hospital_id',
      providerIdField: 'responder_id',
    });

    expect(query.in).toHaveBeenCalledWith('hospital_id', ['hospital-1', 'hospital-2']);
    expect(query.eq).not.toHaveBeenCalledWith('user_id', 'dispatcher-1');
  });
});
