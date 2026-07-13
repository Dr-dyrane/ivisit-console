const matchesPanelPath = (currentPath, panelPath) => (
  currentPath === panelPath || currentPath.startsWith(`${panelPath}/`)
);

export const canAccessContextPanel = (currentPath, roles) => {
  const {
    admin,
    orgAdmin,
    patient,
    provider,
    sponsor,
    viewer,
  } = roles;
  const management = admin || orgAdmin;
  const operational = !patient && !viewer;
  const panelAccess = [
    ['/', true],
    ['/emergencies', operational],
    ['/users', management],
    ['/verification', management],
    ['/analytics', admin || orgAdmin || sponsor || provider],
    ['/doctors', management],
    ['/visits', provider || management],
    ['/hospitals', management],
    ['/ambulances', management],
    ['/health-news', !patient],
    ['/support-tickets', admin || orgAdmin || sponsor || provider],
    ['/insurance', admin],
    ['/map', operational],
    ['/settings', true],
    ['/subscriptions', admin],
    ['/wallet', management],
    ['/pricing', management],
    ['/organizations', admin],
  ];

  const match = panelAccess.find(([panelPath]) => matchesPanelPath(currentPath, panelPath));
  return match ? match[1] : true;
};
