import { WebSocketServer } from 'ws';

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
        client.send(
          JSON.stringify({
            type: 'question_ready',
            payload: { index: Number(payload.index || 0) },
          }),
        );
      }
    });
  });

  return wsServer;
}
