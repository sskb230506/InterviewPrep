import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtTime = (secs) => {
    if (!secs || secs < 60) return `${secs || 0}s`;
    const m = Math.floor(secs / 60), s = secs % 60;
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m${s > 0 ? ` ${s}s` : ''}`;
};

const DIFF_STYLE = {
    Easy: 'text-green-400 bg-green-400/10 border-green-400/20',
    Medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'Medium-Hard': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    Hard: 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stat({ label, value, sub, icon }) {
    return (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors">
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
            </div>
            <p className="text-white/30 text-xs font-medium mb-0.5">{label}</p>
            <p className="text-2xl font-bold text-white tracking-tight">{value ?? '—'}</p>
            {sub && <p className="text-white/20 text-xs mt-1">{sub}</p>}
        </div>
    );
}

function SectionHeader({ emoji, title, sub }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <h2 className="text-base font-bold text-white">{title}</h2>
            </div>
            {sub && <span className="text-xs text-white/30">{sub}</span>}
        </div>
    );
}

function ProgressBar({ label, value, max = 10, color = 'bg-white/40', right }) {
    const pct = Math.min((value / max) * 100, 100);
    return (
        <div>
            <div className="flex justify-between text-xs mb-1.5">
                <span className="text-white/50">{label}</span>
                <span className="text-white/60 font-medium">{right || `${value}/${max}`}</span>
            </div>
            <div className="w-full bg-white/6 rounded-full h-1.5 overflow-hidden">
                <div className={`h-1.5 rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function ScoreChart({ trend }) {
    if (!trend || trend.length === 0) return (
        <div className="h-40 flex items-center justify-center text-white/20 text-sm">No data yet</div>
    );
    const maxScore = 10;
    const modeColor = { interview: 'bg-blue-400/50', dsa: 'bg-green-400/50', mcq: 'bg-purple-400/50', 'voice-concepts': 'bg-yellow-400/50' };

    return (
        <div className="h-40 flex items-end gap-1.5">
            {trend.slice(-20).map((t, i) => {
                const h = (t.score / maxScore) * 100;
                const color = modeColor[t.mode] || 'bg-white/30';
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1a1a1a] border border-white/10 rounded-lg px-2 py-1 z-10 whitespace-nowrap text-[10px] text-white/70 pointer-events-none">
                            {t.score}/10 · {t.mode}
                        </div>
                        <div className="w-full bg-white/5 rounded-t relative" style={{ height: '100%' }}>
                            <div className={`absolute bottom-0 w-full ${color} group-hover:brightness-125 rounded-t transition-all duration-500`} style={{ height: `${h}%` }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview'); // overview | dsa | concepts | interview
    const navigate = useNavigate();

    useEffect(() => { fetchDashboard(); }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/analytics/dashboard');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4">
            <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Loading analytics...</p>
        </div>
    );

    const hasAnyData = data && (data.totalAnswered > 0 || data.dsa?.totalAttempted > 0 || data.concepts?.mcqTotal > 0);

    if (!hasAnyData) return (
        <div className="max-w-md mx-auto mt-20 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="text-5xl mb-6">📊</div>
            <h2 className="text-xl font-bold text-white mb-2">No data yet</h2>
            <p className="text-white/30 text-sm leading-relaxed mb-8">
                Complete a Mock Interview, Core Concepts quiz, or DSA session to see your analytics here.
            </p>
            <button onClick={() => navigate('/setup')} className="bg-white text-black text-sm font-semibold px-6 py-3 rounded-xl hover:bg-white/90 transition-all">
                Start a Session →
            </button>
        </div>
    );

    const { interview, dsa, concepts, trend, totalTimeSeconds, overallAvg } = data;

    return (
        <div className="max-w-5xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs text-white/40 mb-4 bg-white/5">
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                    Analytics
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">Performance Dashboard</h1>
                        <p className="text-white/30 text-sm">All your practice data in one place.</p>
                    </div>
                    <button onClick={fetchDashboard} className="text-xs text-white/30 hover:text-white flex items-center gap-1.5 border border-white/8 hover:border-white/20 px-3 py-2 rounded-xl transition-all">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        Refresh
                    </button>
                </div>
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Stat label="Total Answered" value={data.questionsAnswered} icon="🎯" sub="across all modes" />
                <Stat label="Overall Avg." value={overallAvg ? `${overallAvg}/10` : '—'} icon="⭐" sub="all submissions" />
                <Stat label="Total Practice Time" value={fmtTime(totalTimeSeconds)} icon="⏱️" sub="timed sessions" />
                <Stat label="Sessions" value={data.sessionsCompleted} icon="🗂️" sub="all modes" />
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 bg-white/5 border border-white/8 rounded-xl w-fit mb-6">
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'dsa', label: '💻 DSA' },
                    { id: 'concepts', label: '📚 Concepts' },
                    { id: 'interview', label: '🎙️ Interview' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all duration-150 font-medium ${tab === t.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                    >{t.label}</button>
                ))}
            </div>

            {/* ── Overview Tab ───────────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Score trend chart */}
                    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                        <SectionHeader emoji="📈" title="Score Trend" sub="Last 20 submissions" />
                        <ScoreChart trend={trend} />
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-4">
                            {[['interview', 'bg-blue-400/50', '🎙️ Interview'], ['dsa', 'bg-green-400/50', '💻 DSA'], ['mcq', 'bg-purple-400/50', '📝 MCQ'], ['voice-concepts', 'bg-yellow-400/50', '🎤 Concepts Voice']].map(([k, c, l]) => (
                                <div key={k} className="flex items-center gap-1.5 text-xs text-white/30">
                                    <div className={`w-2.5 h-2.5 rounded-sm ${c}`} />{l}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mode summary cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* DSA card */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                            <div className="text-lg mb-2">💻</div>
                            <h3 className="text-sm font-bold text-white mb-3">DSA Practice</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span className="text-white/40">Attempted</span><span className="text-white font-semibold">{dsa.totalAttempted}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Pass Rate</span><span className={`font-semibold ${dsa.passRate >= 70 ? 'text-green-400' : dsa.passRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{dsa.passRate}%</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Avg Score</span><span className="text-white font-semibold">{dsa.avgScore}/10</span></div>
                            </div>
                            <button onClick={() => setTab('dsa')} className="text-xs text-white/30 hover:text-white mt-3 transition-colors">View details →</button>
                        </div>

                        {/* MCQ card */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                            <div className="text-lg mb-2">📝</div>
                            <h3 className="text-sm font-bold text-white mb-3">Core Concepts (MCQ)</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span className="text-white/40">Attempted</span><span className="text-white font-semibold">{concepts.mcqTotal}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Accuracy</span><span className={`font-semibold ${concepts.mcqAccuracy >= 70 ? 'text-green-400' : concepts.mcqAccuracy >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{concepts.mcqAccuracy}%</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Correct</span><span className="text-white font-semibold">{concepts.mcqCorrect}/{concepts.mcqTotal}</span></div>
                            </div>
                            <button onClick={() => setTab('concepts')} className="text-xs text-white/30 hover:text-white mt-3 transition-colors">View details →</button>
                        </div>

                        {/* Interview card */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
                            <div className="text-lg mb-2">🎙️</div>
                            <h3 className="text-sm font-bold text-white mb-3">Mock Interview</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span className="text-white/40">Sessions</span><span className="text-white font-semibold">{interview.sessionsCompleted}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Answered</span><span className="text-white font-semibold">{interview.questionsAnswered}</span></div>
                                <div className="flex justify-between text-xs"><span className="text-white/40">Tech Avg.</span><span className="text-white font-semibold">{interview.averages?.tech || '—'}</span></div>
                            </div>
                            <button onClick={() => setTab('interview')} className="text-xs text-white/30 hover:text-white mt-3 transition-colors">View details →</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DSA Tab ────────────────────────────────────────────────────── */}
            {tab === 'dsa' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="Problems Attempted" value={dsa.totalAttempted} icon="💻" />
                        <Stat label="Passed" value={dsa.totalPassed} icon="✅" sub={`${dsa.passRate}% pass rate`} />
                        <Stat label="Avg Score" value={`${dsa.avgScore}/10`} icon="⭐" />
                        <Stat label="Failed" value={dsa.totalAttempted - dsa.totalPassed} icon="❌" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* By difficulty */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="🎯" title="By Difficulty" />
                            <div className="space-y-4">
                                {Object.entries(dsa.byDifficulty).filter(([, v]) => v > 0).map(([diff, total]) => {
                                    const passed = dsa.byDifficultyPassed[diff] || 0;
                                    const rate = total > 0 ? Math.round((passed / total) * 100) : 0;
                                    return (
                                        <div key={diff}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DIFF_STYLE[diff]}`}>{diff}</span>
                                                </div>
                                                <span className="text-xs text-white/50">{passed}/{total} passed · {rate}%</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                <div className={`h-1.5 rounded-full transition-all duration-700 ${rate >= 70 ? 'bg-green-400/60' : rate >= 50 ? 'bg-yellow-400/60' : 'bg-red-400/60'}`} style={{ width: `${rate}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.values(dsa.byDifficulty).every(v => v === 0) && (
                                    <p className="text-white/20 text-sm text-center py-4">No DSA submissions yet</p>
                                )}
                            </div>
                        </div>

                        {/* Top topics */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="🏷️" title="Practiced Topics" />
                            {dsa.topTopics?.length > 0 ? (
                                <div className="space-y-3">
                                    {dsa.topTopics.map(({ topic, count }) => (
                                        <ProgressBar key={topic} label={topic} value={count} max={Math.max(...dsa.topTopics.map(t => t.count), 1)} right={`${count} problems`} color="bg-green-400/40" />
                                    ))}
                                </div>
                            ) : <p className="text-white/20 text-sm text-center py-4">No topic data yet</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Concepts Tab ───────────────────────────────────────────────── */}
            {tab === 'concepts' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Stat label="MCQ Attempted" value={concepts.mcqTotal} icon="📝" />
                        <Stat label="MCQ Accuracy" value={`${concepts.mcqAccuracy}%`} icon="🎯" sub={`${concepts.mcqCorrect} correct`} />
                        <Stat label="Voice Answers" value={concepts.voiceTotal} icon="🎤" />
                        <Stat label="Voice Avg." value={`${concepts.voiceAvgScore}/10`} icon="⭐" />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* MCQ Accuracy bar */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="📊" title="MCQ Accuracy" sub={`${concepts.mcqCorrect} of ${concepts.mcqTotal}`} />
                            <div className="flex items-center justify-center mb-4">
                                <div className="relative w-28 h-28">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                                        <circle cx="50" cy="50" r="40" fill="none"
                                            stroke={concepts.mcqAccuracy >= 70 ? '#4ade80' : concepts.mcqAccuracy >= 50 ? '#facc15' : '#f87171'}
                                            strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={`${(concepts.mcqAccuracy / 100) * 251} 251`}
                                            style={{ transition: 'stroke-dasharray 1s ease' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white">{concepts.mcqAccuracy}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 text-xs">
                                <div className="text-center"><div className="text-green-400 font-bold text-lg">{concepts.mcqCorrect}</div><div className="text-white/30">Correct</div></div>
                                <div className="text-center"><div className="text-red-400 font-bold text-lg">{concepts.mcqTotal - concepts.mcqCorrect}</div><div className="text-white/30">Wrong</div></div>
                            </div>
                        </div>

                        {/* Weak topics */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="⚠️" title="Weak Topics" sub="needs improvement" />
                            {concepts.weakTopics?.length > 0 ? (
                                <div className="space-y-3">
                                    {concepts.weakTopics.map(({ topic, accuracy, total }) => (
                                        <div key={topic}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-white/50">{topic}</span>
                                                <span className="text-red-400 font-medium">{accuracy}% · {total} questions</span>
                                            </div>
                                            <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                <div className="h-1.5 rounded-full bg-red-400/50 transition-all duration-700" style={{ width: `${accuracy}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="text-2xl mb-2">🎉</div>
                                    <p className="text-white/30 text-sm">{concepts.mcqTotal > 0 ? 'No weak topics — great job!' : 'Complete some MCQs to see weak areas'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top topics practiced */}
                    {concepts.topTopics?.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="🏷️" title="Most Practiced Topics" />
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                                {concepts.topTopics.map(({ topic, count }) => (
                                    <ProgressBar key={topic} label={topic} value={count} max={Math.max(...concepts.topTopics.map(t => t.count), 1)} right={`${count}×`} color="bg-purple-400/40" />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Interview Tab ──────────────────────────────────────────────── */}
            {tab === 'interview' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <Stat label="Sessions" value={interview.sessionsCompleted} icon="🗂️" />
                        <Stat label="Questions Answered" value={interview.questionsAnswered} icon="❓" />
                        <Stat label="Avg Score" value={interview.averages ? `${interview.averages.tech}/10` : '—'} icon="⭐" sub="technical" />
                    </div>

                    {interview.averages && (
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
                            <SectionHeader emoji="📊" title="Skill Breakdown" />
                            <div className="space-y-5">
                                <ProgressBar label="Technical Accuracy" value={parseFloat(interview.averages.tech)} max={10} color="bg-blue-400/50" right={`${interview.averages.tech}/10`} />
                                <ProgressBar label="Answer Relevance" value={parseFloat(interview.averages.relevance)} max={10} color="bg-purple-400/50" right={`${interview.averages.relevance}/10`} />
                                <ProgressBar label="Depth & Detail" value={parseFloat(interview.averages.depth)} max={10} color="bg-indigo-400/50" right={`${interview.averages.depth}/10`} />
                            </div>
                        </div>
                    )}

                    {!interview.averages && (
                        <div className="text-center py-12">
                            <div className="text-3xl mb-3">🎙️</div>
                            <p className="text-white/30 text-sm">Complete a Mock Interview to see skill analytics here.</p>
                            <button onClick={() => navigate('/setup')} className="mt-4 bg-white text-black text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-white/90 transition-all">Start Interview →</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
