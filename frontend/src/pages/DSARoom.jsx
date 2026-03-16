import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

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

    const [rightTab, setRightTab] = useState('editor'); // 'editor' | 'results'
    const [showHints, setShowHints] = useState(false);
    const [hintIndex, setHintIndex] = useState(0);

    useEffect(() => {
        fetchProblem();
        // eslint-disable-next-line
    }, []);

    const fetchProblem = async () => {
        setLoading(true);
        setEvaluation(null);
        setRightTab('editor');
        setShowHints(false);
        setHintIndex(0);
        setStatusText(`Generating ${problem ? 'next' : 'first'} problem for ${company}...`);
        try {
            const res = await api.post('/dsa/problem', {
                company: company || 'TCS',
                language,
                topic: topic || '',
                previousProblems
            });
            setProblem(res.data);
            // Set starter code from API if provided, else use defaults
            const starter = res.data.starterCode
                ? fixIndent(res.data.starterCode)
                : DEFAULT_CODE[language];
            setCode(starter);
            setPreviousProblems(prev => [...prev, { title: res.data.title, topic: res.data.topic }]);
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
        try {
            const res = await api.post('/dsa/evaluate', { problem, code, language });
            setEvaluation(res.data);
            setRightTab('results');
        } catch (err) {
            console.error(err);
        } finally {
            setEvaluating(false);
        }
    };

    // ── Loading screen ─────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm animate-pulse">{statusText}</p>
        </div>
    );

    // ── Main layout ────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-80px)]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Top Bar ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-white font-semibold text-sm truncate max-w-[260px]">{problem?.title}</span>
                    {problem?.difficulty && (
                        <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${TIER_BADGE[problem.difficulty] || TIER_BADGE.Medium}`}>
                            {problem.difficulty}
                        </span>
                    )}
                    {company && (
                        <span className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/40 bg-white/5">{company}</span>
                    )}
                    {problem?.topic && (
                        <span className="text-xs px-2.5 py-1 rounded-full border border-white/8 text-white/30">{problem.topic}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Language switcher */}
                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/8 rounded-xl">
                        {['Python', 'JavaScript', 'Java', 'C++'].map(lang => (
                            <button key={lang} onClick={() => handleLanguageChange(lang)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${language === lang ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                            >{lang}</button>
                        ))}
                    </div>
                    <button onClick={fetchProblem} className="flex items-center gap-1.5 px-3 py-2 text-xs text-white/40 hover:text-white border border-white/8 hover:border-white/20 rounded-xl transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Next
                    </button>
                    <button onClick={() => navigate('/setup')} className="px-3 py-2 text-xs text-white/30 hover:text-white border border-white/8 hover:border-white/20 rounded-xl transition-all">Exit</button>
                </div>
            </div>

            {/* ── Main Split Panel ────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left — Problem statement */}
                <div className="w-[42%] flex-shrink-0 border-r border-white/5 overflow-y-auto p-6 space-y-5">
                    {/* Problem Description */}
                    <div>
                        <h2 className="text-base font-bold text-white mb-3">{problem?.title}</h2>
                        <p className="text-white/60 text-sm leading-relaxed whitespace-pre-wrap">{problem?.description}</p>
                    </div>

                    {/* Examples */}
                    {problem?.examples?.length > 0 && (
                        <div>
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Examples</p>
                            <div className="space-y-3">
                                {problem.examples.map((ex, i) => (
                                    <div key={i} className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-sm">
                                        <p className="text-white/40 text-xs mb-1.5 font-medium">Example {i + 1}</p>
                                        <div className="space-y-1 font-mono text-xs">
                                            <div><span className="text-white/30">Input: </span><span className="text-white/70">{ex.input}</span></div>
                                            <div><span className="text-white/30">Output: </span><span className="text-green-400">{ex.output}</span></div>
                                            {ex.explanation && <div className="text-white/30 text-[11px] mt-1.5 font-sans">{ex.explanation}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Constraints */}
                    {problem?.constraints?.length > 0 && (
                        <div>
                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Constraints</p>
                            <ul className="space-y-1">
                                {problem.constraints.map((c, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-white/40 font-mono">
                                        <span className="text-white/20 mt-0.5">•</span>{c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Complexity expected */}
                    {(problem?.timeComplexityExpected || problem?.spaceComplexityExpected) && (
                        <div className="flex gap-4">
                            {problem.timeComplexityExpected && (
                                <div className="bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-xs">
                                    <p className="text-white/25 mb-1">Time</p>
                                    <p className="text-white/60 font-mono font-medium">{problem.timeComplexityExpected}</p>
                                </div>
                            )}
                            {problem.spaceComplexityExpected && (
                                <div className="bg-white/[0.02] border border-white/8 rounded-xl px-4 py-3 text-xs">
                                    <p className="text-white/25 mb-1">Space</p>
                                    <p className="text-white/60 font-mono font-medium">{problem.spaceComplexityExpected}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hints */}
                    {problem?.hints?.length > 0 && (
                        <div>
                            <button onClick={() => setShowHints(!showHints)} className="text-xs text-white/30 hover:text-white/60 transition-colors border border-white/8 rounded-xl px-4 py-2 hover:border-white/20">
                                💡 {showHints ? 'Hide Hints' : `Show Hint (${hintIndex + 1}/${problem.hints.length})`}
                            </button>
                            {showHints && (
                                <div className="mt-3 p-4 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
                                    <p className="text-yellow-400/70 text-xs mb-1.5">Hint {hintIndex + 1}</p>
                                    <p className="text-white/60 text-sm">{problem.hints[hintIndex]}</p>
                                    {hintIndex < problem.hints.length - 1 && (
                                        <button onClick={() => setHintIndex(i => i + 1)} className="text-xs text-yellow-400/50 hover:text-yellow-400 mt-2 transition-colors">
                                            Next hint →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right — Editor + Results */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex items-center gap-0 border-b border-white/5 px-4 pt-1 flex-shrink-0">
                        {[{ id: 'editor', label: 'Code' }, { id: 'results', label: evaluation ? `Results ${evaluation.passed ? '✅' : '❌'}` : 'Results' }].map(tab => (
                            <button key={tab.id} onClick={() => setRightTab(tab.id)}
                                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px ${rightTab === tab.id ? 'border-white text-white' : 'border-transparent text-white/30 hover:text-white/60'}`}
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
                                theme="vs-dark"
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
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {!evaluation ? (
                                <div className="flex flex-col items-center justify-center h-48 text-white/20 text-sm">
                                    Run your code to see results here
                                </div>
                            ) : (
                                <>
                                    {/* Score + Pass rate */}
                                    <div className="flex items-center gap-4">
                                        <div className={`p-4 rounded-xl border flex-1 text-center ${evaluation.passed ? 'border-green-500/20 bg-green-500/8' : 'border-red-500/20 bg-red-500/8'}`}>
                                            <div className={`text-2xl font-bold mb-1 ${evaluation.passed ? 'text-green-400' : 'text-red-400'}`}>{evaluation.passed ? '✅ Accepted' : '❌ Wrong Answer'}</div>
                                            <div className="text-xs text-white/30">{evaluation.passedCount}/{evaluation.totalCount} test cases passed</div>
                                        </div>
                                        <div className="bg-white/[0.03] border border-white/8 rounded-xl p-4 text-center flex-shrink-0">
                                            <div className="text-2xl font-bold text-white mb-1">{evaluation.score}<span className="text-white/30 text-base">/10</span></div>
                                            <div className="text-xs text-white/30">Score</div>
                                        </div>
                                    </div>

                                    {/* Complexity */}
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-white/[0.02] border border-white/8 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-white/25 mb-1">Time</p>
                                            <p className="text-sm font-mono text-white/60 font-medium">{evaluation.timeComplexity || 'N/A'}</p>
                                        </div>
                                        <div className="flex-1 bg-white/[0.02] border border-white/8 rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-white/25 mb-1">Space</p>
                                            <p className="text-sm font-mono text-white/60 font-medium">{evaluation.spaceComplexity || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Test case results */}
                                    {evaluation.testResults?.length > 0 && (
                                        <div>
                                            <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Test Cases</p>
                                            <div className="space-y-2">
                                                {evaluation.testResults.map((t, i) => (
                                                    <div key={i} className={`p-3.5 rounded-xl border text-xs ${t.passed ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span>{t.passed ? '✅' : '❌'}</span>
                                                            <span className="text-white/40 font-medium">Case {i + 1}</span>
                                                            {t.notes && <span className="text-white/25 ml-auto">— {t.notes}</span>}
                                                        </div>
                                                        <div className="space-y-1 font-mono text-[11px]">
                                                            <div><span className="text-white/25">Input: </span><span className="text-white/50">{t.input}</span></div>
                                                            <div><span className="text-white/25">Expected: </span><span className="text-green-400/70">{t.expected}</span></div>
                                                            {!t.passed && <div><span className="text-white/25">Got: </span><span className="text-red-400/70">{t.actual}</span></div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Feedback */}
                                    <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl">
                                        <p className="text-xs text-white/30 uppercase tracking-widest mb-2">AI Feedback</p>
                                        <p className="text-white/60 text-sm leading-relaxed">{evaluation.overallFeedback}</p>
                                    </div>

                                    {/* Improvements */}
                                    {evaluation.improvements?.length > 0 && (
                                        <div className="p-4 bg-white/[0.02] border border-white/8 rounded-xl">
                                            <p className="text-xs text-white/30 uppercase tracking-widest mb-3">Improvements</p>
                                            <ul className="space-y-2">{evaluation.improvements.map((imp, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-white/50">
                                                    <span className="text-white/20 mt-0.5 flex-shrink-0">→</span>{imp}
                                                </li>
                                            ))}</ul>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Run Code Bar */}
                    <div className="border-t border-white/5 p-3 flex items-center justify-between flex-shrink-0 bg-[#0a0a0a]">
                        <div className="text-xs text-white/20">
                            {evaluation && (evaluation.passed ? '✅ All tests passed' : `⚠️ ${evaluation.passedCount}/${evaluation.totalCount} passed`)}
                        </div>
                        <div className="flex items-center gap-2">
                            {evaluation && (
                                <button onClick={() => { setEvaluation(null); setRightTab('editor'); }}
                                    className="px-4 py-2 text-xs text-white/40 border border-white/8 hover:border-white/20 hover:text-white rounded-lg transition-all">
                                    Reset
                                </button>
                            )}
                            <button
                                onClick={handleRunCode}
                                disabled={evaluating || !code.trim()}
                                className="flex items-center gap-2 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-white/90 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                {evaluating ? (
                                    <><div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />Evaluating...</>
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
