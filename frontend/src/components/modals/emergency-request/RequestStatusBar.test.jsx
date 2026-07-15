import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { buildEmergencyLifecyclePresentation } from '../../pages/requests/emergencyLifecyclePresentation';
import { RequestStatusBar } from './RequestStatusBar';

describe('RequestStatusBar', () => {
  it('renders shared lifecycle evidence without exposing generic status controls', () => {
    const presentation = buildEmergencyLifecyclePresentation({
      id: 'request-1',
      status: 'in_progress',
      service_type: 'ambulance',
      current_responder_assignment_id: 'assignment-1',
      ambulance_id: 'ambulance-1',
    });
    const markup = renderToStaticMarkup(<RequestStatusBar presentation={presentation} />);

    expect(markup).toContain('aria-label="Request lifecycle"');
    expect(markup).toContain('aria-current="step"');
    expect(markup).toContain('Requested');
    expect(markup).toContain('Response');
    expect(markup).not.toContain('<button');
  });
});
