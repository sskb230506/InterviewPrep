import { WebSocketServer } from 'ws';

const sessionClients = new Map();

function getSessionClients(sessionId) {
  if (!sessionClients.has(sessionId)) {
    sessionClients.set(sessionId, new Set());
  }

  return sessionClients.get(sessionId);
}

function removeClient(sessionId, client) {
  const clients = sessionClients.get(sessionId);
  if (!clients) {
    return;
  }

  clients.delete(client);
  if (clients.size === 0) {
    sessionClients.delete(sessionId);
  }
}

export function broadcastInterviewEvent(sessionId, event) {
  const clients = sessionClients.get(sessionId);
  if (!clients?.size) {
    return;
  }

  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

export function registerWebSocketServer(httpServer) {
  const wsServer = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const path = requestUrl.pathname || '';

    if (!path.startsWith('/ws/interview/')) {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (client) => {
      wsServer.emit('connection', client, request);
    });
  });

  wsServer.on('connection', (client, request) => {
    const requestUrl = new URL(request.url, 'http://localhost');
    const sessionId = requestUrl.pathname.split('/').pop();
    const clients = getSessionClients(sessionId);
    clients.add(client);

    client.send(
      JSON.stringify({
        type: 'connected',
        payload: { sessionId },
      }),
    );

    client.on('message', (raw) => {
      let payload = null;

      try {
        payload = JSON.parse(raw.toString());
      } catch {
        client.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message payload' } }));
        return;
      }

      if (payload.type === 'next_question') {
        broadcastInterviewEvent(sessionId, {
          type: 'question_ready',
          payload: { index: Number(payload.index || 0) },
        });
      }
    });

    client.on('close', () => {
      removeClient(sessionId, client);
    });
  });

  return wsServer;
}
