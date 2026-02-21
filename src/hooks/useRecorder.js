import { useEffect, useMemo, useRef, useState } from 'react';

export default function useRecorder() {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const [permissionState, setPermissionState] = useState('unknown');
  const [audioBlob, setAudioBlob] = useState(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const startTimer = () => {
    intervalRef.current = setInterval(() => {
      setDuration((value) => value + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionState('granted');
      streamRef.current = stream;
      return stream;
    } catch {
      setPermissionState('denied');
      setError('Microphone permission denied. Please allow microphone access to continue.');
      return null;
    }
  };

  const pickMimeType = () => {
    const candidates = [
      'audio/wav',
      'audio/mpeg',
      'audio/webm;codecs=opus',
      'audio/webm',
    ];
    if (!window.MediaRecorder?.isTypeSupported) {
      return '';
    }
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
  };

  const startRecording = async () => {
    setError('');
    setAudioBlob(null);
    setDuration(0);

    const stream = streamRef.current || (await requestPermission());
    if (!stream) return;

    chunksRef.current = [];

    try {
      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
      };

      recorder.start();
      setIsRecording(true);
      startTimer();
    } catch {
      setError('Unable to start recording. Your browser may not support MediaRecorder.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      return;
    }

    recorder.stop();
    setIsRecording(false);
    stopTimer();
  };

  const clearRecording = () => {
    setAudioBlob(null);
    setDuration(0);
    setError('');
  };

  const audioUrl = useMemo(() => {
    if (!audioBlob) return '';
    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    permissionState,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
