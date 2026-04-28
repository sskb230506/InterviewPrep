import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

const C = {
    navy: '#1A4872', navyLight: '#2e5f8a', navyMuted: '#2e6b9a',
    navyFaint: 'rgba(26,72,114,0.55)', navyGhost: 'rgba(26,72,114,0.35)',
    teal: '#52B788', tealDark: '#3d9a6e', 
    tealLight: 'rgba(82,183,136,0.12)', tealBorder: 'rgba(82,183,136,0.35)',
    steel: '#2E7DA6', steelLight: 'rgba(46,125,166,0.10)', steelBorder: 'rgba(46,125,166,0.30)',
    bg: '#f0f9f4',
    card: '#ffffff',
    surface: '#ffffff', surfaceAlt: '#f8fdfb',
    border: 'rgba(26,72,114,0.13)',
    red: '#c0392b', redLight: 'rgba(192,57,43,0.09)',
    green: '#27ae60', greenLight: 'rgba(39,174,96,0.10)',
    yellow: '#d4860a', yellowLight: 'rgba(212,134,10,0.10)', 
    orange: '#d4600a', orangeLight: 'rgba(212,96,10,0.10)',
};

export default function InterviewRoom() {
    const { sessionId } = useParams();
    const navigate = useNavigate();

    const [question, setQuestion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('Generating your first question...');

    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const timerRef = useRef(null);

    const [evaluation, setEvaluation] = useState(null);

    useEffect(() => {
        fetchNextQuestion();
        // eslint-disable-next-line
    }, []);

    const fetchNextQuestion = async () => {
        setLoading(true);
        setEvaluation(null);
        setAudioBlob(null);
        try {
            setStatusText('AI is formulating a question based on your profile...');
            const res = await api.post(`/interview/${sessionId}/question`, { difficulty: 'Intermediate' });
            setQuestion(res.data);
        } catch (err) {
            console.error(err);
            setStatusText('Failed to fetch question.');
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch (err) {
            console.error('Mic access denied:', err);
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
        if (!audioBlob) return;
        setLoading(true);
        setStatusText('Transcribing and evaluating your answer...');

        try {
            const formData = new FormData();
            formData.append('audio', new File([audioBlob], 'answer.webm', { type: 'audio/webm' }));

            const res = await api.post(`/interview/${sessionId}/answer/${question.questionId || question.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setEvaluation(res.data);
        } catch (err) {
            console.error(err);
            alert('Failed to submit answer. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }} />
                <p className="text-sm text-center max-w-xs animate-pulse font-medium" style={{ color: C.navyMuted }}>{statusText}</p>
            </div>
        );
    }

    if (evaluation) {
        const { evaluation: ev, transcript, audit } = evaluation;
        const avgScore = ((ev.scoreTech + ev.scoreRelevance + ev.scoreDepth + ev.scoreStructure) / 4).toFixed(1);
        const scoreGrade = avgScore >= 8 ? 'Excellent' : avgScore >= 6 ? 'Good' : avgScore >= 4 ? 'Fair' : 'Needs Work';

        return (
            <div className="max-w-3xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4" style={{ backgroundColor: C.tealLight, color: C.tealDark, border: `1px solid ${C.tealBorder}` }}>
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Answer Evaluated
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: C.navy }}>Evaluation Results</h2>
                            <p className="text-sm mt-1 font-medium" style={{ color: C.navyGhost }}>Here's how your answer was assessed by the AI.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold" style={{ color: C.navy }}>{avgScore}<span className="text-lg" style={{ color: C.navyGhost }}>/10</span></div>
                            <div className="text-xs font-bold uppercase mt-0.5" style={{ color: C.tealDark }}>{scoreGrade}</div>
                        </div>
                    </div>
                </div>

                {/* Judge warning */}
                {!audit?.isValid && (
                    <div className="mb-5 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: C.yellowLight, border: `1px solid rgba(212,134,10,0.2)` }}>
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.yellow }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-sm font-bold" style={{ color: C.yellow }}>Evaluation Quality Warning</p>
                            <p className="text-xs mt-0.5 font-medium" style={{ color: 'rgba(212,134,10,0.7)' }}>{audit?.auditReasoning || 'The AI evaluation may not be optimal for this response.'}</p>
                        </div>
                    </div>
                )}

                {/* Score cards */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Technical', score: ev.scoreTech },
                        { label: 'Relevance', score: ev.scoreRelevance },
                        { label: 'Depth', score: ev.scoreDepth },
                        { label: 'Structure', score: ev.scoreStructure },
                    ].map(({ label, score }) => (
                        <div key={label} className="rounded-xl p-4 text-center" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                            <div className="text-2xl font-bold mb-1" style={{ color: C.navy }}>{score}</div>
                            <div className="text-xs font-bold uppercase tracking-wider" style={{ color: C.navyGhost }}>{label}</div>
                            <div className="w-full rounded-full h-1 mt-3 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                                <div className="h-1 rounded-full transition-all duration-700" style={{ backgroundColor: C.teal, width: `${(score / 10) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Transcript */}
                <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Your Transcribed Answer</p>
                    <p className="text-sm leading-relaxed italic font-medium" style={{ color: C.navyMuted }}>"{transcript}"</p>
                </div>

                {/* AI Feedback */}
                <div className="rounded-xl p-5 mb-8" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: C.tealDark }}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        AI Feedback
                    </p>
                    <div className="prose prose-sm max-w-none text-black/80 font-medium">
                        <ReactMarkdown>{ev.generalFeedback}</ReactMarkdown>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-5 py-3 text-sm font-bold rounded-xl transition-all duration-150"
                        style={{ color: C.navyMuted, border: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt }}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                        </svg>
                        View Dashboard
                    </button>
                    <button
                        onClick={fetchNextQuestion}
                        className="flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl transition-all duration-150"
                        style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: `0 4px 15px rgba(82,183,136,0.3)` }}
                    >
                        Next Question
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto mt-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Question card */}
            <div className="rounded-2xl p-8 md:p-12 mb-6 relative overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: `0 8px 30px rgba(26,72,114,0.04)` }}>
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-40"
                    style={{
                        backgroundImage: `linear-gradient(${C.steelLight} 1px, transparent 1px),
                                          linear-gradient(90deg, ${C.steelLight} 1px, transparent 1px)`,
                        backgroundSize: '30px 30px',
                    }}
                />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-8" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.navyMuted }}>
                        <svg className="w-3 h-3 text-current" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Interview Question
                    </div>

                    <blockquote className="text-xl md:text-2xl font-bold leading-relaxed max-w-2xl mb-6" style={{ color: C.navy }}>
                        "{question?.question}"
                    </blockquote>

                    <p className="text-sm font-medium" style={{ color: C.navyGhost }}>
                        Take a moment to gather your thoughts, then record your response.
                    </p>
                </div>
            </div>

            {/* Recording panel */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <div className="flex flex-col items-center gap-5">
                    {isRecording ? (
                        // Recording state
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: C.redLight, border: `2px solid rgba(192,57,43,0.3)` }}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C.red }}>
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                        </svg>
                                    </div>
                                </div>
                                {/* Ripple rings */}
                                <div className="absolute inset-0 rounded-full border animate-ping" style={{ borderColor: 'rgba(192,57,43,0.2)' }} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: C.red }} />
                                <span className="text-sm font-mono font-bold" style={{ color: C.navy }}>{formatTime(recordingSeconds)}</span>
                                <span className="text-xs font-bold uppercase" style={{ color: C.red }}>Recording...</span>
                            </div>
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-150"
                                style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.navyMuted }}
                            >
                                <svg className="w-4 h-4 text-current" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" rx="2" />
                                </svg>
                                Stop Recording
                            </button>
                        </div>
                    ) : audioBlob ? (
                        // Audio ready state
                        <div className="w-full flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.tealLight, color: C.tealDark }}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                        <path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold" style={{ color: C.navy }}>Answer recorded</p>
                                    <p className="text-xs font-medium mt-0.5" style={{ color: C.navyGhost }}>{formatTime(recordingSeconds)} duration</p>
                                </div>
                                <button
                                    onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }}
                                    className="text-xs font-bold uppercase transition-colors"
                                    style={{ color: C.navyGhost }}
                                >
                                    Retake
                                </button>
                            </div>
                            <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10 opacity-70" />
                            <button
                                onClick={submitAnswer}
                                className="w-full flex items-center justify-center gap-2 text-sm font-bold py-3.5 rounded-xl transition-all duration-150"
                                style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}
                            >
                                Submit Answer
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        // Idle state
                        <div className="flex flex-col items-center gap-3">
                            <button
                                onClick={startRecording}
                                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 group"
                                style={{ backgroundColor: C.card, border: `2px solid ${C.tealBorder}`, color: C.teal }}
                            >
                                <svg className="w-8 h-8 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                </svg>
                            </button>
                            <p className="text-sm font-medium uppercase tracking-widest" style={{ color: C.navyGhost }}>Click to start recording</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
