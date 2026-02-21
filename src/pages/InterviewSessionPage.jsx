import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ErrorState from '../components/common/ErrorState';
import PageHeader from '../components/common/PageHeader';
import QuestionPanel from '../components/interview/QuestionPanel';
import RecordingControls from '../components/interview/RecordingControls';
import useInterviewSocket from '../hooks/useInterviewSocket';
import useRecorder from '../hooks/useRecorder';
import {
  endInterviewSession,
  fetchNextQuestion,
  submitAudioAnswer,
} from '../services/interviewService';
import { formatSeconds } from '../utils/helpers';

function InterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [socketRetry, setSocketRetry] = useState(0);
  const { status: wsStatus, error: wsError, send } = useInterviewSocket(sessionId, socketRetry);

  const {
    isRecording,
    duration,
    audioBlob,
    audioUrl,
    error: recorderError,
    permissionState,
    startRecording,
    stopRecording,
    clearRecording,
  } = useRecorder();

  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [questionError, setQuestionError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);

  const configSummary = useMemo(() => {
    const config = location.state?.config;
    if (!config) return '';
    return `${config.role} • ${config.difficulty} • ${config.interviewType}`;
  }, [location.state]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadQuestion = async (index) => {
    setLoadingQuestion(true);
    setQuestionError('');
    setProcessing(false);

    try {
      const next = await fetchNextQuestion(sessionId, index);
      if (!next) {
        setCompleted(true);
        setQuestion(null);
      } else {
        setQuestion(next);
        clearRecording();
      }
    } catch (err) {
      setQuestionError(err.message || 'Failed to fetch question');
    } finally {
      setLoadingQuestion(false);
    }
  };

  useEffect(() => {
    loadQuestion(0);
  }, [sessionId]);

  const handleRetrySocket = () => {
    setSocketRetry((value) => value + 1);
  };

  const handleSubmitAnswer = async () => {
    if (!audioBlob || !question) return;
    setProcessing(true);
    setQuestionError('');

    try {
      await submitAudioAnswer(sessionId, question.id, audioBlob);
    } catch (err) {
      setQuestionError(err.message || 'Failed to submit answer');
    } finally {
      setProcessing(false);
    }
  };

  const handleNextQuestion = async () => {
    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);
    send({ type: 'next_question', index: nextIndex });
    await loadQuestion(nextIndex);
  };

  const handleEndInterview = async () => {
    try {
      await endInterviewSession(sessionId);
    } finally {
      navigate(`/interview/results/${sessionId}`);
    }
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Realtime Interview"
        subtitle={configSummary || 'Answer each question verbally like a real interview'}
        actions={
          <button type="button" className="btn btn-danger" onClick={handleEndInterview}>
            End Interview
          </button>
        }
      />

      <section className="panel session-meta-grid">
        <p>
          Session Time: <strong>{formatSeconds(sessionSeconds)}</strong>
        </p>
        <p>
          WebSocket: <strong>{wsStatus}</strong>
        </p>
        <p>
          Mic Permission: <strong>{permissionState}</strong>
        </p>
      </section>

      {wsStatus === 'disconnected' ? (
        <ErrorState message={wsError || 'WebSocket disconnected'} onRetry={handleRetrySocket} />
      ) : null}

      {questionError ? <ErrorState message={questionError} onRetry={() => loadQuestion(questionIndex)} /> : null}
      {recorderError ? <ErrorState message={recorderError} /> : null}

      {loadingQuestion ? (
        <div className="panel">
          <p>Loading question...</p>
        </div>
      ) : completed ? (
        <div className="panel stack-md">
          <h3>All questions completed</h3>
          <p>Great work. End the interview to generate your evaluation report.</p>
          <button type="button" className="btn btn-success" onClick={handleEndInterview}>
            View Results
          </button>
        </div>
      ) : (
        <>
          <QuestionPanel question={question} index={questionIndex} />

          <RecordingControls
            isRecording={isRecording}
            duration={duration}
            audioUrl={audioUrl}
            onStart={startRecording}
            onStop={stopRecording}
            onClear={clearRecording}
            onSubmit={handleSubmitAnswer}
            submitting={processing}
            disabled={loadingQuestion || wsStatus !== 'connected'}
          />

          <section className="panel inline-row spread">
            <p>{processing ? 'Processing your answer...' : 'Ready for the next question once answer is submitted.'}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleNextQuestion}
              disabled={isRecording || processing || !audioBlob}
            >
              Next Question
            </button>
          </section>
        </>
      )}
    </div>
  );
}

export default InterviewSessionPage;
