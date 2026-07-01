import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  endInterviewSession,
  fetchNextQuestion,
  submitAudioAnswer,
} from '../services/interviewService';
import { apiRequest } from '../services/apiClient';

const C = {
  navy: '#1A4872', navyGhost: 'rgba(26,72,114,0.35)', navyMuted: '#2e6b9a',
  teal: '#52B788', tealDark: '#3d9a6e',
  tealLight: 'rgba(82,183,136,0.12)', tealBorder: 'rgba(82,183,136,0.35)',
  steelLight: 'rgba(46,125,166,0.10)',
  border: 'rgba(26,72,114,0.13)',
  red: '#c0392b', redLight: 'rgba(192,57,43,0.09)',
  green: '#27ae60',
  yellow: '#d4860a', yellowLight: 'rgba(212,134,10,0.10)',
  surfaceAlt: '#f8fdfb', card: '#ffffff',
};

// Poll /review until this questionId is 'completed' or 'failed'
async function pollResult(sessionId, questionId, maxTries = 20, delayMs = 1500) {
  for (let i = 0; i < maxTries; i++) {
    // First attempt is immediate (inline mode finishes before HTTP response returns)
    if (i > 0) await new Promise(r => setTimeout(r, delayMs));
    try {
      const data = await apiRequest(`/interview/session/${sessionId}/review`);
      const q = data?.perQuestion?.find(p => p.id === questionId);
      if (q && (q.status === 'completed' || q.status === 'failed')) return q;
    } catch { /* keep polling */ }
  }
  return null;
}

function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [seconds, setSeconds] = useState(0);
  const mr = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mr.current = new MediaRecorder(stream);
      chunks.current = [];
      mr.current.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data); };
      mr.current.onstop = () => {
        setAudioBlob(new Blob(chunks.current, { type: 'audio/webm' }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.current.start();
      setIsRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch { alert('Microphone access denied. Please allow mic access and try again.'); }
  };

  const stop = () => {
    if (mr.current && isRecording) {
      mr.current.stop();
      setIsRecording(false);
      clearInterval(timer.current);
    }
  };

  const clear = () => { setAudioBlob(null); setSeconds(0); };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return { isRecording, audioBlob, seconds, fmt, start, stop, clear };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ label, value }) {
  const color = value >= 70 ? C.teal : value >= 45 ? C.yellow : C.red;
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.navyGhost }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>{value}<span style={{ fontSize: 10, color: C.navyGhost }}>/100</span></span>
      </div>
      <div style={{ height: 6, borderRadius: 99, backgroundColor: C.steelLight, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, borderRadius: 99, backgroundColor: color, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function FeedbackPanel({ result, onNext, onEnd, questionIndex, totalQ }) {
  const { scores, transcript, feedback, betterAnswer, status } = result;
  const noAudio = !scores || (scores.technical === 0 && scores.clarity === 0 && scores.confidence === 0);
  const avg = noAudio ? null : Math.round((scores.technical + scores.clarity + scores.confidence) / 3);
  const grade = avg === null ? null : avg >= 80 ? 'Excellent' : avg >= 60 ? 'Good' : avg >= 40 ? 'Fair' : 'Needs Work';
  const isLast = questionIndex + 1 >= totalQ;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, backgroundColor: noAudio ? C.yellowLight : C.tealLight, color: noAudio ? C.yellow : C.tealDark, border: `1px solid ${noAudio ? 'rgba(212,134,10,0.25)' : C.tealBorder}` }}>
            {noAudio ? '⚠ No Speech Detected' : '✓ Answer Evaluated'}
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.navy }}>
            {noAudio ? 'No Response Captured' : 'Your Feedback'}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.navyGhost }}>Question {questionIndex + 1} of {totalQ}</p>
        </div>
        {avg !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.navy, lineHeight: 1 }}>{avg}<span style={{ fontSize: 16, color: C.navyGhost }}>/100</span></div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.tealDark, marginTop: 2 }}>{grade}</div>
          </div>
        )}
      </div>

      {/* Scores */}
      {!noAudio && (
        <div style={{ borderRadius: 14, padding: 18, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <ScoreBar label="Technical" value={scores.technical} />
          <ScoreBar label="Clarity" value={scores.clarity} />
          <ScoreBar label="Confidence" value={scores.confidence} />
        </div>
      )}

      {/* What you said */}
      {transcript && !transcript.startsWith('[No speech') && !transcript.startsWith('[Transcription') && (
        <div style={{ borderRadius: 14, padding: 18, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.navyMuted }}>
            🎙 What You Said
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, fontStyle: 'italic', color: '#2c2c2c' }}>"{transcript}"</p>
        </div>
      )}

      {/* AI Coaching feedback */}
      {feedback?.length > 0 && (
        <div style={{ borderRadius: 14, padding: 18, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.tealDark }}>
            💬 AI Coaching
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {feedback.map((b, i) => (
              <li key={i} style={{ fontSize: 14, lineHeight: 1.65, color: '#1a1a1a', fontWeight: 500 }}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Model answer */}
      {betterAnswer && (
        <div style={{ borderRadius: 14, padding: 18, backgroundColor: '#f0fdf4', border: '1px solid rgba(39,174,96,0.22)' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.green }}>
            ✨ What a Strong Answer Looks Like
          </p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: '#1a1a1a', fontWeight: 500 }}>{betterAnswer}</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 4 }}>
        <button onClick={onEnd} style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.navyMuted, cursor: 'pointer' }}>
          End Interview
        </button>
        <button onClick={onNext} style={{ padding: '10px 28px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>
          {isLast ? 'Finish & See Results →' : 'Next Question →'}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TOTAL_QUESTIONS = 5;

function InterviewSessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const config = location.state?.config || {};
  const { isRecording, audioBlob, seconds, fmt, start, stop, clear } = useRecorder();

  const [questionIndex, setQuestionIndex] = useState(0);
  const [question, setQuestion] = useState(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [statusMsg, setStatusMsg] = useState('Loading your first question...');
  const [feedback, setFeedback] = useState(null);   // per-question result
  const [submitting, setSubmitting] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const loadQuestion = async (index) => {
    setLoadingQ(true);
    setFeedback(null);
    clear();
    setStatusMsg('Generating your next question...');
    try {
      const q = await fetchNextQuestion(sessionId, index);
      if (!q) { setSessionDone(true); }
      else { setQuestion(q); }
    } catch (e) {
      setStatusMsg('Failed to load question — ' + e.message);
    } finally {
      setLoadingQ(false);
    }
  };

  useEffect(() => { loadQuestion(0); }, [sessionId]);

  const handleSubmit = async () => {
    if (!audioBlob || !question) return;
    setSubmitting(true);
    setStatusMsg('Uploading and transcribing your answer...');
    try {
      await submitAudioAnswer(sessionId, question.id, audioBlob);
      setStatusMsg('Evaluating with AI...');
      const result = await pollResult(sessionId, question.id);
      if (result) {
        setFeedback(result);
      } else {
        setFeedback({
          id: question.id, status: 'timeout',
          transcript: '',
          feedback: ['Evaluation is taking longer than usual. Your answer was saved — check the full review after the session.'],
          betterAnswer: '', scores: null,
        });
      }
    } catch (e) {
      alert('Submit failed: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    const next = questionIndex + 1;
    if (next >= TOTAL_QUESTIONS) {
      await handleEnd();
    } else {
      setQuestionIndex(next);
      await loadQuestion(next);
    }
  };

  const handleEnd = async () => {
    try { await endInterviewSession(sessionId); } catch { /* ignore */ }
    navigate(`/interview/results/${sessionId}`);
  };

  const configLabel = [config.role, config.difficulty, config.interviewType].filter(Boolean).join(' • ');

  // Loading spinner
  if (loadingQ || submitting) {
    return (
      <div style={{ minHeight: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: "'Inter',sans-serif" }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', border: `3px solid ${C.tealBorder}`, borderTopColor: C.teal, animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: C.navyMuted, textAlign: 'center', maxWidth: 300 }}>{statusMsg}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // All done
  if (sessionDone) {
    return (
      <div style={{ maxWidth: 500, margin: '60px auto', textAlign: 'center', fontFamily: "'Inter',sans-serif" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: C.navy, fontWeight: 800, marginBottom: 8 }}>Interview Complete!</h2>
        <p style={{ color: C.navyGhost, marginBottom: 24 }}>All questions answered. Ready to see your results?</p>
        <button onClick={handleEnd} style={{ padding: '12px 32px', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, color: '#fff', cursor: 'pointer' }}>
          View Full Results →
        </button>
      </div>
    );
  }

  // Feedback view (after submit)
  if (feedback) {
    return (
      <div style={{ padding: '8px 0' }}>
        <FeedbackPanel result={feedback} onNext={handleNext} onEnd={handleEnd} questionIndex={questionIndex} totalQ={TOTAL_QUESTIONS} />
      </div>
    );
  }

  // Question + recording view
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Session info bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderRadius: 12, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, fontSize: 12, fontWeight: 600, color: C.navyGhost }}>
        <span>{configLabel || 'Interview Session'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>Question <strong style={{ color: C.navy }}>{questionIndex + 1}</strong> / {TOTAL_QUESTIONS}</span>
          <button onClick={handleEnd} style={{ fontSize: 11, fontWeight: 700, color: C.red, background: 'none', border: `1px solid rgba(192,57,43,0.3)`, borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}>End Interview</button>
        </div>
      </div>

      {/* Question card */}
      <div style={{ borderRadius: 20, padding: '36px 40px', backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(26,72,114,0.04)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: `linear-gradient(${C.steelLight} 1px,transparent 1px),linear-gradient(90deg,${C.steelLight} 1px,transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ marginBottom: 20, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.navyGhost, padding: '4px 12px', borderRadius: 999, border: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt }}>
            {question?.type || 'Interview'} Question
          </div>
          <blockquote style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.55, color: C.navy, maxWidth: 580 }}>
            "{question?.text}"
          </blockquote>
          {question?.hint && (
            <p style={{ marginTop: 14, fontSize: 12, color: C.navyGhost, fontStyle: 'italic' }}>Hint: {question.hint}</p>
          )}
        </div>
      </div>

      {/* Recording panel */}
      <div style={{ borderRadius: 20, padding: 24, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>

          {isRecording ? (
            <>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: C.redLight, border: '2px solid rgba(192,57,43,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.4s ease-in-out infinite' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width={18} height={18} fill="white" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10H7z"/></svg>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.red, animation: 'pulse 1s ease-in-out infinite', display: 'inline-block' }} />
                <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: C.navy }}>{fmt(seconds)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.red }}>Recording</span>
              </div>
              <button onClick={stop} style={{ padding: '10px 24px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.navyMuted, cursor: 'pointer' }}>
                ⏹ Stop Recording
              </button>
            </>
          ) : audioBlob ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.tealDark }}>🎙</div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.navy }}>Recording ready — {fmt(seconds)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.navyGhost }}>Listen back, then submit when ready</p>
                </div>
                <button onClick={clear} style={{ fontSize: 11, fontWeight: 700, color: C.navyGhost, background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Retake</button>
              </div>
              <audio src={URL.createObjectURL(audioBlob)} controls style={{ width: '100%', height: 40, opacity: 0.8 }} />
              <button onClick={handleSubmit} style={{ width: '100%', padding: '13px 0', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>
                Submit Answer & Get Feedback →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                onClick={start}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: C.card, border: `2px solid ${C.tealBorder}`, color: C.teal, cursor: 'pointer', transition: 'transform 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width={32} height={32} fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10H7z"/></svg>
              </button>
              <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: C.navyGhost }}>Click to start recording</p>
              <p style={{ fontSize: 12, color: C.navyGhost, textAlign: 'center', maxWidth: 340 }}>Speak your answer clearly. You can listen back before submitting.</p>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.7;transform:scale(1.03)}}`}</style>
    </div>
  );
}

export default InterviewSessionPage;
