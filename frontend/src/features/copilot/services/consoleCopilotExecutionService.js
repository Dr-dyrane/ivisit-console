import { validateCopilotCommand } from '../model/copilotContracts';
import { getCopilotCommand } from '../registry/copilotCommandRegistry';

const AUDIT_STORAGE_KEY = 'ivisit.console.copilot.audit.v1';
const MAX_AUDIT_RECEIPTS = 25;

const readAuditReceipts = (storage) => {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(AUDIT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(-MAX_AUDIT_RECEIPTS) : [];
  } catch {
    return [];
  }
};

const writeAuditReceipt = (storage, receipt) => {
  if (!storage) return;
  try {
    const next = [...readAuditReceipts(storage), receipt].slice(-MAX_AUDIT_RECEIPTS);
    storage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The workflow has already opened. A browser storage restriction must not
    // turn a successful, idempotent navigation into a false execution failure.
  }
};

export const executeCopilotCommand = async (command, {
  actionId,
  navigate,
  now = () => new Date(),
  storage = typeof window !== 'undefined' ? window.sessionStorage : null,
} = {}) => {
  const parsed = validateCopilotCommand(command);
  const registered = getCopilotCommand(parsed.id);

  if (!registered || registered.authority !== 'route-navigation' || registered.idempotent !== true) {
    throw new Error('This Copilot action is not available.');
  }
  if (typeof navigate !== 'function') {
    throw new Error('Navigation is unavailable.');
  }

  const receipt = {
    actionId,
    commandId: registered.id,
    destination: registered.destination,
    idempotencyKey: `copilot-navigation:${registered.id}`,
    completedAt: now().toISOString(),
  };

  navigate(registered.destination);
  writeAuditReceipt(storage, receipt);
  return receipt;
};

export const getCopilotAuditReceipts = (storage = typeof window !== 'undefined'
  ? window.sessionStorage
  : null) => readAuditReceipts(storage);
