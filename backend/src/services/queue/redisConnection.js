import IORedis from 'ioredis';
import { env } from '../../config/env.js';

const activeConnections = new Set();
let healthConnection;

function registerConnection(connection, name) {
  activeConnections.add(connection);

  connection.on('error', (error) => {
    console.error(`[redis:${name}]`, error.message);
  });

  connection.on('end', () => {
    activeConnections.delete(connection);
  });

  return connection;
}

export function createRedisConnection(name = 'redis-client') {
  return registerConnection(
    new IORedis(env.redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      connectionName: name,
    }),
    name,
  );
}

export function getRedisHealthConnection() {
  if (!healthConnection) {
    healthConnection = createRedisConnection('redis-health');
  }

  return healthConnection;
}

export function getRedisStatus() {
  if (env.evaluationMode !== 'redis') {
    return 'disabled';
  }

  return getRedisHealthConnection().status;
}

export async function closeRedisConnections() {
  const connections = [...activeConnections];

  await Promise.all(
    connections.map(async (connection) => {
      try {
        await connection.quit();
      } catch {
        connection.disconnect();
      }
    }),
  );

  activeConnections.clear();
  healthConnection = null;
}
