import React from 'react';
import { LayoutProvider } from '../contexts/LayoutContext';
import { MapProvider } from '../contexts/MapContext';
import { NavigationProvider } from '../contexts/NavigationContext';
import { PageDataProvider } from '../contexts/PageDataContext';
import { AppShell } from './AppShell';

export const AppLayout = ({ children }) => (
  <MapProvider>
    <PageDataProvider>
      <NavigationProvider>
        <LayoutProvider>
          <AppShell>
            {children}
          </AppShell>
        </LayoutProvider>
      </NavigationProvider>
    </PageDataProvider>
  </MapProvider>
);
