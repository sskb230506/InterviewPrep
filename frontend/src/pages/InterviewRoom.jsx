import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050/api';

const C = {
    navy: '#1A4872', navyLight: '#2e5f8a', navyMuted: '#2e6b9a',
    navyFaint: 'rgba(26,72,114,0.55)', navyGhost: 'rgba(26,72,114,0.35)',
    teal: '#52B788', tealDark: '#3d9a6e',
    tealLight: 'rgba(82,183,136,0.12)', tealBorder: 'rgba(82,183,136,0.35)',
    steel: '#2E7DA6', steelLight: 'rgba(46,125,166,0.10)', steelBorder: 'rgba(46,125,166,0.30)',
    bg: '#f0f9f4', card: '#ffffff',
    surface: '#ffffff', surfaceAlt: '#f8fdfb',
    border: 'rgba(26,72,114,0.13)',
    red: '#c0392b', redLight: 'rgba(192,57,43,0.09)',
    green: '#27ae60', greenLight: 'rgba(39,174,96,0.10)',
    yellow: '#d4860a', yellowLight: 'rgba(212,134,10,0.10)',
    orange: '#d4600a', orangeLight: 'rgba(212,96,10,0.10)',
};

function authHeader() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, opts = {}) {
    const res = await fetch(`${BASE}${path}`, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...authHeader(), ...(opts.headers || {}) },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API ${res.status}: ${text}`);
    }
    return res.json();
}

// Poll until the answer status is 'completed' or 'failed' (max ~30s)
async function pollForResult(sessionId, questionId, maxAttempts = 15, delayMs = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, delayMs));
        const data = await apiFetch(`/interview/session/${sessionId}/review`);
        const q = data.perQuestion?.find(p => p.id === questionId);
        if (q && (q.status === 'completed' || q.status === 'failed')) return q;
    }
    return null;
}

export default function InterviewRoom() {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [questionIndex, setQuestionIndex] = useState(0);
    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('Loading your first question...');

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const timerRef = useRef(null);

    // Per-question feedback shown immediately after submit
    const [feedback, setFeedback] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchQuestion = useCallback(async (index) => {
        setLoading(true);
        setFeedback(null);
        setAudioBlob(null);
        setRecordingSeconds(0);
        setStatusText('AI is generating your next question...');
        try {
            const data = await apiFetch(`/interview/session/${sessionId}/question?index=${index}`);
            if (!data) {
                // No more questions — go to results
                await apiFetch(`/interview/session/${sessionId}/end`, { method: 'POST' });
                navigate(`/interview/session/${sessionId}/results`);
                return;
            }
            setQuestion(data);
        } catch (err) {
            console.error(err);
            setStatusText('Failed to load question. Please refresh.');
        } finally {
            setLoading(false);
        }
    }, [sessionId, navigate]);

    useEffect(() => { fetchQuestion(0); }, [fetchQuestion]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch (err) {
            alert('Please allow microphone access to answer the question.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const submitAnswer = async () => {
        if (!audioBlob || !question) return;
        setSubmitting(true);
        setStatusText('Uploading and transcribing your answer...');

        const questionId = question.id;

        try {
            const formData = new FormData();
            formData.append('audio', new File([audioBlob], `${questionId}.webm`, { type: 'audio/webm' }));
            formData.append('questionId', questionId);

            // Submit the audio
            const submitRes = await fetch(`${BASE}/interview/session/${sessionId}/answer`, {
                method: 'POST',
                headers: authHeader(),
                body: formData,
            });
            if (!submitRes.ok) {
                const t = await submitRes.text();
                throw new Error(`Submit failed: ${t}`);
            }

            setStatusText('Evaluating your answer with AI...');

            // Since EVALUATION_MODE=inline, the result should be ready quickly.
            // Poll the review endpoint until this question is done.
            const result = await pollForResult(sessionId, questionId);

            if (!result) {
                setFeedback({
                    status: 'timeout',
                    question: question.text,
                    transcript: 'Evaluation is still processing.',
                    feedback: ['Your answer was received. Results will appear in the session review.'],
                    betterAnswer: '',
                    scores: null,
                });
            } else {
                setFeedback(result);
            }
        } catch (err) {
            console.error(err);
            alert(`Failed to submit answer: ${err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNextQuestion = () => {
        const nextIndex = questionIndex + 1;
        setQuestionIndex(nextIndex);
        fetchQuestion(nextIndex);
    };

    const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // ── Loading spinner ───────────────────────────────────────────────────────
    if (loading || submitting) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.tealBorder}`, borderTopColor: C.teal, animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: C.navyMuted, fontWeight: 600, fontSize: 14, textAlign: 'center', maxWidth: 320 }}>{statusText}</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // ── Per-question feedback panel ───────────────────────────────────────────
    if (feedback) {
        const { scores, transcript, feedback: bullets, betterAnswer, noAudioDetected, status } = feedback;
        const hasScores = scores && (scores.technical > 0 || scores.clarity > 0 || scores.confidence > 0);
        const avgScore = hasScores
            ? ((scores.technical + scores.clarity + scores.confidence) / 3 / 10).toFixed(1)
            : null;
        const grade = avgScore >= 8 ? 'Excellent' : avgScore >= 6 ? 'Good' : avgScore >= 4 ? 'Fair' : avgScore !== null ? 'Needs Work' : null;

        return (
            <div style={{ maxWidth: 720, margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
                {/* Header badge */}
                <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, backgroundColor: noAudioDetected ? C.yellowLight : C.tealLight, color: noAudioDetected ? C.yellow : C.tealDark, border: `1px solid ${noAudioDetected ? 'rgba(212,134,10,0.25)' : C.tealBorder}` }}>
                        {noAudioDetected ? '⚠ No Audio Detected' : '✓ Answer Evaluated'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: 22, fontWeight: 800, color: C.navy, margin: 0 }}>
                                {noAudioDetected ? 'No Response Recorded' : 'Evaluation Results'}
                            </h2>
                            <p style={{ fontSize: 13, color: C.navyGhost, marginTop: 4, fontWeight: 500 }}>
                                {noAudioDetected ? 'Your recording had no detectable speech.' : 'AI analysis of your spoken answer.'}
                            </p>
                        </div>
                        {avgScore !== null && (
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 32, fontWeight: 800, color: C.navy }}>{avgScore}<span style={{ fontSize: 16, color: C.navyGhost }}>/10</span></div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.tealDark }}>{grade}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score cards — only when real audio was evaluated */}
                {hasScores && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                        {[
                            { label: 'Technical', val: scores.technical },
                            { label: 'Clarity', val: scores.clarity },
                            { label: 'Confidence', val: scores.confidence },
                        ].map(({ label, val }) => (
                            <div key={label} style={{ borderRadius: 14, padding: 16, textAlign: 'center', backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 26, fontWeight: 800, color: C.navy }}>{val}<span style={{ fontSize: 13, color: C.navyGhost }}>/100</span></div>
                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.navyGhost, marginTop: 4 }}>{label}</div>
                                <div style={{ height: 4, borderRadius: 99, backgroundColor: C.steelLight, marginTop: 10, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', borderRadius: 99, backgroundColor: val >= 70 ? C.teal : val >= 45 ? C.yellow : C.red, width: `${val}%`, transition: 'width 0.7s ease' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Transcript */}
                {transcript && !transcript.startsWith('[No speech') && (
                    <div style={{ borderRadius: 14, padding: 18, marginBottom: 14, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.navyMuted, marginBottom: 10 }}>Your Transcribed Answer</p>
                        <p style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', color: C.navyMuted }}>"{transcript}"</p>
                    </div>
                )}

                {/* Feedback bullets */}
                {bullets?.length > 0 && (
                    <div style={{ borderRadius: 14, padding: 18, marginBottom: 14, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.tealDark, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>💬</span> AI Coaching Feedback
                        </p>
                        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {bullets.map((b, i) => (
                                <li key={i} style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.6, fontWeight: 500 }}>{b}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Better answer */}
                {betterAnswer && (
                    <div style={{ borderRadius: 14, padding: 18, marginBottom: 24, backgroundColor: '#f0fdf4', border: `1px solid rgba(39,174,96,0.2)` }}>
                        <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.green, marginBottom: 10 }}>
                            ✨ Model Answer / What to Say Next Time
                        </p>
                        <div style={{ fontSize: 14, color: '#1a1a1a', lineHeight: 1.7, fontWeight: 500 }}>
                            <ReactMarkdown>{betterAnswer}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt, color: C.navyMuted, cursor: 'pointer' }}
                    >
                        ← Dashboard
                    </button>
                    <button
                        onClick={handleNextQuestion}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}
                    >
                        Next Question →
                    </button>
                </div>
            </div>
        );
    }

    // ── Main question + recording panel ──────────────────────────────────────
    return (
        <div style={{ maxWidth: 720, margin: '16px auto', fontFamily: "'Inter', sans-serif" }}>
            {/* Question card */}
            <div style={{ borderRadius: 20, padding: '40px 48px', marginBottom: 20, backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 8px 30px rgba(26,72,114,0.04)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.4, backgroundImage: `linear-gradient(${C.steelLight} 1px, transparent 1px), linear-gradient(90deg, ${C.steelLight} 1px, transparent 1px)`, backgroundSize: '30px 30px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 28, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.navyMuted }}>
                        Question {questionIndex + 1}
                    </div>
                    <blockquote style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.5, color: C.navy, maxWidth: 580, margin: '0 0 16px' }}>
                        "{question?.text}"
                    </blockquote>
                    <p style={{ fontSize: 13, color: C.navyGhost, fontWeight: 500 }}>
                        Record your spoken answer below. Speak clearly and completely.
                    </p>
                </div>
            </div>

            {/* Recording panel */}
            <div style={{ borderRadius: 20, padding: 24, backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>

                    {isRecording ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.redLight, border: `2px solid rgba(192,57,43,0.3)`, animation: 'pulse 1.5s ease-in-out infinite' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.red }}>
                                        <svg width={20} height={20} fill="white" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: C.red, animation: 'pulse 1s ease-in-out infinite' }} />
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: C.navy, fontSize: 16 }}>{fmt(recordingSeconds)}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.red }}>Recording...</span>
                            </div>
                            <button onClick={stopRecording} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.navyMuted, cursor: 'pointer' }}>
                                <svg width={14} height={14} fill="currentColor" viewBox="0 0 24 24"><rect x={4} y={4} width={16} height={16} rx={2} /></svg>
                                Stop Recording
                            </button>
                        </div>

                    ) : audioBlob ? (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.tealLight, color: C.tealDark, flexShrink: 0 }}>
                                    <svg width={14} height={14} fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z" /></svg>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: C.navy, margin: 0 }}>Answer recorded</p>
                                    <p style={{ fontSize: 11, color: C.navyGhost, margin: 0, marginTop: 2 }}>{fmt(recordingSeconds)} duration</p>
                                </div>
                                <button onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.navyGhost, background: 'none', border: 'none', cursor: 'pointer' }}>
                                    Retake
                                </button>
                            </div>
                            <audio src={URL.createObjectURL(audioBlob)} controls style={{ width: '100%', height: 40, opacity: 0.75 }} />
                            <button
                                onClick={submitAnswer}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0', fontSize: 14, fontWeight: 700, borderRadius: 12, border: 'none', background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', cursor: 'pointer', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}
                            >
                                Submit & Get Feedback
                                <svg width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                            </button>
                        </div>

                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <button
                                onClick={startRecording}
                                style={{ width: 80, height: 80, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, border: `2px solid ${C.tealBorder}`, color: C.teal, cursor: 'pointer', transition: 'transform 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.07)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <svg width={32} height={32} fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z" /></svg>
                            </button>
                            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 2, color: C.navyGhost }}>Click to start recording</p>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }`}</style>
        </div>
    );
}
