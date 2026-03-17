import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

// Question limits per mode
const QUESTION_LIMITS = { mcq: { Easy: 15, Medium: 12, Hard: 10 }, voice: { Easy: 8, Medium: 6, Hard: 5 } };

// Time limits per question (seconds)
const TIME_LIMITS = { Easy: 30, Medium: 45, Hard: 60 };

const EMOJI_SCORE = (score) => score >= 8 ? '🎉' : score >= 6 ? '👍' : score >= 4 ? '🤔' : '📚';

export default function ConceptsRoom() {
    const { sessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const { topic, difficulty, answerMode, yoe } = location.state || {};

    const maxQuestions = QUESTION_LIMITS[answerMode]?.[difficulty] || 10;
    const timeLimit = TIME_LIMITS[difficulty] || 45;

    const [phase, setPhase] = useState('loading'); // loading | question | mcq-result | voice-result | session-complete
    const [questionData, setQuestionData] = useState(null);
    const [previousQuestions, setPreviousQuestions] = useState([]);
    const [questionCount, setQuestionCount] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [totalScore, setTotalScore] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    const [timeUsed, setTimeUsed] = useState(0);

    // MCQ state
    const [selectedOption, setSelectedOption] = useState(null);
    const [mcqResult, setMcqResult] = useState(null);

    // Per-question countdown timer (MCQ only)
    const [timeLeft, setTimeLeft] = useState(timeLimit);
    const timerRef = useRef(null);
    const [timerExpired, setTimerExpired] = useState(false);

    // Voice state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [voiceResult, setVoiceResult] = useState(null);
    const [transcript, setTranscript] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const recTimerRef = useRef(null);

    const [statusText, setStatusText] = useState('');

    useEffect(() => { fetchQuestion(); }, []);

    // ── Countdown timer for MCQ ────────────────────────────────────────────────
    useEffect(() => {
        if (phase !== 'question' || answerMode !== 'mcq') return;
        setTimeLeft(timeLimit);
        setTimerExpired(false);
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current);
                    setTimerExpired(true);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [phase, questionData]);

    // Auto-submit MCQ when timer expires
    useEffect(() => {
        if (timerExpired && phase === 'question' && answerMode === 'mcq') {
            handleMCQSubmit(true); // force submit with no selection
        }
    }, [timerExpired]);

    const fetchQuestion = async () => {
        if (questionCount >= maxQuestions) { setPhase('session-complete'); return; }
        setPhase('loading');
        setSelectedOption(null);
        setMcqResult(null);
        setVoiceResult(null);
        setAudioBlob(null);
        setTranscript('');
        setTimerExpired(false);
        setStatusText(`Generating question ${questionCount + 1} of ${maxQuestions}...`);
        try {
            const res = await api.post('/concepts/question', {
                topic, difficulty, yoe: yoe || 0, answerMode, previousQuestions
            });
            setQuestionData(res.data);
            setPreviousQuestions(prev => [...prev, res.data.concept || topic]);
            setQuestionStartTime(Date.now());
            setPhase('question');
        } catch (err) {
            console.error(err);
            setStatusText('Failed to load question. Please try again.');
        }
    };

    // ── MCQ Handlers ───────────────────────────────────────────────────────────

    const handleMCQSubmit = async (forced = false) => {
        clearInterval(timerRef.current);
        const chosen = forced ? null : selectedOption;
        const used = Math.round((Date.now() - (questionStartTime || Date.now())) / 1000);
        setTimeUsed(used);
        try {
            const res = await api.post('/concepts/answer/mcq', {
                question: questionData.question,
                selectedOption: chosen || '',
                correctAnswer: questionData.correctAnswer,
                explanation: questionData.explanation,
                topic, difficulty, sessionId,
                timeUsedSeconds: used,
                timeLimitSeconds: timeLimit,
            });
            setMcqResult({ ...res.data, forced });
            if (res.data.isCorrect) setCorrectCount(c => c + 1);
            setTotalScore(s => s + (res.data.isCorrect ? 10 : 0));
            setQuestionCount(c => c + 1);
            setPhase('mcq-result');
        } catch (err) { console.error(err); }
    };

    // ── Voice Handlers ─────────────────────────────────────────────────────────

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];
            mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(t => t.stop());
            };
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            recTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch { alert('Please allow microphone access.'); }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(recTimerRef.current);
        }
    };

    const submitVoiceAnswer = async () => {
        if (!audioBlob) return;
        const used = Math.round((Date.now() - (questionStartTime || Date.now())) / 1000);
        setPhase('loading');
        setStatusText('Transcribing and evaluating your answer...');
        try {
            const formData = new FormData();
            formData.append('audio', new File([audioBlob], 'answer.webm', { type: 'audio/webm' }));
            formData.append('question', questionData.question);
            formData.append('keyPoints', JSON.stringify(questionData.expectedKeyPoints || []));
            formData.append('topic', topic);
            formData.append('difficulty', difficulty);
            formData.append('sessionId', sessionId || '');
            formData.append('timeUsedSeconds', used);
            formData.append('timeLimitSeconds', timeLimit * 4); // voice has 4x time vs MCQ
            const res = await api.post('/concepts/answer/voice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setVoiceResult(res.data);
            setTranscript(res.data.transcript || '');
            const sc = res.data.score || 0;
            setTotalScore(s => s + sc);
            if (sc >= 6) setCorrectCount(c => c + 1);
            setQuestionCount(c => c + 1);
            setPhase('voice-result');
        } catch (err) {
            console.error(err);
            setStatusText('Failed to evaluate. Please try again.');
            setPhase('question');
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
    const timerColor = timeLeft <= 10 ? 'text-red-400' : timeLeft <= 20 ? 'text-yellow-400' : 'text-white/60';

    // ── Shared Header ──────────────────────────────────────────────────────────
    const HeaderBar = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center px-2.5 py-1 border border-white/10 rounded-full text-xs text-white/50 bg-white/5">📚 {topic}</span>
                <span className={`inline-flex items-center px-2.5 py-1 border rounded-full text-xs font-medium
                    ${difficulty === 'Easy' ? 'text-green-400 border-green-400/20 bg-green-400/10'
                    : difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10'
                    : 'text-red-400 border-red-400/20 bg-red-400/10'}`}>{difficulty}</span>
                <span className="inline-flex items-center px-2.5 py-1 border border-white/10 rounded-full text-xs text-white/50 bg-white/5">
                    {answerMode === 'mcq' ? '📝 MCQ' : '🎙️ Voice'}
                </span>
            </div>
            <div className="flex items-center gap-4">
                {/* Question counter */}
                <div className="text-right">
                    <div className="text-xs text-white/30">Question</div>
                    <div className="text-base font-bold text-white">{questionCount + 1}<span className="text-white/25 text-sm">/{maxQuestions}</span></div>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1">
                    {Array.from({ length: maxQuestions }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i < correctCount ? 'bg-green-400' : i < questionCount ? 'bg-red-400/60' : i === questionCount ? 'bg-white/60' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Loading ────────────────────────────────────────────────────────────────
    if (phase === 'loading') return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm animate-pulse">{statusText}</p>
        </div>
    );

    // ── Session Complete ───────────────────────────────────────────────────────
    if (phase === 'session-complete') {
        const accuracy = maxQuestions > 0 ? Math.round((correctCount / maxQuestions) * 100) : 0;
        return (
            <div className="max-w-lg mx-auto mt-8 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="text-6xl mb-5">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎉' : accuracy >= 40 ? '👍' : '📚'}</div>
                <h1 className="text-2xl font-bold text-white mb-2">Session Complete!</h1>
                <p className="text-white/30 text-sm mb-8">{topic} · {difficulty} · {answerMode === 'mcq' ? 'MCQ' : 'Voice'}</p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white">{correctCount}</div>
                        <div className="text-xs text-white/30 mt-1">Correct</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                        <div className={`text-2xl font-bold ${accuracy >= 70 ? 'text-green-400' : accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</div>
                        <div className="text-xs text-white/30 mt-1">Accuracy</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4">
                        <div className="text-2xl font-bold text-white">{maxQuestions - correctCount}</div>
                        <div className="text-xs text-white/30 mt-1">Missed</div>
                    </div>
                </div>

                {/* Accuracy bar */}
                <div className="mb-8">
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden mb-2">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${accuracy >= 70 ? 'bg-green-400/70' : accuracy >= 50 ? 'bg-yellow-400/70' : 'bg-red-400/70'}`} style={{ width: `${accuracy}%` }} />
                    </div>
                    <p className="text-xs text-white/30">{accuracy >= 80 ? 'Excellent performance!' : accuracy >= 60 ? 'Good job! Keep practicing.' : accuracy >= 40 ? 'Keep going — practice makes perfect.' : 'Review this topic and try again.'}</p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 text-sm border border-white/10 text-white/50 hover:text-white hover:border-white/25 rounded-xl transition-all">View Dashboard</button>
                    <button onClick={() => navigate('/setup')} className="bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">New Session →</button>
                </div>
            </div>
        );
    }

    // ── MCQ Result ─────────────────────────────────────────────────────────────
    if (phase === 'mcq-result' && mcqResult) return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />
            <div className={`p-5 rounded-2xl border mb-5 ${mcqResult.isCorrect ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'}`}>
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{mcqResult.forced ? '⏰' : mcqResult.isCorrect ? '✅' : '❌'}</span>
                    <h2 className={`text-base font-bold ${mcqResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {mcqResult.forced ? `Time's up! Correct answer: ${mcqResult.correctAnswer}` : mcqResult.isCorrect ? 'Correct!' : `Wrong — Correct answer: ${mcqResult.correctAnswer}`}
                    </h2>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/8">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Explanation</p>
                    <p className="text-white/70 text-sm leading-relaxed">{mcqResult.explanation}</p>
                </div>
            </div>
            <div className="space-y-2 mb-6">
                {questionData && Object.entries(questionData.options).map(([key, val]) => {
                    const isCorrect = key === mcqResult.correctAnswer;
                    const isSelected = key === mcqResult.selectedOption;
                    return (
                        <div key={key} className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm ${isCorrect ? 'border-green-500/30 bg-green-500/8 text-green-400' : isSelected && !isCorrect ? 'border-red-500/30 bg-red-500/8 text-red-400' : 'border-white/8 bg-white/3 text-white/40'}`}>
                            <span className="w-6 h-6 rounded-lg border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{key}</span>
                            <span>{val}</span>
                            {isCorrect && <span className="ml-auto">✓</span>}
                            {isSelected && !isCorrect && <span className="ml-auto">✗</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between items-center">
                <div className="text-xs text-white/30">Time used: {timeUsed}s / {timeLimit}s</div>
                {questionCount >= maxQuestions ? (
                    <button onClick={() => setPhase('session-complete')} className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                        See Results 🏆
                    </button>
                ) : (
                    <button onClick={fetchQuestion} className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                        Next <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </button>
                )}
            </div>
        </div>
    );

    // ── Voice Result ───────────────────────────────────────────────────────────
    if (phase === 'voice-result' && voiceResult) return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">Answer Evaluated</h2>
                <div className="text-2xl font-bold text-white">{voiceResult.score}<span className="text-white/30 text-lg">/10</span></div>
            </div>
            {transcript && (
                <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl mb-4">
                    <p className="text-xs text-white/30 mb-2">Your Answer</p>
                    <p className="text-white/60 text-sm italic">"{transcript}"</p>
                </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
                {voiceResult.coveredPoints?.length > 0 && (
                    <div className="p-4 bg-green-500/5 border border-green-500/15 rounded-xl">
                        <p className="text-xs text-green-400/70 mb-2">Covered ✓</p>
                        <ul className="space-y-1">{voiceResult.coveredPoints.map((p, i) => <li key={i} className="text-xs text-white/60 flex items-start gap-1.5"><span className="text-green-400">•</span>{p}</li>)}</ul>
                    </div>
                )}
                {voiceResult.missedPoints?.length > 0 && (
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
                        <p className="text-xs text-yellow-400/70 mb-2">Missed ✗</p>
                        <ul className="space-y-1">{voiceResult.missedPoints.map((p, i) => <li key={i} className="text-xs text-white/60 flex items-start gap-1.5"><span className="text-yellow-400">•</span>{p}</li>)}</ul>
                    </div>
                )}
            </div>
            <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl mb-6">
                <p className="text-xs text-white/30 mb-2">Feedback</p>
                <p className="text-white/60 text-sm leading-relaxed">{voiceResult.generalFeedback}</p>
            </div>
            <div className="flex justify-between">
                <button onClick={() => navigate('/setup')} className="px-4 py-2.5 text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all">Setup</button>
                {questionCount >= maxQuestions ? (
                    <button onClick={() => setPhase('session-complete')} className="bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">See Results 🏆</button>
                ) : (
                    <button onClick={fetchQuestion} className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                        Next <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    </button>
                )}
            </div>
        </div>
    );

    // ── Question Phase ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />

            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7 mb-6">
                {/* MCQ Timer bar */}
                {answerMode === 'mcq' && (
                    <div className="mb-5">
                        <div className="flex justify-between text-xs mb-1.5">
                            <span className="text-white/30">Time remaining</span>
                            <span className={`font-mono font-bold ${timerColor}`}>{timeLeft}s</span>
                        </div>
                        <div className="w-full bg-white/6 rounded-full h-1 overflow-hidden">
                            <div
                                className={`h-1 rounded-full transition-all duration-1000 linear ${timeLeft <= 10 ? 'bg-red-400' : timeLeft <= 20 ? 'bg-yellow-400' : 'bg-white/50'}`}
                                style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-5">
                    <h2 className="text-base font-semibold text-white leading-relaxed">{questionData?.question}</h2>
                    {questionData?.concept && <span className="flex-shrink-0 text-xs border border-white/10 text-white/30 px-2 py-1 rounded-lg">{questionData.concept}</span>}
                </div>

                {/* MCQ Options */}
                {answerMode === 'mcq' && questionData?.options && (
                    <div className="space-y-2.5">
                        {Object.entries(questionData.options).map(([key, val]) => (
                            <button key={key} type="button" onClick={() => !timerExpired && setSelectedOption(key)}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition-all duration-150 ${selectedOption === key ? 'border-white/40 bg-white/10 text-white' : 'border-white/8 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:border-white/20 hover:text-white'}`}
                            >
                                <span className={`w-7 h-7 rounded-lg border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all ${selectedOption === key ? 'bg-white text-black border-white' : 'border-white/20 text-white/40'}`}>{key}</span>
                                <span>{val}</span>
                            </button>
                        ))}
                        <button onClick={() => handleMCQSubmit(false)} disabled={!selectedOption}
                            className="w-full mt-4 bg-white text-black text-sm font-semibold py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            Submit Answer
                        </button>
                    </div>
                )}

                {/* Voice controls */}
                {answerMode === 'voice' && (
                    <div className="flex flex-col items-center gap-4 mt-4">
                        {isRecording ? (
                            <>
                                <div className="relative w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/60 flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center animate-pulse">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/></svg>
                                    </div>
                                    <div className="absolute inset-0 rounded-full border border-red-500/25 animate-ping" />
                                </div>
                                <p className="text-white/50 text-sm font-mono">{formatTime(recordingSeconds)}</p>
                                <button onClick={stopRecording} className="px-5 py-2.5 text-sm bg-white/8 border border-white/15 hover:bg-white/12 text-white rounded-xl transition-all">Stop Recording</button>
                            </>
                        ) : audioBlob ? (
                            <>
                                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10 opacity-60" />
                                <div className="flex gap-3 w-full">
                                    <button onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }} className="flex-1 py-2.5 text-sm border border-white/10 text-white/40 hover:text-white rounded-xl transition-all">Retake</button>
                                    <button onClick={submitVoiceAnswer} className="flex-1 bg-white text-black text-sm font-semibold py-2.5 rounded-xl hover:bg-white/90 transition-all">Submit Answer</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <button onClick={startRecording} className="w-16 h-16 rounded-full bg-white/8 border-2 border-white/15 hover:bg-white/12 hover:border-white/30 flex items-center justify-center transition-all hover:scale-105">
                                    <svg className="w-7 h-7 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/></svg>
                                </button>
                                <p className="text-white/25 text-sm">Click to record your answer</p>
                            </>
                        )}
                        {questionData?.expectedKeyPoints?.length > 0 && (
                            <details className="w-full mt-2">
                                <summary className="text-xs text-white/25 cursor-pointer hover:text-white/40 transition-colors text-center">💡 Key points to cover</summary>
                                <ul className="mt-3 space-y-1.5">
                                    {questionData.expectedKeyPoints.map((p, i) => <li key={i} className="text-xs text-white/40 flex items-start gap-1.5"><span className="text-white/20">•</span>{p}</li>)}
                                </ul>
                            </details>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-sm">
                <button onClick={() => navigate('/setup')} className="text-white/30 hover:text-white transition-colors">← Back</button>
                <div className="text-white/20 text-xs">{correctCount} correct · {questionCount} answered</div>
            </div>
        </div>
    );
}
