import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ReactMarkdown from 'react-markdown';

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
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                <p className="text-white/30 text-sm text-center max-w-xs animate-pulse">{statusText}</p>
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs text-white/40 mb-4 bg-white/5">
                        <svg className="w-3 h-3 text-white/40" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Answer Evaluated
                    </div>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Evaluation Results</h2>
                            <p className="text-white/30 text-sm mt-1">Here's how your answer was assessed by the AI.</p>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-bold text-white">{avgScore}<span className="text-white/30 text-lg">/10</span></div>
                            <div className="text-xs text-white/30 mt-0.5">{scoreGrade}</div>
                        </div>
                    </div>
                </div>

                {/* Judge warning */}
                {!audit?.isValid && (
                    <div className="mb-5 p-4 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-start gap-3">
                        <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div>
                            <p className="text-amber-400 text-sm font-medium">Evaluation Quality Warning</p>
                            <p className="text-amber-400/60 text-xs mt-0.5">{audit?.auditReasoning || 'The AI evaluation may not be optimal for this response.'}</p>
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
                        <div key={label} className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-center">
                            <div className="text-2xl font-bold text-white mb-1">{score}</div>
                            <div className="text-xs text-white/30 uppercase tracking-wider">{label}</div>
                            <div className="w-full bg-white/5 rounded-full h-1 mt-3 overflow-hidden">
                                <div className="h-1 bg-white/30 rounded-full transition-all duration-700" style={{ width: `${(score / 10) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Transcript */}
                <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 mb-5">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Your Transcribed Answer</p>
                    <p className="text-white/60 text-sm leading-relaxed italic">"{transcript}"</p>
                </div>

                {/* AI Feedback */}
                <div className="bg-white/[0.02] border border-white/8 rounded-xl p-5 mb-8">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-4">AI Feedback</p>
                    <div className="prose prose-sm max-w-none text-white/60 prose-p:text-white/60 prose-headings:text-white/80 prose-strong:text-white/80 prose-li:text-white/60">
                        <ReactMarkdown>{ev.generalFeedback}</ReactMarkdown>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 px-5 py-3 text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all duration-150"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                        </svg>
                        View Dashboard
                    </button>
                    <button
                        onClick={fetchNextQuestion}
                        className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-3 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150"
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
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-8 md:p-12 mb-6 relative overflow-hidden">
                {/* Subtle grid */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
                        backgroundSize: '30px 30px',
                    }}
                />

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs text-white/40 mb-8 bg-white/5">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                        Interview Question
                    </div>

                    <blockquote className="text-xl md:text-2xl font-medium text-white leading-relaxed max-w-2xl mb-6">
                        "{question?.question}"
                    </blockquote>

                    <p className="text-white/25 text-sm">
                        Take a moment to gather your thoughts, then record your response.
                    </p>
                </div>
            </div>

            {/* Recording panel */}
            <div className="bg-white/[0.02] border border-white/8 rounded-2xl p-6">
                <div className="flex flex-col items-center gap-5">
                    {isRecording ? (
                        // Recording state
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="relative">
                                <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/60 flex items-center justify-center animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                        </svg>
                                    </div>
                                </div>
                                {/* Ripple rings */}
                                <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping" />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-white/60 text-sm font-mono">{formatTime(recordingSeconds)}</span>
                                <span className="text-white/30 text-sm">Recording...</span>
                            </div>
                            <button
                                onClick={stopRecording}
                                className="flex items-center gap-2 px-6 py-3 bg-white/8 border border-white/15 hover:bg-white/12 rounded-xl text-white text-sm font-medium transition-all duration-150"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <rect x="4" y="4" width="16" height="16" rx="2" />
                                </svg>
                                Stop Recording
                            </button>
                        </div>
                    ) : audioBlob ? (
                        // Audio ready state
                        <div className="w-full flex flex-col gap-3">
                            <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                        <path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white/70 text-sm font-medium">Answer recorded</p>
                                    <p className="text-white/30 text-xs">{formatTime(recordingSeconds)} duration</p>
                                </div>
                                <button
                                    onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }}
                                    className="text-white/25 hover:text-white/60 transition-colors text-xs"
                                >
                                    Retake
                                </button>
                            </div>
                            <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10 opacity-60" />
                            <button
                                onClick={submitAnswer}
                                className="w-full flex items-center justify-center gap-2 bg-white text-black text-sm font-semibold py-3.5 rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all duration-150"
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
                                className="w-20 h-20 rounded-full bg-white/8 border-2 border-white/15 hover:bg-white/12 hover:border-white/30 flex items-center justify-center transition-all duration-200 hover:scale-105 group"
                            >
                                <svg className="w-8 h-8 text-white/60 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/>
                                </svg>
                            </button>
                            <p className="text-white/25 text-sm">Click to start recording</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
