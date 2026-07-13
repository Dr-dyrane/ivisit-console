import fs from 'fs';
import path from 'path';

const read = (file) => fs.readFileSync(file, 'utf8');

export const readProductionTree = (directory) => {
  if (!fs.existsSync(directory)) return '';

  return fs.readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return readProductionTree(target);
      if (!/\.(?:js|jsx|ts|tsx)$/.test(entry.name)) return '';
      if (/\.(?:test|spec)\.(?:js|jsx|ts|tsx)$/.test(entry.name)) return '';
      return read(target);
    })
    .filter(Boolean)
    .join('\n');
};

export const readSourceEstate = ({ files = [], directories = [] }) => [
  ...files.map(read),
  ...directories.map(readProductionTree),
].filter(Boolean).join('\n');

export const readAppImplementation = () => readSourceEstate({
  files: ['src/App.js'],
  directories: ['src/app'],
});

export const readPageDataImplementation = () => readSourceEstate({
  files: ['src/contexts/PageDataContext.jsx'],
  directories: ['src/contexts/page-data'],
});

export const readAuthImplementation = () => readSourceEstate({
  files: ['src/contexts/AuthContext.jsx'],
  directories: ['src/contexts/auth'],
});

export const readLoginImplementation = () => readSourceEstate({
  files: ['src/components/pages/LoginPage.jsx'],
  directories: ['src/components/pages/login'],
});

export const readAnalyticsModalImplementation = () => readSourceEstate({
  files: ['src/components/modals/AnalyticsModal.jsx'],
  directories: ['src/components/modals/analytics'],
});

export const readAnalyticsServiceImplementation = () => readSourceEstate({
  files: ['src/services/analyticsService.js'],
  directories: ['src/services/analytics'],
});

export const readIslandNavigationImplementation = () => readSourceEstate({
  files: ['src/components/common/IslandNavigation.jsx'],
  directories: ['src/components/common/island-navigation'],
});
