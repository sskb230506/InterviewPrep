import { env } from '../../config/env.js';
import { createRedisConnection } from '../queue/redisConnection.js';

const INTERVIEW_EVENTS_CHANNEL = 'interview-events';

let publisher;
let subscriber;

function getPublisher() {
  if (!publisher) {
    publisher = createRedisConnection('interview-events-publisher');
  }

  return publisher;
}

function getSubscriber() {
  if (!subscriber) {
    subscriber = createRedisConnection('interview-events-subscriber');
  }

  return subscriber;
}

export async function publishInterviewEvent(sessionId, type, payload = {}) {
  if (env.evaluationMode !== 'redis') {
    return;
  }

  await getPublisher().publish(
    INTERVIEW_EVENTS_CHANNEL,
    JSON.stringify({
      sessionId,
      type,
      payload,
      emittedAt: new Date().toISOString(),
    }),
  );
}

export async function subscribeToInterviewEvents(onEvent) {
  if (env.evaluationMode !== 'redis') {
    return async () => {};
  }

  const connection = getSubscriber();
  await connection.subscribe(INTERVIEW_EVENTS_CHANNEL);

  const listener = (channel, rawMessage) => {
    if (channel !== INTERVIEW_EVENTS_CHANNEL) {
      return;
    }

    try {
      onEvent(JSON.parse(rawMessage));
    } catch (error) {
      console.error('Failed to parse interview event', error);
    }
  };

  connection.on('message', listener);

  return async () => {
    connection.off('message', listener);
    await connection.unsubscribe(INTERVIEW_EVENTS_CHANNEL);
  };
}
