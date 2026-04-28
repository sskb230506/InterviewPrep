import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

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
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: C.steelLight, border: `1px solid ${C.steelBorder}`, color: C.steel }}>📚 {topic}</span>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                    ${difficulty === 'Easy' ? ''
                    : difficulty === 'Medium' ? ''
                    : ''}`}
                    style={{
                        backgroundColor: difficulty === 'Easy' ? C.greenLight : difficulty === 'Medium' ? C.yellowLight : C.redLight,
                        border: `1px solid ${difficulty === 'Easy' ? 'rgba(39,174,96,0.3)' : difficulty === 'Medium' ? 'rgba(212,134,10,0.3)' : 'rgba(192,57,43,0.3)'}`,
                        color: difficulty === 'Easy' ? C.green : difficulty === 'Medium' ? C.yellow : C.red
                    }}
                >{difficulty}</span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.navyMuted }}>
                    {answerMode === 'mcq' ? '📝 MCQ' : '🎙️ Voice'}
                </span>
            </div>
            <div className="flex items-center gap-4">
                {/* Question counter */}
                <div className="text-right">
                    <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Question</div>
                    <div className="text-base font-extrabold" style={{ color: C.navy }}>{questionCount + 1}<span className="text-sm" style={{ color: C.navyGhost }}>/{maxQuestions}</span></div>
                </div>
                {/* Progress dots */}
                <div className="flex gap-1">
                    {Array.from({ length: maxQuestions }).map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all`} 
                             style={{ backgroundColor: i < correctCount ? C.teal : i < questionCount ? C.red : i === questionCount ? C.navy : C.steelLight }} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );

    // ── Loading ────────────────────────────────────────────────────────────────
    if (phase === 'loading') return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }} />
            <p className="text-sm font-semibold animate-pulse" style={{ color: C.navyMuted }}>{statusText}</p>
        </div>
    );

    // ── Session Complete ───────────────────────────────────────────────────────
    if (phase === 'session-complete') {
        const accuracy = maxQuestions > 0 ? Math.round((correctCount / maxQuestions) * 100) : 0;
        return (
            <div className="max-w-lg mx-auto mt-8 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="text-6xl mb-5">{accuracy >= 80 ? '🏆' : accuracy >= 60 ? '🎉' : accuracy >= 40 ? '👍' : '📚'}</div>
                <h1 className="text-2xl font-extrabold mb-2" style={{ color: C.navy }}>Session Complete!</h1>
                <p className="text-sm font-bold mb-8" style={{ color: C.navyGhost }}>{topic} · {difficulty} · {answerMode === 'mcq' ? 'MCQ' : 'Voice'}</p>

                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <div className="text-2xl font-bold" style={{ color: C.navy }}>{correctCount}</div>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Correct</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <div className={`text-2xl font-bold`} style={{ color: accuracy >= 70 ? C.green : accuracy >= 50 ? C.yellow : C.red }}>{accuracy}%</div>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Accuracy</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        <div className="text-2xl font-bold" style={{ color: C.navy }}>{maxQuestions - correctCount}</div>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Missed</div>
                    </div>
                </div>

                {/* Accuracy bar */}
                <div className="mb-8">
                    <div className="w-full rounded-full h-2 overflow-hidden mb-2" style={{ backgroundColor: C.steelLight }}>
                        <div className={`h-2 rounded-full transition-all duration-1000`} style={{ backgroundColor: accuracy >= 70 ? C.green : accuracy >= 50 ? C.yellow : C.red, width: `${accuracy}%` }} />
                    </div>
                    <p className="text-xs font-medium" style={{ color: C.navyMuted }}>{accuracy >= 80 ? 'Excellent performance!' : accuracy >= 60 ? 'Good job! Keep practicing.' : accuracy >= 40 ? 'Keep going — practice makes perfect.' : 'Review this topic and try again.'}</p>
                </div>

                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.surfaceAlt }}>View Dashboard</button>
                    <button onClick={() => navigate('/setup')} className="text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>New Session →</button>
                </div>
            </div>
        );
    }

    // ── MCQ Result ─────────────────────────────────────────────────────────────
    if (phase === 'mcq-result' && mcqResult) return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />
            <div className={`p-5 rounded-2xl border mb-5`} 
                 style={{ 
                     backgroundColor: mcqResult.isCorrect ? C.greenLight : C.redLight, 
                     borderColor: mcqResult.isCorrect ? 'rgba(39,174,96,0.2)' : 'rgba(192,57,43,0.2)' 
                 }}>
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl">{mcqResult.forced ? '⏰' : mcqResult.isCorrect ? '✅' : '❌'}</span>
                    <h2 className={`text-base font-bold`} style={{ color: mcqResult.isCorrect ? C.green : C.red }}>
                        {mcqResult.forced ? `Time's up! Correct answer: ${mcqResult.correctAnswer}` : mcqResult.isCorrect ? 'Correct!' : `Wrong — Correct answer: ${mcqResult.correctAnswer}`}
                    </h2>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${mcqResult.isCorrect ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)'}` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: mcqResult.isCorrect ? C.green : C.red }}>Explanation</p>
                    <p className="text-sm leading-relaxed font-medium" style={{ color: C.navyMuted }}>{mcqResult.explanation}</p>
                </div>
            </div>
            <div className="space-y-2 mb-6">
                {questionData && Object.entries(questionData.options).map(([key, val]) => {
                    const isCorrect = key === mcqResult.correctAnswer;
                    const isSelected = key === mcqResult.selectedOption;
                    let optionBg = C.card;
                    let optionBorder = C.border;
                    let optionText = C.navyMuted;
                    let markText = C.navyGhost;

                    if (isCorrect) {
                        optionBg = C.greenLight;
                        optionBorder = 'rgba(39,174,96,0.3)';
                        optionText = C.green;
                    } else if (isSelected && !isCorrect) {
                        optionBg = C.redLight;
                        optionBorder = 'rgba(192,57,43,0.3)';
                        optionText = C.red;
                    }

                    return (
                        <div key={key} className={`flex items-center gap-3 p-3.5 rounded-xl text-sm font-semibold`} 
                             style={{ backgroundColor: optionBg, border: `1px solid ${optionBorder}`, color: optionText }}>
                            <span className="w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ borderColor: 'currentColor' }}>{key}</span>
                            <span>{val}</span>
                            {isCorrect && <span className="ml-auto font-bold">✓</span>}
                            {isSelected && !isCorrect && <span className="ml-auto font-bold">✗</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between items-center">
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Time used: {timeUsed}s / {timeLimit}s</div>
                {questionCount >= maxQuestions ? (
                    <button onClick={() => setPhase('session-complete')} className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>
                        See Results 🏆
                    </button>
                ) : (
                    <button onClick={fetchQuestion} className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>
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
                <h2 className="text-lg font-extrabold" style={{ color: C.navy }}>Answer Evaluated</h2>
                <div className="text-2xl font-bold" style={{ color: C.navy }}>{voiceResult.score}<span className="text-lg" style={{ color: C.navyGhost }}>/10</span></div>
            </div>
            {transcript && (
                <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyMuted }}>Your Answer</p>
                    <p className="text-sm italic font-medium" style={{ color: C.navyMuted }}>"{transcript}"</p>
                </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
                {voiceResult.coveredPoints?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: C.greenLight, border: `1px solid rgba(39,174,96,0.2)` }}>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: C.green }}>Covered ✓</p>
                        <ul className="space-y-1">{voiceResult.coveredPoints.map((p, i) => <li key={i} className="text-xs font-medium flex items-start gap-1.5" style={{ color: C.navyMuted }}><span style={{ color: C.green }}>•</span>{p}</li>)}</ul>
                    </div>
                )}
                {voiceResult.missedPoints?.length > 0 && (
                    <div className="p-4 rounded-xl" style={{ backgroundColor: C.yellowLight, border: `1px solid rgba(212,134,10,0.2)` }}>
                        <p className="text-xs font-bold uppercase mb-2" style={{ color: C.yellow }}>Missed ✗</p>
                        <ul className="space-y-1">{voiceResult.missedPoints.map((p, i) => <li key={i} className="text-xs font-medium flex items-start gap-1.5" style={{ color: C.navyMuted }}><span style={{ color: C.yellow }}>•</span>{p}</li>)}</ul>
                    </div>
                )}
            </div>
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.tealDark }}>Feedback</p>
                <p className="text-sm leading-relaxed font-medium text-black/80">{voiceResult.generalFeedback}</p>
            </div>
            <div className="flex justify-between">
                <button onClick={() => navigate('/setup')} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.card }}>Setup</button>
                {questionCount >= maxQuestions ? (
                    <button onClick={() => setPhase('session-complete')} className="text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>See Results 🏆</button>
                ) : (
                    <button onClick={fetchQuestion} className="flex items-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>
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

            <div className="rounded-2xl p-7 mb-6" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                {/* MCQ Timer bar */}
                {answerMode === 'mcq' && (
                    <div className="mb-5">
                        <div className="flex justify-between text-xs mb-1.5 font-bold uppercase tracking-widest">
                            <span style={{ color: C.navyGhost }}>Time remaining</span>
                            <span className={`font-mono`}>{timeLeft}s</span>
                        </div>
                        <div className="w-full rounded-full h-1 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                            <div
                                className={`h-1 rounded-full transition-all duration-1000 linear`}
                                style={{ backgroundColor: timeLeft <= 10 ? C.red : timeLeft <= 20 ? C.yellow : C.teal, width: `${(timeLeft / timeLimit) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-start justify-between gap-4 mb-5">
                    <h2 className="text-base font-extrabold leading-relaxed" style={{ color: C.navy }}>{questionData?.question}</h2>
                    {questionData?.concept && <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, color: C.navyGhost }}>{questionData.concept}</span>}
                </div>

                {/* MCQ Options */}
                {answerMode === 'mcq' && questionData?.options && (
                    <div className="space-y-2.5">
                        {Object.entries(questionData.options).map(([key, val]) => (
                            <button key={key} type="button" onClick={() => !timerExpired && setSelectedOption(key)}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition-all duration-150 font-semibold`}
                                style={{ 
                                    backgroundColor: selectedOption === key ? C.tealLight : C.card,
                                    borderColor: selectedOption === key ? C.tealBorder : C.border,
                                    color: selectedOption === key ? C.tealDark : C.navyMuted
                                }}
                            >
                                <span className={`w-7 h-7 rounded-lg border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all`}
                                      style={{
                                          backgroundColor: selectedOption === key ? C.teal : 'transparent',
                                          color: selectedOption === key ? '#fff' : C.navyGhost,
                                          borderColor: selectedOption === key ? C.teal : C.border
                                      }}
                                >{key}</span>
                                <span>{val}</span>
                            </button>
                        ))}
                        <button onClick={() => handleMCQSubmit(false)} disabled={!selectedOption}
                            className="w-full mt-4 text-sm font-bold py-3.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.2)' }}>
                            Submit Answer
                        </button>
                    </div>
                )}

                {/* Voice controls */}
                {answerMode === 'voice' && (
                    <div className="flex flex-col items-center gap-4 mt-4">
                        {isRecording ? (
                            <>
                                <div className="relative w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: C.redLight, border: `2px solid rgba(192,57,43,0.3)` }}>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center animate-pulse" style={{ backgroundColor: C.red }}>
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/></svg>
                                    </div>
                                    <div className="absolute inset-0 rounded-full border animate-ping" style={{ borderColor: 'rgba(192,57,43,0.2)' }} />
                                </div>
                                <p className="text-sm font-bold font-mono" style={{ color: C.navy }}>{formatTime(recordingSeconds)}</p>
                                <button onClick={stopRecording} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, color: C.navyMuted }}>Stop Recording</button>
                            </>
                        ) : audioBlob ? (
                            <>
                                <audio src={URL.createObjectURL(audioBlob)} controls className="w-full h-10 opacity-70" />
                                <div className="flex gap-3 w-full">
                                    <button onClick={() => { setAudioBlob(null); setRecordingSeconds(0); }} className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.surfaceAlt }}>Retake</button>
                                    <button onClick={submitVoiceAnswer} className="flex-1 text-sm font-bold py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>Submit Answer</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <button onClick={startRecording} className="w-16 h-16 rounded-full flex items-center justify-center transition-all hover:scale-105" style={{ backgroundColor: C.card, border: `2px solid ${C.tealBorder}`, color: C.teal }}>
                                    <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/></svg>
                                </button>
                                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Click to record your answer</p>
                            </>
                        )}
                        {questionData?.expectedKeyPoints?.length > 0 && (
                            <details className="w-full mt-2">
                                <summary className="text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-colors text-center" style={{ color: C.navyGhost }}>💡 Key points to cover</summary>
                                <ul className="mt-3 space-y-1.5">
                                    {questionData.expectedKeyPoints.map((p, i) => <li key={i} className="text-xs font-semibold flex items-start gap-1.5" style={{ color: C.navyMuted }}><span style={{ color: C.navyGhost }}>•</span>{p}</li>)}
                                </ul>
                            </details>
                        )}
                    </div>
                )}
            </div>

            <div className="flex justify-between items-center text-sm font-bold">
                <button onClick={() => navigate('/setup')} className="transition-colors" style={{ color: C.navyGhost }}>← Back</button>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>{correctCount} correct · {questionCount} answered</div>
            </div>
        </div>
    );
}
