import {
  buildRequestsServiceFilter,
  getDefaultRequestKpi,
  getRequestKpiCount,
  getRequestSignal,
  hasActiveRequestFilters,
  resolveRequestKpiActive,
} from './requestPageModel';
import {
  buildMobileRequestDetailModel,
  getMobileRequestKpiValue,
  hasMobileRequestFilters,
} from '../../mobile/requests/mobileEmergencyModel';

describe('Requests page model', () => {
  it('projects filter UI state into the emergency service contract', () => {
    const filters = {
      search: 'REQ-104',
      status: ['pending_approval', 'accepted'],
      created_at: { start: '2026-07-01', end: '2026-07-13' },
    };

    expect(buildRequestsServiceFilter(filters)).toEqual({
      search: 'REQ-104',
      status: ['pending_approval', 'accepted'],
      date_from: '2026-07-01T00:00:00.000Z',
      date_to: '2026-07-13T23:59:59.999Z',
    });
    expect(hasActiveRequestFilters(filters)).toBe(true);
    expect(hasActiveRequestFilters({ search: '', status: [], created_at: {} })).toBe(false);
  });

  it('uses authoritative KPI statistics and falls back to the current page only when absent', () => {
    const requests = [
      { id: 'pending', status: 'pending_approval', service_type: 'bed' },
      { id: 'active', status: 'accepted', service_type: 'ambulance' },
      { id: 'done', status: 'completed', service_type: 'booking' },
    ];

    expect(getRequestKpiCount({ id: 'pending', stats: { pending: 9 }, requests })).toBe(9);
    expect(getRequestKpiCount({ id: 'pending', stats: null, requests })).toBe(1);
    expect(getRequestKpiCount({ id: 'bed', stats: null, requests })).toBe(1);
    expect(getRequestKpiCount({ id: 'all', stats: { total: 42 }, requests })).toBe(42);
    expect(getRequestKpiCount({ id: 'pending', stats: { pending: 0 }, requests })).toBe(0);
  });

  it('chooses the first meaningful queue and keeps failure and clear signals distinct', () => {
    expect(getDefaultRequestKpi({ pending_approval: 3, active: 8 })).toBe('pending');
    expect(getDefaultRequestKpi({ pending: 0, active: 8 })).toBe('active');
    expect(getDefaultRequestKpi({ pending: 0, active: 0 })).toBe('all');

    expect(getRequestSignal({
      stats: null,
      requests: [],
      kpiFilter: 'pending',
      loadError: 'offline',
    })).toMatchObject({
      tone: 'danger',
      label: 'Load failed',
      headline: 'Requests did not load',
    });

    expect(getRequestSignal({
      stats: { pending: 0 },
      requests: [],
      kpiFilter: 'pending',
      loadError: null,
    })).toMatchObject({
      tone: 'clear',
      label: 'Clear',
      headline: 'No requests need review',
    });
    expect(resolveRequestKpiActive({ id: 'pending' }, 0)).toMatchObject({
      colorClass: expect.stringContaining('text-emerald-700'),
    });
  });

});

describe('Requests mobile model', () => {
  it('keeps mobile KPI fallbacks and filter detection consistent with desktop', () => {
    const emergencies = [
      { id: 'pending', status: 'pending_approval', service_type: 'bed' },
      { id: 'active', status: 'accepted', service_type: 'ambulance' },
    ];

    expect(getMobileRequestKpiValue({ id: 'pending', statistics: null, emergencies })).toBe(1);
    expect(getMobileRequestKpiValue({ id: 'active', statistics: null, emergencies })).toBe(2);
    expect(getMobileRequestKpiValue({ id: 'ambulance', statistics: { ambulance: 7 }, emergencies })).toBe(7);
    expect(getMobileRequestKpiValue({ id: 'all', statistics: { total: 0 }, emergencies })).toBe(0);
    expect(hasMobileRequestFilters({ search: '', status: ['accepted'], created_at: {} })).toBe(true);
    expect(hasMobileRequestFilters({ search: '', status: [], created_at: {} })).toBe(false);
  });

  it('normalizes detail-sheet values before presentation', () => {
    const detail = buildMobileRequestDetailModel({
      id: 'request-12345678',
      display_id: 'REQ-104',
      status: 'accepted',
      service_type: 'ambulance',
      patient_name: 'Ada Lovelace',
      patient_phone: '+1 555 0104',
      email: 'ada@example.com',
      hospital_name: 'General Hospital',
      latitude: 6.5244,
      longitude: 3.3792,
      payment_method: 'cash',
      payment_status: 'pending',
      total_cost: 120,
      responder_name: 'Unit 12',
      responder_vehicle_plate: 'LAG-104',
      responder_vehicle_type: 'advanced_life_support',
    });

    expect(detail).toMatchObject({
      name: 'Ada Lovelace',
      patientEmail: 'ada@example.com',
      facility: 'General Hospital',
      responder: 'Unit 12',
      displayId: 'REQ-104',
      isAmbulanceService: true,
      hasPayment: true,
      coordinates: { lat: 6.5244, lng: 3.3792 },
    });
    expect(detail.paymentParts).toEqual(['Cash owed', '120.00 USD', 'Pending']);
    expect(detail.vehicleParts).toEqual(['LAG-104', 'Advanced Life Support']);
  });
});
