import { COPILOT_COMMAND_IDS } from '../model/copilotContracts';

export const COPILOT_COMMAND_REGISTRY = Object.freeze({
  [COPILOT_COMMAND_IDS.OPEN_REQUESTS]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_REQUESTS,
    label: 'Open requests',
    destination: '/emergencies',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_LIVE_MAP]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_LIVE_MAP,
    label: 'Open live map',
    destination: '/map',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_APPROVALS]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_APPROVALS,
    label: 'Open approvals',
    destination: '/verification',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_ORGANIZATIONS]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_ORGANIZATIONS,
    label: 'Open organizations',
    destination: '/organizations',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_FACILITIES]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_FACILITIES,
    label: 'Open facilities',
    destination: '/hospitals',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_PROVIDERS]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_PROVIDERS,
    label: 'Open providers',
    destination: '/users?role=provider',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_STAFF]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_STAFF,
    label: 'Open staff',
    destination: '/doctors',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_SCHEDULES]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_SCHEDULES,
    label: 'Open schedules',
    destination: '/doctors?copilot=schedule',
    authority: 'route-navigation',
    idempotent: true,
  }),
  [COPILOT_COMMAND_IDS.OPEN_FINANCE]: Object.freeze({
    id: COPILOT_COMMAND_IDS.OPEN_FINANCE,
    label: 'Open Finance',
    destination: '/wallet',
    authority: 'route-navigation',
    idempotent: true,
  }),
});

export const getCopilotCommand = (commandId) => COPILOT_COMMAND_REGISTRY[commandId] || null;
