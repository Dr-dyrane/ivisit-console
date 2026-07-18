import { COPILOT_COMMAND_IDS, CopilotContractError } from './model/copilotContracts';
import {
  executeCopilotCommand,
  getCopilotAuditReceipts,
} from './services/consoleCopilotExecutionService';

const createStorage = () => {
  const values = new Map();
  return {
    getItem: jest.fn((key) => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value)),
  };
};

describe('Console Copilot limited executor', () => {
  it('opens an allowlisted idempotent workflow and stores a bounded receipt', async () => {
    const navigate = jest.fn();
    const storage = createStorage();
    const receipt = await executeCopilotCommand(
      { id: COPILOT_COMMAND_IDS.OPEN_SCHEDULES },
      {
        actionId: 'prepare.schedules',
        navigate,
        storage,
        now: () => new Date('2026-07-17T12:00:00.000Z'),
      },
    );

    expect(navigate).toHaveBeenCalledWith('/doctors?copilot=schedule');
    expect(receipt).toEqual({
      actionId: 'prepare.schedules',
      commandId: COPILOT_COMMAND_IDS.OPEN_SCHEDULES,
      destination: '/doctors?copilot=schedule',
      idempotencyKey: `copilot-navigation:${COPILOT_COMMAND_IDS.OPEN_SCHEDULES}`,
      completedAt: '2026-07-17T12:00:00.000Z',
    });
    expect(getCopilotAuditReceipts(storage)).toEqual([receipt]);
  });

  it('rejects arbitrary routes and data commands before navigation', async () => {
    const navigate = jest.fn();
    await expect(executeCopilotCommand(
      { id: 'workflow.open_anything', path: '/admin', payload: { verified: true } },
      { actionId: 'unsafe', navigate },
    )).rejects.toBeInstanceOf(CopilotContractError);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not report a successful navigation as failed when browser storage is unavailable', async () => {
    const navigate = jest.fn();
    const storage = {
      getItem: jest.fn(() => null),
      setItem: jest.fn(() => {
        throw new Error('Storage denied');
      }),
    };

    await expect(executeCopilotCommand(
      { id: COPILOT_COMMAND_IDS.OPEN_REQUESTS },
      { actionId: 'open.requests', navigate, storage },
    )).resolves.toMatchObject({
      commandId: COPILOT_COMMAND_IDS.OPEN_REQUESTS,
      destination: '/emergencies',
    });
    expect(navigate).toHaveBeenCalledWith('/emergencies');
  });
});
