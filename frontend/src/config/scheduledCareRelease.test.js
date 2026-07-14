const ENV_KEYS = [
  'REACT_APP_ENABLE_CONSOLE_SCHEDULE_READS_V1',
  'REACT_APP_ENABLE_CONSOLE_SCHEDULE_WRITES_V1',
  'REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_READS_V1',
  'REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_ACTIONS_V1',
];

const readRelease = () => {
  let release;
  jest.isolateModules(() => {
    release = require('./scheduledCareRelease').scheduledCareRelease;
  });
  return release;
};

describe('scheduled care release gates', () => {
  const original = {};

  beforeAll(() => {
    ENV_KEYS.forEach((key) => {
      original[key] = process.env[key];
    });
  });

  afterEach(() => {
    ENV_KEYS.forEach((key) => delete process.env[key]);
    jest.resetModules();
  });

  afterAll(() => {
    ENV_KEYS.forEach((key) => {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    });
  });

  it('defaults every promoted gate to true', () => {
    ENV_KEYS.forEach((key) => delete process.env[key]);
    expect(readRelease()).toEqual({
      scheduleReads: true,
      scheduleWrites: true,
      scheduledVisitReads: true,
      scheduledVisitActions: true,
    });
  });

  it.each([
    ['REACT_APP_ENABLE_CONSOLE_SCHEDULE_READS_V1', 'scheduleReads'],
    ['REACT_APP_ENABLE_CONSOLE_SCHEDULE_WRITES_V1', 'scheduleWrites'],
    ['REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_READS_V1', 'scheduledVisitReads'],
    ['REACT_APP_ENABLE_CONSOLE_SCHEDULED_VISIT_ACTIONS_V1', 'scheduledVisitActions'],
  ])('lets explicit false disable only %s', (environmentKey, releaseKey) => {
    ENV_KEYS.forEach((key) => delete process.env[key]);
    process.env[environmentKey] = 'false';

    expect(readRelease()).toEqual({
      scheduleReads: releaseKey !== 'scheduleReads',
      scheduleWrites: releaseKey !== 'scheduleWrites',
      scheduledVisitReads: releaseKey !== 'scheduledVisitReads',
      scheduledVisitActions: releaseKey !== 'scheduledVisitActions',
    });
  });

  it('fails closed for malformed values', () => {
    process.env.REACT_APP_ENABLE_CONSOLE_SCHEDULE_READS_V1 = 'yes';
    expect(readRelease().scheduleReads).toBe(false);
  });
});
