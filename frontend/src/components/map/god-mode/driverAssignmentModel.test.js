import {
  buildDriverDirectionsUrl,
  getDriverDestination,
  getDriverNextAction,
  getDriverUnitLabel,
  selectCurrentDriverAssignment,
} from './driverAssignmentModel';

describe('driverAssignmentModel', () => {
  it('moves the driver through the supported lifecycle one next action at a time', () => {
    expect(getDriverNextAction('offered')).toEqual(expect.objectContaining({
      action: 'accept',
      label: 'Accept call',
    }));
    expect(getDriverNextAction('accepted')).toEqual(expect.objectContaining({
      action: 'arrive',
      label: 'Mark arrived',
    }));
    expect(getDriverNextAction('arrived')).toEqual(expect.objectContaining({
      action: 'complete',
      requiresConfirmation: true,
    }));
    expect(getDriverNextAction('completed')).toBeNull();
  });

  it('guards acceptance until live telemetry is proven', () => {
    expect(getDriverNextAction('offered', { guarded: true })).toEqual(expect.objectContaining({
      action: null,
      disabled: true,
      label: 'Checking location',
    }));
    expect(getDriverNextAction('offered', {
      guarded: true,
      telemetryState: 'lost',
    })).toEqual(expect.objectContaining({
      action: 'restore_location',
      label: 'Restore location',
    }));
    expect(getDriverNextAction('offered', {
      guarded: true,
      telemetryState: 'live',
    })).toEqual(expect.objectContaining({
      action: 'accept',
      label: 'Accept call',
    }));
  });

  it('guards completion until patient acknowledgement is confirmed', () => {
    expect(getDriverNextAction('arrived', {
      guarded: true,
      patientAcknowledgementState: 'pending',
    })).toEqual(expect.objectContaining({
      action: null,
      disabled: true,
      label: 'Waiting for patient',
    }));
    expect(getDriverNextAction('arrived', {
      guarded: true,
      patientAcknowledgementState: 'unavailable',
    })).toEqual(expect.objectContaining({
      action: null,
      label: 'Confirmation unavailable',
    }));
    expect(getDriverNextAction('arrived', {
      guarded: true,
      patientAcknowledgementState: 'confirmed',
    })).toEqual(expect.objectContaining({
      action: 'complete',
      requiresConfirmation: true,
    }));
  });

  it('routes to pickup before arrival and to the assigned hospital after arrival', () => {
    const emergency = {
      id: 'request-1',
      hospital_id: 'hospital-1',
      patient_location: { lat: 6.5, lng: 3.4 },
      assignment_status: 'accepted',
    };
    const hospitals = [{ id: 'hospital-1', name: 'General Hospital', lat: 6.6, lng: 3.5 }];

    expect(getDriverDestination({ emergency, hospitals })).toEqual(expect.objectContaining({
      coordinates: { lat: 6.5, lng: 3.4 },
      kind: 'pickup',
    }));
    expect(getDriverDestination({ emergency: { ...emergency, assignment_status: 'arrived' }, hospitals })).toEqual(expect.objectContaining({
      coordinates: { lat: 6.6, lng: 3.5 },
      kind: 'hospital',
    }));
  });

  it('uses the request destination when the scoped hospital projection is incomplete', () => {
    const destination = getDriverDestination({
      emergency: {
        id: 'request-2',
        assignment_status: 'arrived',
        hospital_name: 'Recorded Hospital',
        destination_location: { coordinates: [3.51, 6.61] },
      },
      hospitals: [],
    });

    expect(destination).toEqual(expect.objectContaining({
      coordinates: { lat: 6.61, lng: 3.51 },
      kind: 'hospital',
      label: 'Recorded Hospital',
    }));
  });

  it('builds a canonical driving deep link only for usable coordinates', () => {
    expect(buildDriverDirectionsUrl({ lat: 6.5, lng: 3.4 }))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=6.5%2C3.4&travelmode=driving');
    expect(buildDriverDirectionsUrl(null)).toBeNull();
  });

  it('derives the unit label from the assigned ambulance before request fallbacks', () => {
    expect(getDriverUnitLabel({
      ambulance: { call_sign: 'MED-12' },
      emergency: { ambulance_id: '00000000-0000-0000-0000-ambulance44' },
    })).toBe('MED-12');
    expect(getDriverUnitLabel({ emergency: { ambulance_id: '00000000-0000-0000-0000-ambulance44' } }))
      .toBe('Unit ance44');
    expect(getDriverUnitLabel()).toBeNull();
  });

  it('selects backend-active assignments before unaccepted offers', () => {
    expect(selectCurrentDriverAssignment([
      { assignment_id: 'offer-2', assignment_status: 'offered', offered_at: '2026-07-14T10:02:00Z' },
      { assignment_id: 'active-1', assignment_status: 'accepted', offered_at: '2026-07-14T10:00:00Z' },
    ])).toEqual(expect.objectContaining({ assignment_id: 'active-1' }));
  });
});
