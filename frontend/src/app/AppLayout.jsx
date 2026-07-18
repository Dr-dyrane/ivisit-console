import React from 'react';
import { LayoutProvider } from '../contexts/LayoutContext';
import { MapProvider } from '../contexts/MapContext';
import { NavigationProvider } from '../contexts/NavigationContext';
import { PageDataProvider } from '../contexts/PageDataContext';
import { ConsoleCopilotProvider } from '../features/copilot';
import { AppShell } from './AppShell';

export const AppLayout = ({ children }) => (
  <MapProvider>
    <PageDataProvider>
      <NavigationProvider>
        <LayoutProvider>
          <ConsoleCopilotProvider>
            <AppShell>
              {children}
            </AppShell>
          </ConsoleCopilotProvider>
        </LayoutProvider>
      </NavigationProvider>
    </PageDataProvider>
  </MapProvider>
);
