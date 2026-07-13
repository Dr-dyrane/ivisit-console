import React, { createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ROUTE_CONTRACT_VIEWPORTS,
  createActionReceiverSpy,
  createAuthFixture,
  createProfileFixture,
  renderRouteContract,
} from '.';

const FixtureContext = createContext('missing');

const ContractProbe = () => {
  const fixture = useContext(FixtureContext);
  const location = useLocation();

  return (
    <main>
      <p>{fixture}</p>
      <p>{`${location.pathname}${location.search}`}</p>
      <p aria-busy="true">Loading requests</p>
      <p role="alert">Requests unavailable</p>
      <p data-empty-state="true">No requests</p>
    </main>
  );
};

describe('route contract harness', () => {
  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  });

  it('builds deterministic role and auth fixtures with provider subtype support', () => {
    const provider = createProfileFixture('provider');
    const responder = createProfileFixture('provider', { provider_type: 'ambulance' });
    const auth = createAuthFixture('organization_admin');

    expect(provider.provider_type).toBe('hospital');
    expect(responder.provider_type).toBe('ambulance');
    expect(auth.user.id).toBe(auth.profile.user_id);
    expect(auth.profile.organization_id).toBe('organization-fixture');
  });

  it('mounts a routed surface with providers, viewport, and state capture', async () => {
    const harness = await renderRouteContract(<ContractProbe />, {
      initialEntry: '/emergencies?id=REQ-1',
      routePath: '/emergencies',
      viewport: 'mobile',
      providers: [{ Provider: FixtureContext.Provider, props: { value: 'scoped provider' } }],
    });

    expect(window.innerWidth).toBe(ROUTE_CONTRACT_VIEWPORTS.mobile.width);
    expect(harness.locations.at(-1).pathname).toBe('/emergencies');
    expect(harness.capture()).toEqual(expect.objectContaining({
      loading: ['Loading requests'],
      errors: ['Requests unavailable'],
      empty: ['No requests'],
    }));
    expect(harness.capture().text).toContain('scoped provider');
    expect(harness.capture().text).toContain('/emergencies?id=REQ-1');

    await harness.cleanup();
  });

  it('records action payloads without depending on Jest mocks', () => {
    const receiver = createActionReceiverSpy((payload) => payload.id);

    expect(receiver.handler({ id: 'REQ-1' })).toBe('REQ-1');
    expect(receiver.handler({ id: 'REQ-2' })).toBe('REQ-2');
    expect(receiver.callCount).toBe(2);
    expect(receiver.lastCall).toEqual([{ id: 'REQ-2' }]);

    receiver.reset();
    expect(receiver.calls).toEqual([]);
  });
});
