'use client';

import React from 'react';
import { IslandNavigationView } from './island-navigation/IslandNavigationView';
import { useIslandNavigationController } from './island-navigation/useIslandNavigationController';

export const IslandNavigation = () => {
  const controller = useIslandNavigationController();

  return <IslandNavigationView {...controller} />;
};
