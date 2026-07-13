import { sendWelcomeToSubscriber } from './emailCommands';
import { createSubscriber } from './unsupportedOperations';

export async function createSubscriberWithWelcome(input) {
  const subscriber = await createSubscriber(input);
  const result = await sendWelcomeToSubscriber(subscriber.id);
  return result.subscriber || subscriber;
}
