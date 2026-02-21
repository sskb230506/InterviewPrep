const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:5000/ws';
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export function connectInterviewSocket(sessionId, handlers) {
  if (USE_MOCK) {
    const timeout = setTimeout(() => {
      handlers.onMessage?.({
        type: 'connected',
        payload: { sessionId },
      });
    }, 200);

    return {
      send: (rawPayload) => {
        let payload = rawPayload;
        if (typeof rawPayload === 'string') {
          try {
            payload = JSON.parse(rawPayload);
          } catch {
            payload = {};
          }
        }
        if (payload?.type === 'next_question') {
          setTimeout(() => {
            handlers.onMessage?.({
              type: 'question_ready',
              payload: { index: payload.index },
            });
          }, 250);
        }
      },
      close: () => {
        clearTimeout(timeout);
        handlers.onClose?.();
      },
    };
  }

  const ws = new WebSocket(`${WS_BASE_URL}/interview/${sessionId}`);

  ws.addEventListener('open', () => handlers.onOpen?.());
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      handlers.onMessage?.(data);
    } catch {
      handlers.onError?.(new Error('Invalid WebSocket payload'));
    }
  });
  ws.addEventListener('error', () => handlers.onError?.(new Error('WebSocket error')));
  ws.addEventListener('close', () => handlers.onClose?.());

  return ws;
}
