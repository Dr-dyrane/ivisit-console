import fs from 'fs';
import path from 'path';
import * as facade from './subscriptionService';
import { getSubscriptionAnalytics } from './subscriptions/analytics';
import { SUBSCRIPTION_PROJECTION_ERROR_MESSAGE } from './subscriptions/constants';
import {
  sendBulkEmail,
  sendCustomEmail,
  sendWelcomeEmail,
  sendWelcomeToSubscriber,
} from './subscriptions/emailCommands';
import { getSubscriptionsPage } from './subscriptions/pageQueries';
import {
  getSubscriber,
  getSubscriberByEmail,
  getSubscribers,
  getSubscribersForBulkEmail,
} from './subscriptions/reads';
import {
  subscribeToNewSubscribers,
  subscribeToSubscribers,
} from './subscriptions/realtime';
import {
  createSubscriber,
  deleteSubscriber,
  markWelcomeEmailSent,
  updateSubscriber,
  updateSubscriberStatus,
  updateSubscriberType,
} from './subscriptions/unsupportedOperations';
import { createSubscriberWithWelcome } from './subscriptions/workflows';

jest.mock('../lib/supabase', () => ({ supabase: {} }));
jest.mock('../lib/utils', () => ({ isValidUUID: jest.fn() }));
jest.mock('./authService', () => ({ getCurrentUser: jest.fn() }));

const expectedFacade = {
  SUBSCRIPTION_PROJECTION_ERROR_MESSAGE,
  createSubscriber,
  createSubscriberWithWelcome,
  deleteSubscriber,
  getSubscriber,
  getSubscriberByEmail,
  getSubscribers,
  getSubscribersForBulkEmail,
  getSubscriptionAnalytics,
  getSubscriptionsPage,
  markWelcomeEmailSent,
  sendBulkEmail,
  sendCustomEmail,
  sendWelcomeEmail,
  sendWelcomeToSubscriber,
  subscribeToNewSubscribers,
  subscribeToSubscribers,
  updateSubscriber,
  updateSubscriberStatus,
  updateSubscriberType,
};

const facadePath = 'src/services/subscriptionService.js';
const modulesDirectory = 'src/services/subscriptions';
const read = (filePath) => fs.readFileSync(filePath, 'utf8');
const productionModulePaths = () => fs
  .readdirSync(modulesDirectory)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .map((name) => path.join(modulesDirectory, name));

describe('subscription service modular boundary', () => {
  it('preserves the complete named export surface and direct binding identities', () => {
    expect(Object.keys(facade).sort()).toEqual(Object.keys(expectedFacade).sort());

    Object.entries(expectedFacade).forEach(([name, implementation]) => {
      expect(facade[name]).toBe(implementation);
    });
  });

  it('keeps the compatibility facade thin and every production module under 300 lines', () => {
    const modulePaths = productionModulePaths();

    expect(read(facadePath).split(/\r?\n/).length).toBeLessThanOrEqual(60);
    expect(modulePaths).toHaveLength(9);
    modulePaths.forEach((modulePath) => {
      expect(read(modulePath).split(/\r?\n/).length).toBeLessThanOrEqual(300);
    });
  });

  it('keeps Supabase and UI ownership out of the facade and service modules', () => {
    const facadeSource = read(facadePath);
    const implementationSource = productionModulePaths().map(read).join('\n');

    expect(facadeSource).not.toContain("from '../lib/supabase'");
    expect(facadeSource).not.toMatch(/export\s+(?:async\s+)?function/);
    expect(facadeSource).not.toMatch(/export\s+default/);
    expect(facadeSource).toContain("from './subscriptions/");
    expect(implementationSource).not.toMatch(
      /from ['"].*(?:contexts|hooks|components\/pages|components\/modals)/
    );
  });

  it('isolates unproved table operations and email receivers as compatibility inventory', () => {
    const unsupportedSource = read(path.join(modulesDirectory, 'unsupportedOperations.js'));
    const emailSource = read(path.join(modulesDirectory, 'emailCommands.js'));
    const workflowSource = read(path.join(modulesDirectory, 'workflows.js'));

    expect(unsupportedSource).toContain('Compatibility inventory only.');
    expect(unsupportedSource).toContain('.insert(');
    expect(unsupportedSource).toContain('.update(');
    expect(unsupportedSource).toContain('.delete()');
    expect(unsupportedSource).not.toContain('.functions.invoke(');

    expect(emailSource).toContain('compatibility inventory');
    expect(emailSource).toContain("functions.invoke('sendWelcome'");
    expect(emailSource).toContain("functions.invoke('sendCustomEmail'");
    expect(emailSource).toContain("functions.invoke('sendBulkEmail'");
    expect(emailSource).not.toContain('.insert(');
    expect(emailSource).not.toContain('.update(');
    expect(emailSource).not.toContain('.delete(');

    expect(workflowSource).not.toContain('supabase');
    expect(workflowSource).toContain('createSubscriber(input)');
    expect(workflowSource).toContain('sendWelcomeToSubscriber(subscriber.id)');
  });
});
