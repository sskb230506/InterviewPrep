import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
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

// Problem count limits and time limits by difficulty
const PROBLEM_LIMITS = { Easy: 4, Medium: 3, 'Medium-Hard': 3, Hard: 3 };
// Countdown timer (minutes → seconds)
const TIME_LIMITS_SECONDS = { Easy: 20 * 60, Medium: 35 * 60, 'Medium-Hard': 40 * 60, Hard: 50 * 60 };

const TIER_BADGE = {
    'Easy': 'text-green-400 bg-green-400/10 border-green-400/20',
    'Medium': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'Medium-Hard': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Hard': 'text-red-400 bg-red-400/10 border-red-400/20',
};

const MONACO_LANG = { Python: 'python', JavaScript: 'javascript', Java: 'java', 'C++': 'cpp' };

const DEFAULT_CODE = {
    Python: '# Write your solution here\ndef solution():\n    pass\n',
    JavaScript: '// Write your solution here\nvar solution = function() {\n    \n};\n',
    Java: 'class Solution {\n    public int solution() {\n        // Write your solution here\n        return 0;\n    }\n}',
    'C++': '#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    int solution() {\n        // Write your solution here\n        return 0;\n    }\n};',
};

const fmtTime = (s) => s < 0 ? '00:00' : `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;


// ─── Main Component ───────────────────────────────────────────────────────────

export default function DSARoom() {
    const { sessionId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const { company, topic, language: initLang, yoe } = location.state || {};

    const [language, setLanguage] = useState(initLang || 'Python');
    const [code, setCode] = useState(DEFAULT_CODE[initLang] || DEFAULT_CODE.Python);
    const [problem, setProblem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statusText, setStatusText] = useState('');
    const [previousProblems, setPreviousProblems] = useState([]);

    const [evaluating, setEvaluating] = useState(false);
    const [evaluation, setEvaluation] = useState(null);

    const [rightTab, setRightTab] = useState('editor');
    const [showHints, setShowHints] = useState(false);
    const [hintIndex, setHintIndex] = useState(0);

    // ── Problem counter & session stats ──────────────────────────────────────
    const [problemIndex, setProblemIndex] = useState(0); // 0-based current problem index
    const [passedCount, setPassedCount] = useState(0);
    const [sessionComplete, setSessionComplete] = useState(false);
    // ref to track max problems (set when first problem arrives)
    const maxProblemsRef = useRef(3);

    // ── Countdown timer ───────────────────────────────────────────────────────
    const [timeLeft, setTimeLeft] = useState(null);
    const [timeLimitSecs, setTimeLimitSecs] = useState(0);
    const problemStartRef = useRef(null);
    const countdownRef = useRef(null);

    const startTimer = (limitSecs) => {
        clearInterval(countdownRef.current);
        setTimeLeft(limitSecs);
        setTimeLimitSecs(limitSecs);
        problemStartRef.current = Date.now();
        countdownRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { clearInterval(countdownRef.current); return 0; }
                return t - 1;
            });
        }, 1000);
    };

    useEffect(() => {
        fetchProblem();
        return () => clearInterval(countdownRef.current);
        // eslint-disable-next-line
    }, []);

    const fetchProblem = async () => {
        setLoading(true);
        setEvaluation(null);
        setRightTab('editor');
        setShowHints(false);
        setHintIndex(0);
        clearInterval(countdownRef.current);
        setStatusText(`Generating problem ${problemIndex + 1} for ${company}...`);
        try {
            const res = await api.post('/dsa/problem', {
                company: company || 'TCS',
                language,
                topic: topic || '',
                previousProblems
            });
            const newProblem = res.data;
            setProblem(newProblem);
            const starter = newProblem.starterCode ? fixIndent(newProblem.starterCode) : DEFAULT_CODE[language];
            setCode(starter);
            setPreviousProblems(prev => [...prev, { title: newProblem.title, topic: newProblem.topic }]);

            // Set max problems based on difficulty (first problem)
            const diff = newProblem.difficulty || 'Medium';
            const limit = PROBLEM_LIMITS[diff] || 3;
            maxProblemsRef.current = limit;

            // Start the countdown timer for this problem
            const tLimit = TIME_LIMITS_SECONDS[diff] || (35 * 60);
            startTimer(tLimit);
        } catch (err) {
            console.error(err);
            setStatusText('Failed to load problem. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fixIndent = (code) => code.replace(/\\n/g, '\n').replace(/\\t/g, '    ');

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        const starter = problem?.starterCode ? fixIndent(problem.starterCode) : DEFAULT_CODE[newLang];
        setCode(starter);
    };

    const handleRunCode = async () => {
        if (!code.trim() || !problem) return;
        setEvaluating(true);
        setRightTab('editor');
        clearInterval(countdownRef.current);
        const timeUsed = timeLimitSecs - (timeLeft || 0);
        try {
            const res = await api.post('/dsa/evaluate', {
                problem, code, language,
                timeUsedSeconds: timeUsed,
                timeLimitSeconds: timeLimitSecs,
                sessionId: sessionId || null,
            });
            setEvaluation(res.data);
            setRightTab('results');
            if (res.data.passed) setPassedCount(p => p + 1);
        } catch (err) {
            console.error(err);
        } finally {
            setEvaluating(false);
        }
    };

    const handleNextProblem = () => {
        const nextIdx = problemIndex + 1;
        if (nextIdx >= maxProblemsRef.current) {
            setSessionComplete(true);
        } else {
            setProblemIndex(nextIdx);
            fetchProblem();
        }
    };

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }} />
            <p className="text-sm font-semibold animate-pulse" style={{ color: C.navyMuted }}>{statusText}</p>
        </div>
    );

    // ── Session complete ───────────────────────────────────────────────────────
    if (sessionComplete) {
        const total = maxProblemsRef.current;
        const rate = total > 0 ? Math.round((passedCount / total) * 100) : 0;
        return (
            <div className="max-w-md mx-auto mt-20 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
                <div className="text-5xl mb-5">{rate >= 80 ? '🏆' : rate >= 60 ? '🎉' : rate >= 40 ? '👍' : '📚'}</div>
                <h1 className="text-2xl font-extrabold mb-2" style={{ color: C.navy }}>Session Complete!</h1>
                <p className="text-sm font-bold mb-8" style={{ color: C.navyGhost }}>{company} · {problem?.difficulty}</p>
                <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}><div className="text-2xl font-bold" style={{ color: C.green }}>{passedCount}</div><div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Accepted</div></div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}><div className={`text-2xl font-bold`} style={{ color: rate >= 70 ? C.green : rate >= 50 ? C.yellow : C.red }}>{rate}%</div><div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Pass Rate</div></div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}><div className="text-2xl font-bold" style={{ color: C.red }}>{total - passedCount}</div><div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: C.navyGhost }}>Failed</div></div>
                </div>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => navigate('/dashboard')} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.surfaceAlt }}>View Dashboard</button>
                    <button onClick={() => navigate('/setup')} className="text-sm font-bold px-6 py-2.5 rounded-xl transition-all" style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}>New Session →</button>
                </div>
            </div>
        );
    }

    // ── Main layout ────────────────────────────────────────────────────────────
    const timerPct = timeLimitSecs > 0 ? (timeLeft / timeLimitSecs) * 100 : 100;
    
    return (
        <div className="flex flex-col h-[calc(100vh-80px)]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Top Bar ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surface }}>
                <div className="flex items-center gap-3">
                    <span className="font-extrabold text-sm truncate max-w-[220px]" style={{ color: C.navy }}>{problem?.title}</span>
                    {problem?.difficulty && (
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border`}
                              style={{
                                  color: problem.difficulty === 'Easy' ? C.green : problem.difficulty === 'Medium' ? C.yellow : problem.difficulty === 'Medium-Hard' ? C.orange : C.red,
                                  backgroundColor: problem.difficulty === 'Easy' ? C.greenLight : problem.difficulty === 'Medium' ? C.yellowLight : problem.difficulty === 'Medium-Hard' ? C.orangeLight : C.redLight,
                                  borderColor: `transparent`
                              }}>
                            {problem.difficulty}
                        </span>
                    )}
                    {company && (
                        <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border" style={{ color: C.steel, backgroundColor: C.steelLight, borderColor: 'transparent' }}>{company}</span>
                    )}
                    {/* Problem counter */}
                    <span className="text-xs font-bold" style={{ color: C.navyMuted }}>{problemIndex + 1}<span style={{ color: C.navyGhost }}>/{maxProblemsRef.current}</span></span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Countdown timer */}
                    {timeLeft !== null && (
                        <div className="flex flex-col items-end gap-1">
                            <span className={`font-mono text-sm font-bold tabular-nums`} style={{ color: timeLeft <= 120 ? C.red : timeLeft <= 300 ? C.yellow : C.navyMuted }}>{fmtTime(timeLeft)}</span>
                            <div className="w-24 rounded-full h-0.5 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                                <div className={`h-0.5 rounded-full transition-all duration-1000 linear`}
                                    style={{ width: `${timerPct}%`, backgroundColor: timerPct <= 20 ? C.red : timerPct <= 40 ? C.yellow : C.teal }} />
                            </div>
                        </div>
                    )}
                    {/* Language switcher */}
                    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                        {['Python', 'JavaScript', 'Java', 'C++'].map(lang => (
                            <button key={lang} onClick={() => handleLanguageChange(lang)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all`}
                                style={{
                                    backgroundColor: language === lang ? C.card : 'transparent',
                                    color: language === lang ? C.navy : C.navyGhost,
                                    border: language === lang ? `1px solid ${C.border}` : '1px solid transparent',
                                    boxShadow: language === lang ? '0 1px 3px rgba(26,72,114,0.05)' : 'none'
                                }}
                            >{lang}</button>
                        ))}
                    </div>
                    <button onClick={() => navigate('/setup')} className="px-3 py-2 text-xs font-bold rounded-xl transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.surfaceAlt }}>Exit</button>
                </div>
            </div>

            {/* ── Main Split Panel ────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left — Problem statement */}
                <div className="w-[42%] flex-shrink-0 overflow-y-auto p-6 space-y-5" style={{ borderRight: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt }}>
                    {/* Problem Description */}
                    <div>
                        <h2 className="text-lg font-extrabold mb-3" style={{ color: C.navy }}>{problem?.title}</h2>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium" style={{ color: C.navyMuted }}>{problem?.description}</p>
                    </div>

                    {/* Examples */}
                    {problem?.examples?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyGhost }}>Examples</p>
                            <div className="space-y-3">
                                {problem.examples.map((ex, i) => (
                                    <div key={i} className="rounded-xl p-4 text-sm" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 6px -1px rgba(26,72,114,0.02)' }}>
                                        <p className="text-xs mb-1.5 font-bold uppercase tracking-widest" style={{ color: C.tealDark }}>Example {i + 1}</p>
                                        <div className="space-y-1 font-mono text-xs font-semibold" style={{ color: C.navyMuted }}>
                                            <div><span style={{ color: C.navyGhost }}>Input: </span><span>{ex.input}</span></div>
                                            <div><span style={{ color: C.navyGhost }}>Output: </span><span style={{ color: C.teal }}>{ex.output}</span></div>
                                            {ex.explanation && <div className="text-[11px] mt-1.5 font-sans font-medium italic" style={{ color: C.navyGhost }}>{ex.explanation}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Constraints */}
                    {problem?.constraints?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyGhost }}>Constraints</p>
                            <ul className="space-y-1">
                                {problem.constraints.map((c, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs font-mono font-medium" style={{ color: C.navyMuted }}>
                                        <span className="mt-0.5" style={{ color: C.navyGhost }}>•</span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Complexity expected */}
                    {(problem?.timeComplexityExpected || problem?.spaceComplexityExpected) && (
                        <div className="flex gap-4">
                            {problem.timeComplexityExpected && (
                                <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                    <p className="mb-1 font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Time</p>
                                    <p className="font-mono font-bold" style={{ color: C.navyMuted }}>{problem.timeComplexityExpected}</p>
                                </div>
                            )}
                            {problem.spaceComplexityExpected && (
                                <div className="rounded-xl px-4 py-3 text-xs" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                    <p className="mb-1 font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Space</p>
                                    <p className="font-mono font-bold" style={{ color: C.navyMuted }}>{problem.spaceComplexityExpected}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hints */}
                    {problem?.hints?.length > 0 && (
                        <div>
                            <button onClick={() => setShowHints(!showHints)} className="text-xs font-bold transition-colors rounded-xl px-4 py-2" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.card }}>
                                💡 {showHints ? 'Hide Hints' : `Show Hint (${hintIndex + 1}/${problem.hints.length})`}
                            </button>
                            {showHints && (
                                <div className="mt-3 p-4 rounded-xl" style={{ backgroundColor: C.yellowLight, border: `1px solid rgba(212,134,10,0.2)` }}>
                                    <p className="text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: C.yellow }}>Hint {hintIndex + 1}</p>
                                    <p className="text-sm font-medium" style={{ color: C.navyMuted }}>{problem.hints[hintIndex]}</p>
                                    {hintIndex < problem.hints.length - 1 && (
                                        <button onClick={() => setHintIndex(i => i + 1)} className="text-xs mt-2 transition-colors font-bold uppercase tracking-widest" style={{ color: C.yellow }}>
                                            Next hint →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right — Editor + Results */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Tabs */}
                    <div className="flex items-center gap-0 border-b border-white/5 px-4 pt-1 flex-shrink-0" style={{ backgroundColor: C.surface }}>
                        {[{ id: 'editor', label: 'Code' }, { id: 'results', label: evaluation ? `Results ${evaluation.passed ? '✅' : '❌'}` : 'Results' }].map(tab => (
                            <button key={tab.id} onClick={() => setRightTab(tab.id)}
                                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest border-b-2 transition-all -mb-px relative`}
                                style={{
                                    borderColor: rightTab === tab.id ? C.teal : 'transparent',
                                    color: rightTab === tab.id ? C.navy : C.navyGhost
                                }}
                            >{tab.label}</button>
                        ))}
                    </div>

                    {/* Editor */}
                    {rightTab === 'editor' && (
                        <div className="flex-1 overflow-hidden">
                            <Editor
                                height="100%"
                                language={MONACO_LANG[language] || 'python'}
                                value={code}
                                onChange={val => setCode(val || '')}
                                theme="light"
                                options={{
                                    fontSize: 14,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    lineNumbers: 'on',
                                    glyphMargin: false,
                                    folding: false,
                                    lineDecorationsWidth: 8,
                                    padding: { top: 16, bottom: 16 },
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                    tabSize: 4,
                                    renderWhitespace: 'none',
                                    cursorBlinking: 'smooth',
                                }}
                            />
                        </div>
                    )}

                    {/* Results panel */}
                    {rightTab === 'results' && (
                        <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: C.surfaceAlt }}>
                            {!evaluation ? (
                                <div className="flex flex-col items-center justify-center h-48 text-sm font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>
                                    Run your code to see results here
                                </div>
                            ) : (
                                <>
                                    {/* Score + Pass rate */}
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-xl border flex-1 text-center`} style={{ backgroundColor: evaluation.passed ? C.greenLight : C.redLight, borderColor: evaluation.passed ? 'rgba(39,174,96,0.2)' : 'rgba(192,57,43,0.2)' }}>
                                            <div className={`text-xl font-extrabold mb-1 uppercase tracking-wider`} style={{ color: evaluation.passed ? C.green : C.red }}>{evaluation.passed ? '✅ Accepted' : '❌ Wrong Answer'}</div>
                                            <div className="text-xs font-bold" style={{ color: C.navyMuted }}>{evaluation.passedCount} / {evaluation.totalCount} test cases passed</div>
                                        </div>
                                        <div className="rounded-xl p-4 text-center flex-shrink-0" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                            <div className="text-2xl font-bold mb-1" style={{ color: C.navy }}>{evaluation.score}<span className="text-base" style={{ color: C.navyGhost }}>/10</span></div>
                                            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>Score</div>
                                        </div>
                                    </div>

                                    {/* Complexity */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.navyGhost }}>Time</p>
                                            <p className="text-sm font-mono font-bold" style={{ color: C.navyMuted }}>{evaluation.timeComplexity || 'N/A'}</p>
                                        </div>
                                        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                            <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: C.navyGhost }}>Space</p>
                                            <p className="text-sm font-mono font-bold" style={{ color: C.navyMuted }}>{evaluation.spaceComplexity || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Test case results */}
                                    {evaluation.testResults?.length > 0 && (
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyGhost }}>Test Cases</p>
                                            <div className="space-y-2">
                                                {evaluation.testResults.map((t, i) => (
                                                    <div key={i} className={`p-3.5 rounded-xl border text-xs`} style={{ backgroundColor: t.passed ? C.greenLight : C.redLight, borderColor: t.passed ? 'rgba(39,174,96,0.2)' : 'rgba(192,57,43,0.2)' }}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span>{t.passed ? '✅' : '❌'}</span>
                                                            <span className="font-bold" style={{ color: C.navy }}>Case {i + 1}</span>
                                                            {t.notes && <span className="ml-auto font-medium italic text-black/40">— {t.notes}</span>}
                                                        </div>
                                                        <div className="space-y-1 font-mono text-[11px] font-bold" style={{ color: C.navyMuted }}>
                                                            <div><span style={{ color: C.navyGhost }}>Input: </span><span>{t.input}</span></div>
                                                            <div><span style={{ color: C.navyGhost }}>Expected: </span><span style={{ color: C.green }}>{t.expected}</span></div>
                                                            {!t.passed && <div><span style={{ color: C.navyGhost }}>Got: </span><span style={{ color: C.red }}>{t.actual}</span></div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Feedback */}
                                    <div className="p-4 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.tealDark }}>AI Feedback</p>
                                        <p className="text-sm leading-relaxed font-semibold text-black/80">{evaluation.overallFeedback}</p>
                                    </div>

                                    {/* Improvements */}
                                    {evaluation.improvements?.length > 0 && (
                                        <div className="p-4 rounded-xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                                            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyGhost }}>Improvements</p>
                                            <ul className="space-y-2">{evaluation.improvements.map((imp, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm font-semibold" style={{ color: C.navyMuted }}>
                                                    <span className="mt-0.5 flex-shrink-0" style={{ color: C.teal }}>→</span>{imp}
                                                </li>
                                            ))}</ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Run Code Bar */}
                    <div className="p-3 flex items-center justify-between flex-shrink-0" style={{ borderTop: `1px solid ${C.border}`, backgroundColor: C.surface }}>
                        <div className="flex items-center gap-3">
                            {evaluation && <span className="text-xs font-bold uppercase tracking-widest" style={{ color: C.navyGhost }}>{evaluation.passed ? '✅ All tests passed' : `⚠️ ${evaluation.passedCount}/${evaluation.totalCount} passed`}</span>}
                        </div>
                        <div className="flex items-center gap-2">
                            {evaluation && (
                                <>
                                    <button onClick={() => { setEvaluation(null); setRightTab('editor'); }}
                                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all" style={{ border: `1px solid ${C.border}`, color: C.navyMuted, backgroundColor: C.surfaceAlt }}>
                                        Reset
                                    </button>
                                    <button onClick={handleNextProblem}
                                        className="px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all" style={{ border: `1px solid ${C.tealBorder}`, color: C.teal }}>
                                        {problemIndex + 1 >= maxProblemsRef.current ? 'Finish Session 🏆' : 'Next Problem →'}
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleRunCode}
                                disabled={evaluating || !code.trim()}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, color: '#fff', boxShadow: '0 4px 15px rgba(82,183,136,0.3)' }}
                            >
                                {evaluating ? (
                                    <><div className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Evaluating...</>
                                ) : (
                                    <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>Run Code</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
