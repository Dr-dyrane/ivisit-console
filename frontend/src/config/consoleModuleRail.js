import {
  Activity,
  Ambulance,
  BarChart3,
  HelpCircle,
  MapPin,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';

export const consoleModuleRailItems = {
  today: { id: 'today', icon: Activity, label: 'Today', path: '/' },
  requests: { id: 'requests', icon: Ambulance, label: 'Requests', path: '/emergencies' },
  staff: { id: 'staff', icon: Users, label: 'Staff', path: '/doctors' },
  payments: { id: 'payments', icon: Wallet, label: 'Payments', path: '/wallet' },
  help: { id: 'help', icon: HelpCircle, label: 'Help', path: '/support-tickets' },
  map: { id: 'map', icon: MapPin, label: 'Live Map', path: '/map' },
  settings: { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  statistics: { id: 'statistics', icon: BarChart3, label: 'Statistics', path: '/analytics' },
};

export const consoleModuleRailSlots = {
  admin: ['today', 'requests', 'staff', 'payments', 'help'],
  org_admin: ['today', 'requests', 'staff', 'payments', 'help'],
  dispatcher: ['today', 'requests', 'map', 'settings'],
  provider: ['today', 'requests', 'help'],
  driver: ['today', 'requests', 'help'],
  sponsor: ['today', 'statistics'],
  viewer: ['today'],
};

export function getConsoleModuleRailItems(roleKind = 'viewer') {
  const slots = consoleModuleRailSlots[roleKind] || consoleModuleRailSlots.viewer;
  return slots.map((slot) => consoleModuleRailItems[slot]);
}
