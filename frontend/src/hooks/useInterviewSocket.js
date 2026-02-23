import { useEffect, useRef, useState } from 'react';
import { connectInterviewSocket } from '../services/websocketService';

export default function useInterviewSocket(sessionId, reconnectTrigger = 0) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    setStatus('connecting');
    setError('');

    const socket = connectInterviewSocket(sessionId, {
      onOpen: () => setStatus('connected'),
      onMessage: (payload) => {
        setLastMessage(payload);
        if (payload?.type === 'connected') {
          setStatus('connected');
        }
      },
      onError: (err) => {
        setError(err.message || 'WebSocket connection error');
        setStatus('disconnected');
      },
      onClose: () => {
        setStatus('disconnected');
      },
    });

    socketRef.current = socket;

    return () => {
      socket.close?.();
      socketRef.current = null;
    };
  }, [sessionId, reconnectTrigger]);

  const send = (payload) => {
    const socket = socketRef.current;
    if (!socket) return;

    try {
      const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
      socket.send?.(data);
    } catch {
      setError('Unable to send WebSocket message');
      setStatus('disconnected');
    }
  };

  return {
    status,
    lastMessage,
    error,
    send,
  };
}
