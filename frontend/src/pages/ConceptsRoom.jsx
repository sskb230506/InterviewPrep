import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

const EMOJI_SCORE = (score) => score >= 8 ? '🎉' : score >= 6 ? '👍' : score >= 4 ? '🤔' : '📚';

export default function ConceptsRoom() {
    const { sessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const { topic, difficulty, answerMode, yoe } = location.state || {};

    const [phase, setPhase] = useState('loading'); // loading | question | mcq-result | voice-result
    const [questionData, setQuestionData] = useState(null);
    const [previousQuestions, setPreviousQuestions] = useState([]);
    const [score, setScore] = useState(0);
    const [questionCount, setQuestionCount] = useState(0);

    // MCQ state
    const [selectedOption, setSelectedOption] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [mcqResult, setMcqResult] = useState(null);

    // Voice state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [voiceResult, setVoiceResult] = useState(null);
    const [transcript, setTranscript] = useState('');
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);

    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        fetchQuestion();
        // eslint-disable-next-line
    }, []);

    const fetchQuestion = async () => {
        setPhase('loading');
        setSelectedOption(null);
        setShowAnswer(false);
        setMcqResult(null);
        setVoiceResult(null);
        setAudioBlob(null);
        setTranscript('');

        setStatusText(`Generating ${difficulty} question on ${topic}...`);
        try {
            const res = await api.post('/concepts/question', {
                topic, difficulty,
                yoe: yoe || 0,
                answerMode,
                previousQuestions
            });
            setQuestionData(res.data);
            setPreviousQuestions(prev => [...prev, res.data.concept || topic]);
            setPhase('question');
        } catch (err) {
            console.error(err);
            setStatusText('Failed to load question. Please try again.');
        }
    };

    // ── MCQ Handlers ───────────────────────────────────────────────────────────

    const handleMCQSubmit = async () => {
        if (!selectedOption) return;
        try {
            const res = await api.post('/concepts/answer/mcq', {
                question: questionData.question,
                selectedOption,
                correctAnswer: questionData.correctAnswer,
                explanation: questionData.explanation
            });
            setMcqResult(res.data);
            setScore(prev => prev + (res.data.isCorrect ? 1 : 0));
            setQuestionCount(c => c + 1);
            setPhase('mcq-result');
        } catch (err) {
            console.error(err);
        }
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
            timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch (err) {
            alert('Please allow microphone access.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const submitVoiceAnswer = async () => {
        if (!audioBlob) return;
        setPhase('loading');
        setStatusText('Transcribing and evaluating your answer...');
        try {
            const formData = new FormData();
            formData.append('audio', new File([audioBlob], 'answer.webm', { type: 'audio/webm' }));
            formData.append('question', questionData.question);
            formData.append('keyPoints', JSON.stringify(questionData.expectedKeyPoints || []));
            const res = await api.post('/concepts/answer/voice', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setVoiceResult(res.data);
            setTranscript(res.data.transcript || '');
            setScore(prev => prev + Math.round((res.data.score || 0)));
            setQuestionCount(c => c + 1);
            setPhase('voice-result');
        } catch (err) {
            console.error(err);
            setStatusText('Failed to evaluate. Please try again.');
            setPhase('question');
        }
    };

    const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    // ── Render helpers ─────────────────────────────────────────────────────────

    const HeaderBar = () => (
        <div className="flex items-center justify-between mb-8">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 rounded-full text-xs text-white/50 bg-white/5">
                        📚 {topic}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-full text-xs font-medium
                        ${difficulty === 'Easy' ? 'text-green-400 border-green-400/20 bg-green-400/10'
                        : difficulty === 'Medium' ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10'
                        : 'text-red-400 border-red-400/20 bg-red-400/10'}`}>
                        {difficulty}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 rounded-full text-xs text-white/50 bg-white/5">
                        {answerMode === 'mcq' ? '📝 MCQ' : '🎙️ Voice'}
                    </span>
                </div>
            </div>
            {questionCount > 0 && (
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <div className="text-xs text-white/30">Score</div>
                        <div className="text-lg font-bold text-white">{score}<span className="text-white/30 text-sm">/{questionCount * 10}</span></div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-lg">
                        {EMOJI_SCORE(score / Math.max(questionCount, 1))}
                    </div>
                </div>
            )}
        </div>
    );

    // ── Loading ────────────────────────────────────────────────────────────────
    if (phase === 'loading') return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm animate-pulse">{statusText}</p>
        </div>
    );

    // ── MCQ Result ─────────────────────────────────────────────────────────────
    if (phase === 'mcq-result' && mcqResult) return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />
            <div className={`p-6 rounded-2xl border mb-5 ${mcqResult.isCorrect ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/8 border-red-500/20'}`}>
                <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{mcqResult.isCorrect ? '✅' : '❌'}</span>
                    <h2 className={`text-lg font-bold ${mcqResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {mcqResult.isCorrect ? 'Correct!' : `Incorrect — Correct answer: ${mcqResult.correctAnswer}`}
                    </h2>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/8">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Explanation</p>
                    <p className="text-white/70 text-sm leading-relaxed">{mcqResult.explanation}</p>
                </div>
            </div>
            {/* Show all options with correct/wrong highlights */}
            <div className="space-y-2 mb-8">
                {questionData && Object.entries(questionData.options).map(([key, val]) => {
                    const isCorrect = key === mcqResult.correctAnswer;
                    const isSelected = key === mcqResult.selectedOption;
                    return (
                        <div key={key} className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm ${
                            isCorrect ? 'border-green-500/30 bg-green-500/8 text-green-400' :
                            isSelected && !isCorrect ? 'border-red-500/30 bg-red-500/8 text-red-400' :
                            'border-white/8 bg-white/3 text-white/40'}`}>
                            <span className="w-6 h-6 rounded-lg border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">{key}</span>
                            <span>{val}</span>
                            {isCorrect && <span className="ml-auto text-green-400">✓</span>}
                            {isSelected && !isCorrect && <span className="ml-auto text-red-400">✗</span>}
                        </div>
                    );
                })}
            </div>
            <div className="flex justify-between">
                <button onClick={() => navigate('/setup')} className="px-5 py-2.5 text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all">Back to Setup</button>
                <button onClick={fetchQuestion} className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                    Next Question <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
            </div>
        </div>
    );

    // ── Voice Result ───────────────────────────────────────────────────────────
    if (phase === 'voice-result' && voiceResult) return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Answer Evaluated</h2>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{voiceResult.score}<span className="text-white/30 text-lg">/10</span></div>
                </div>
            </div>
            {transcript && (
                <div className="p-5 bg-white/[0.02] border border-white/8 rounded-xl mb-4">
                    <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Your Answer</p>
                    <p className="text-white/60 text-sm italic">"{transcript}"</p>
                </div>
            )}
            <div className="grid md:grid-cols-2 gap-4 mb-5">
                {voiceResult.coveredPoints?.length > 0 && (
                    <div className="p-5 bg-green-500/5 border border-green-500/15 rounded-xl">
                        <p className="text-xs text-green-400/70 uppercase tracking-widest mb-3">Covered ✓</p>
                        <ul className="space-y-1.5">{voiceResult.coveredPoints.map((p, i) => <li key={i} className="text-sm text-white/60 flex items-start gap-2"><span className="text-green-400 mt-0.5">•</span>{p}</li>)}</ul>
                    </div>
                )}
                {voiceResult.missedPoints?.length > 0 && (
                    <div className="p-5 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
                        <p className="text-xs text-yellow-400/70 uppercase tracking-widest mb-3">Missed ✗</p>
                        <ul className="space-y-1.5">{voiceResult.missedPoints.map((p, i) => <li key={i} className="text-sm text-white/60 flex items-start gap-2"><span className="text-yellow-400 mt-0.5">•</span>{p}</li>)}</ul>
                    </div>
                )}
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/8 rounded-xl mb-8">
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Feedback</p>
                <p className="text-white/60 text-sm leading-relaxed">{voiceResult.generalFeedback}</p>
            </div>
            <div className="flex justify-between">
                <button onClick={() => navigate('/setup')} className="px-5 py-2.5 text-sm text-white/40 hover:text-white border border-white/10 hover:border-white/25 rounded-xl transition-all">Back to Setup</button>
                <button onClick={fetchQuestion} className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-all">
                    Next Question <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </button>
            </div>
        </div>
    );

    // ── Question Phase ─────────────────────────────────────────────────────────
    return (
        <div className="max-w-2xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            <HeaderBar />

            {/* Question Card */}
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7 mb-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                    <h2 className="text-lg font-semibold text-white leading-relaxed">{questionData?.question}</h2>
                    {questionData?.concept && (
                        <span className="flex-shrink-0 text-xs border border-white/10 text-white/30 px-2 py-1 rounded-lg">{questionData.concept}</span>
                    )}
                </div>

                {/* MCQ Options */}
                {answerMode === 'mcq' && questionData?.options && (
                    <div className="space-y-2.5">
                        {Object.entries(questionData.options).map(([key, val]) => (
                            <button key={key} type="button" onClick={() => setSelectedOption(key)}
                                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-sm text-left transition-all duration-150 ${
                                    selectedOption === key
                                        ? 'border-white/40 bg-white/10 text-white'
                                        : 'border-white/8 bg-white/[0.02] text-white/60 hover:bg-white/5 hover:border-white/20 hover:text-white'
                                }`}
                            >
                                <span className={`w-7 h-7 rounded-lg border flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all ${selectedOption === key ? 'bg-white text-black border-white' : 'border-white/20 text-white/40'}`}>{key}</span>
                                <span>{val}</span>
                            </button>
                        ))}
                        <button onClick={handleMCQSubmit} disabled={!selectedOption}
                            className="w-full mt-4 bg-white text-black text-sm font-semibold py-3.5 rounded-xl hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            Submit Answer
                        </button>
                    </div>
                )}

                {/* Voice controls */}
                {answerMode === 'voice' && (
                    <div className="flex flex-col items-center gap-4 mt-6">
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
                                <button onClick={startRecording}
                                    className="w-16 h-16 rounded-full bg-white/8 border-2 border-white/15 hover:bg-white/12 hover:border-white/30 flex items-center justify-center transition-all hover:scale-105">
                                    <svg className="w-7 h-7 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M7 10a5 5 0 0 0 10 0h2a7 7 0 0 1-6 6.92V20h3v2H8v-2h3v-3.08A7 7 0 0 1 5 10h2z"/></svg>
                                </button>
                                <p className="text-white/25 text-sm">Click to record your answer</p>
                            </>
                        )}
                        {/* Key points hint */}
                        {questionData?.expectedKeyPoints?.length > 0 && (
                            <details className="w-full mt-2">
                                <summary className="text-xs text-white/25 cursor-pointer hover:text-white/40 transition-colors text-center">💡 View key points to cover</summary>
                                <ul className="mt-3 space-y-1.5 list-none">
                                    {questionData.expectedKeyPoints.map((p, i) => (
                                        <li key={i} className="text-xs text-white/40 flex items-start gap-1.5"><span className="text-white/20">•</span>{p}</li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}
            </div>

            {/* Question navigation */}
            <div className="flex justify-between items-center text-sm">
                <button onClick={() => navigate('/setup')} className="text-white/30 hover:text-white transition-colors">← Back to Setup</button>
                <div className="text-white/20">{questionCount} answered</div>
            </div>
        </div>
    );
}
