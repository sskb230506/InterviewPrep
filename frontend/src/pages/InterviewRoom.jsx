import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Mic, Square, Loader2, MessageSquare, CheckCircle, AlertTriangle } from 'lucide-react';
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
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Mic access denied:', err);
            alert('Please allow microphone access to answer the question.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const submitAnswer = async () => {
        if (!audioBlob) return;
        setLoading(true);
        setStatusText('Transcribing and evaluating your answer...');

        try {
            const formData = new FormData();
            // Whisper usually expects typical extensions like .webm or .mp3 or .wav
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

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 size={48} className="text-teal-500 animate-spin mb-6" />
                <h2 className="text-xl font-medium text-slate-300 animate-pulse">{statusText}</h2>
            </div>
        );
    }

    if (evaluation) {
        const { evaluation: ev, transcript, audit } = evaluation;
        const avgScore = ((ev.scoreTech + ev.scoreRelevance + ev.scoreDepth + ev.scoreStructure) / 4).toFixed(1);

        return (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <CheckCircle className="text-teal-400" /> Answer Evaluation
                        </h2>
                        <div className="bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">
                            <span className="text-sm text-slate-400">Average Score: </span>
                            <span className="text-xl font-bold text-teal-400">{avgScore}/10</span>
                        </div>
                    </div>

                    <div className="mb-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Transcript</h3>
                        <p className="text-slate-200 italic">"{transcript}"</p>
                    </div>

                    <div className="mb-6 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">AI Feedback</h3>
                        <div className="prose prose-invert max-w-none text-slate-300">
                            <ReactMarkdown>{ev.generalFeedback}</ReactMarkdown>
                        </div>
                    </div>

                    {!audit?.isValid && (
                        <div className="mb-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-start gap-3 text-rose-300">
                            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                            <div>
                                <strong className="block text-sm">Judge Note: Suboptimal Evaluation</strong>
                                <span className="text-sm">{audit?.auditReasoning || "The evaluation AI might have hallucinated or graded unfairly."}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <ScoreCard title="Technical" score={ev.scoreTech} />
                        <ScoreCard title="Relevance" score={ev.scoreRelevance} />
                        <ScoreCard title="Depth" score={ev.scoreDepth} />
                        <ScoreCard title="Structure" score={ev.scoreStructure} />
                    </div>

                    <div className="flex justify-end gap-4 border-t border-slate-800 pt-6">
                        <button onClick={() => navigate('/dashboard')} className="px-6 py-3 rounded-xl font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                            Finish & Dashboard
                        </button>
                        <button onClick={fetchNextQuestion} className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-teal-500/25 transition-all">
                            Next Question
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500 mt-4">
            <div className="bg-gradient-to-b from-slate-800 to-[#1e293b] border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                {/* Glow Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700 text-teal-400 text-sm font-medium mb-8">
                        <MessageSquare size={16} /> Question Generator
                    </div>

                    <h2 className="text-2xl md:text-4xl font-semibold text-white leading-relaxed mb-4 max-w-3xl">
                        "{question?.question}"
                    </h2>

                    <p className="text-slate-400 mb-12 max-w-2xl">Take a moment to gather your thoughts. When ready, start recording your answer. Speak clearly and comprehensively.</p>

                    <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                        {isRecording ? (
                            <div className="flex flex-col items-center gap-4 w-full">
                                <div className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-pulse shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                                    <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center">
                                        <Mic className="text-white" size={24} />
                                    </div>
                                </div>
                                <span className="text-rose-400 font-medium">Recording Answer...</span>
                                <button
                                    onClick={stopRecording}
                                    className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                                >
                                    <Square size={18} className="fill-white" /> Stop Recording
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={startRecording}
                                className="w-24 h-24 rounded-full bg-teal-500 hover:bg-teal-400 border-4 border-teal-500/30 flex items-center justify-center shadow-xl shadow-teal-500/20 transition-all hover:scale-105 group"
                            >
                                <Mic className="text-white group-hover:scale-110 transition-transform" size={32} />
                            </button>
                        )}

                        {!isRecording && audioBlob && (
                            <div className="w-full mt-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-12 opacity-80" />
                                <button
                                    onClick={submitAnswer}
                                    className="w-full bg-teal-500 hover:bg-teal-400 text-white py-3.5 rounded-xl font-medium shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Submit Answer
                                </button>
                                <button
                                    onClick={() => setAudioBlob(null)}
                                    className="w-full text-sm text-slate-400 hover:text-white transition-colors py-2"
                                >
                                    Discard & Retake
                                </button>
                            </div>
                        )}

                        {!isRecording && !audioBlob && (
                            <span className="text-slate-500 font-medium mt-2">Click to Answer</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ScoreCard({ title, score }) {
    // Color code based on score
    const colorClass = score >= 8 ? 'text-teal-400 border-teal-400/20 bg-teal-400/5' :
        score >= 5 ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' :
            'text-rose-400 border-rose-400/20 bg-rose-400/5';

    return (
        <div className={`p-4 rounded-2xl border ${colorClass} text-center flex flex-col justify-center items-center h-28`}>
            <span className="text-3xl font-bold mb-1">{score}</span>
            <span className="text-xs uppercase tracking-wider opacity-80 font-semibold">{title}</span>
        </div>
    );
}
