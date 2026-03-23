import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Constants & Helpers ────────────────────────────────────────────────────────
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
        <div className="rounded-2xl p-5 hover:bg-white/50 transition-colors" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px rgba(26,72,114,0.06)` }}>
            <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{icon}</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: C.navyFaint }}>{label}</p>
            <p className="text-2xl font-bold tracking-tight" style={{ color: C.navy }}>{value ?? '—'}</p>
            {sub && <p className="text-xs mt-1" style={{ color: C.navyGhost }}>{sub}</p>}
        </div>
    );
}

function SectionHeader({ emoji, title, sub }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <span>{emoji}</span>
                <h2 className="text-base font-bold" style={{ color: C.navy }}>{title}</h2>
            </div>
            {sub && <span className="text-xs" style={{ color: C.navyGhost }}>{sub}</span>}
        </div>
    );
}

function ProgressBar({ label, value, max = 10, color, right }) {
    const pct = Math.min((value / max) * 100, 100);
    const barColor = pct >= 70 ? C.green : pct >= 50 ? C.yellow : C.red;
    return (
        <div>
            <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold uppercase" style={{ color: C.navyFaint }}>{label}</span>
                <span className="font-medium" style={{ color: C.navyMuted }}>{right || `${value}/${max}`}</span>
            </div>
            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
            </div>
        </div>
    );
}

function ScoreChart({ trend }) {
    if (!trend || trend.length === 0) return (
        <div className="h-40 flex items-center justify-center text-sm" style={{ color: C.navyGhost }}>No data yet</div>
    );
    const maxScore = 10;
    const modeColor = { interview: C.steel, dsa: C.green, mcq: C.navy, 'voice-concepts': C.yellow };

    return (
        <div className="h-40 flex items-end gap-1.5">
            {trend.slice(-20).map((t, i) => {
                const h = (t.score / maxScore) * 100;
                const color = modeColor[t.mode] || C.navyLight;
                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-2 py-1 z-10 whitespace-nowrap text-[10px] pointer-events-none" style={{ backgroundColor: C.navy, color: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                            {t.score}/10 · {t.mode}
                        </div>
                        <div className="w-full rounded-t relative" style={{ height: '100%', backgroundColor: C.steelLight }}>
                            <div className="absolute bottom-0 w-full group-hover:brightness-110 rounded-t transition-all duration-500" style={{ height: `${h}%`, backgroundColor: color }} />
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
    const [tab, setTab] = useState('overview'); // overview | dsa | concepts | interview | history
    const navigate = useNavigate();

    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [historyFilter, setHistoryFilter] = useState('all'); // all, interview, dsa, mcq, voice-concepts

    const getRankBadge = (answered) => {
        if (answered >= 100) return { label: 'Legend', color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' };
        if (answered >= 50) return { label: 'Advanced', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
        if (answered >= 20) return { label: 'Intermediate', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
        if (answered > 0) return { label: 'Beginner', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
        return { label: 'Novice', color: 'bg-gray-100 text-gray-500 border-gray-200' };
    };

    const downloadSessionReport = () => {
        if (!sessionDetails) return;
        const s = sessionDetails.session;
        let text = `InterviewPrep Session Report\n`;
        text += `Mode: ${s.mode}\nDate: ${formatDate(s.createdAt)}\nRole: ${s.jobRole || 'General'}\n`;
        text += `-------------------------------------------------\n\n`;
        
        sessionDetails.details.forEach((item, i) => {
            text += `Question ${i + 1}: ${item.question?.text || 'Unknown'}\n`;
            text += `Your Answer: ${item.answer?.transcript || 'No answer provided'}\n\n`;
            if (item.evaluation) {
                text += `Feedback: ${item.evaluation.generalFeedback}\n`;
                text += `Scores - Tech: ${item.evaluation.scoreTech}/10 | Relevance: ${item.evaluation.scoreRelevance}/10 | Depth: ${item.evaluation.scoreDepth}/10 | Clarity: ${item.evaluation.scoreClarity}/10\n`;
            } else {
                text += `Evaluation: Not available\n`;
            }
            text += `\n-------------------------------------------------\n\n`;
        });

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-report-${s.mode}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    useEffect(() => { fetchDashboard(); fetchHistory(); }, []);

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

    const fetchHistory = async () => {
        try {
            setHistoryLoading(true);
            const res = await api.get('/interview/history');
            setHistoryData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const loadSessionDetails = async (id) => {
        try {
            setSelectedSessionId(id);
            setLoadingDetails(true);
            const res = await api.get(`/interview/history/${id}`);
            setSessionDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingDetails(false);
        }
    };

    const deleteSession = async (id, e) => {
        if (e) e.stopPropagation(); // prevent clicking the folder button
        const confirmDelete = window.confirm('Are you sure you want to delete this session? This action cannot be undone.');
        if (!confirmDelete) return;

        try {
            await api.delete(`/interview/history/${id}`);
            // Remove from the local list
            setHistoryData(prev => prev.filter(s => s._id !== id));
            if (selectedSessionId === id) {
                setSelectedSessionId(null);
                setSessionDetails(null);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to delete session.');
        }
    };

    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }} />
            <p className="text-sm" style={{ color: C.navyGhost }}>Loading analytics...</p>
        </div>
    );

    const hasAnyData = data && (data.totalAnswered > 0 || data.dsa?.totalAttempted > 0 || data.concepts?.mcqTotal > 0);

    if (!hasAnyData) return (
        <div className="max-w-md mx-auto mt-20 text-center" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="text-5xl mb-6">📊</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: C.navy }}>No data yet</h2>
            <p className="text-sm leading-relaxed mb-8" style={{ color: C.navyMuted }}>
                Complete a Mock Interview, Core Concepts quiz, or DSA session to see your analytics here.
            </p>
            <button onClick={() => navigate('/setup')} className="text-sm font-semibold px-6 py-3 rounded-xl transition-all" style={{ backgroundColor: C.navy, color: '#fff' }}>
                Start a Session →
            </button>
        </div>
    );

    const { interview, dsa, concepts, trend, totalTimeSeconds, overallAvg } = data;

    return (
        <div className="max-w-5xl mx-auto pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-4" style={{ backgroundColor: C.steelLight, color: C.steel, border: `1px solid ${C.steelBorder}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.steel }} />
                    Analytics
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: C.navy }}>Performance Dashboard</h1>
                            {data && (
                                <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full border ${getRankBadge(data.questionsAnswered).color}`}>
                                    {getRankBadge(data.questionsAnswered).label} Rank
                                </span>
                            )}
                        </div>
                        <p className="text-sm font-medium" style={{ color: C.navyGhost }}>All your practice data in one place.</p>
                    </div>
                    <button onClick={fetchDashboard} className="text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold" style={{ color: C.navyMuted, border: `1px solid ${C.border}`, backgroundColor: C.card }}>
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
            <div className="flex gap-1 p-1 rounded-xl w-fit mb-6 overflow-x-auto max-w-full" style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, boxShadow: '0 2px 10px rgba(26,72,114,0.03)' }}>
                {[
                    { id: 'overview', label: '📊 Overview' },
                    { id: 'dsa', label: '💻 DSA' },
                    { id: 'concepts', label: '📚 Concepts' },
                    { id: 'interview', label: '🎙️ Interview' },
                    { id: 'history', label: '🗂️ History' },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm transition-all duration-150 font-semibold`}
                        style={{ backgroundColor: tab === t.id ? C.navy : 'transparent', color: tab === t.id ? '#fff' : C.navyMuted }}
                    >{t.label}</button>
                ))}
            </div>

            {/* ── Overview Tab ───────────────────────────────────────────────── */}
            {tab === 'overview' && (
                <div className="space-y-6">
                    {/* Score trend chart */}
                    <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                        <SectionHeader emoji="📈" title="Score Trend" sub="Last 20 submissions" />
                        <ScoreChart trend={trend} />
                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-4">
                            {[['interview', C.steel, '🎙️ Interview'], ['dsa', C.green, '💻 DSA'], ['mcq', C.navy, '📝 MCQ'], ['voice-concepts', C.yellow, '🎤 Concepts Voice']].map(([k, c, l]) => (
                                <div key={k} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: C.navyMuted }}>
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />{l}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mode summary cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* DSA card */}
                        <div className="rounded-2xl p-5 hover:bg-white/50 transition-colors cursor-pointer" onClick={() => setTab('dsa')} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <div className="text-xl mb-3">💻</div>
                            <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>DSA Practice</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Attempted</span><span className="font-semibold" style={{ color: C.navy }}>{dsa.totalAttempted}</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Pass Rate</span><span className="font-semibold" style={{ color: dsa.passRate >= 70 ? C.green : dsa.passRate >= 50 ? C.yellow : C.red }}>{dsa.passRate}%</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Avg Score</span><span className="font-semibold" style={{ color: C.navy }}>{dsa.avgScore}/10</span></div>
                            </div>
                            <div className="text-xs font-semibold mt-4" style={{ color: C.teal }}>View details →</div>
                        </div>

                        {/* MCQ card */}
                        <div className="rounded-2xl p-5 hover:bg-white/50 transition-colors cursor-pointer" onClick={() => setTab('concepts')} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <div className="text-xl mb-3">📝</div>
                            <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>Core Concepts (MCQ)</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Attempted</span><span className="font-semibold" style={{ color: C.navy }}>{concepts.mcqTotal}</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Accuracy</span><span className="font-semibold" style={{ color: concepts.mcqAccuracy >= 70 ? C.green : concepts.mcqAccuracy >= 50 ? C.yellow : C.red }}>{concepts.mcqAccuracy}%</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Correct</span><span className="font-semibold" style={{ color: C.navy }}>{concepts.mcqCorrect}/{concepts.mcqTotal}</span></div>
                            </div>
                            <div className="text-xs font-semibold mt-4" style={{ color: C.teal }}>View details →</div>
                        </div>

                        {/* Interview card */}
                        <div className="rounded-2xl p-5 hover:bg-white/50 transition-colors cursor-pointer" onClick={() => setTab('interview')} style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <div className="text-xl mb-3">🎙️</div>
                            <h3 className="text-sm font-bold mb-3" style={{ color: C.navy }}>Mock Interview</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Sessions</span><span className="font-semibold" style={{ color: C.navy }}>{interview.sessionsCompleted}</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Answered</span><span className="font-semibold" style={{ color: C.navy }}>{interview.questionsAnswered}</span></div>
                                <div className="flex justify-between text-xs"><span style={{ color: C.navyGhost }}>Tech Avg.</span><span className="font-semibold" style={{ color: C.navy }}>{interview.averages?.tech || '—'}</span></div>
                            </div>
                            <div className="text-xs font-semibold mt-4" style={{ color: C.teal }}>View details →</div>
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
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
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
                                                <span className="text-xs font-medium" style={{ color: C.navyMuted }}>{passed}/{total} passed · {rate}%</span>
                                            </div>
                                            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                                                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${rate}%`, backgroundColor: rate >= 70 ? C.green : rate >= 50 ? C.yellow : C.red }} />
                                            </div>
                                        </div>
                                    );
                                })}
                                {Object.values(dsa.byDifficulty).every(v => v === 0) && (
                                    <p className="text-sm text-center py-4" style={{ color: C.navyGhost }}>No DSA submissions yet</p>
                                )}
                            </div>
                        </div>

                        {/* Top topics */}
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <SectionHeader emoji="🏷️" title="Practiced Topics" />
                            {dsa.topTopics?.length > 0 ? (
                                <div className="space-y-3">
                                    {dsa.topTopics.map(({ topic, count }) => (
                                        <ProgressBar key={topic} label={topic} value={count} max={Math.max(...dsa.topTopics.map(t => t.count), 1)} right={`${count} problems`} />
                                    ))}
                                </div>
                            ) : <p className="text-sm text-center py-4" style={{ color: C.navyGhost }}>No topic data yet</p>}
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
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <SectionHeader emoji="📊" title="MCQ Accuracy" sub={`${concepts.mcqCorrect} of ${concepts.mcqTotal}`} />
                            <div className="flex items-center justify-center mb-4">
                                <div className="relative w-28 h-28">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke={C.steelLight} strokeWidth="10" />
                                        <circle cx="50" cy="50" r="40" fill="none"
                                            stroke={concepts.mcqAccuracy >= 70 ? C.green : concepts.mcqAccuracy >= 50 ? C.yellow : C.red}
                                            strokeWidth="10" strokeLinecap="round"
                                            strokeDasharray={`${(concepts.mcqAccuracy / 100) * 251} 251`}
                                            style={{ transition: 'stroke-dasharray 1s ease' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold" style={{ color: C.navy }}>{concepts.mcqAccuracy}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-center gap-6 text-xs">
                                <div className="text-center"><div className="font-bold text-lg" style={{ color: C.green }}>{concepts.mcqCorrect}</div><div style={{ color: C.navyGhost }}>Correct</div></div>
                                <div className="text-center"><div className="font-bold text-lg" style={{ color: C.red }}>{concepts.mcqTotal - concepts.mcqCorrect}</div><div style={{ color: C.navyGhost }}>Wrong</div></div>
                            </div>
                        </div>

                        {/* Weak topics */}
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <SectionHeader emoji="⚠️" title="Weak Topics" sub="needs improvement" />
                            {concepts.weakTopics?.length > 0 ? (
                                <div className="space-y-3">
                                    {concepts.weakTopics.map(({ topic, accuracy, total }) => (
                                        <div key={topic}>
                                            <div className="flex justify-between text-xs mb-1.5">
                                                <span className="font-semibold" style={{ color: C.navyFaint }}>{topic}</span>
                                                <span className="font-medium" style={{ color: C.red }}>{accuracy}% · {total} questions</span>
                                            </div>
                                            <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: C.steelLight }}>
                                                <div className="h-1.5 rounded-full transition-all duration-700" style={{ backgroundColor: C.redLight, width: `${accuracy}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <div className="text-2xl mb-2">🎉</div>
                                    <p className="text-sm" style={{ color: C.navyGhost }}>{concepts.mcqTotal > 0 ? 'No weak topics — great job!' : 'Complete some MCQs to see weak areas'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top topics practiced */}
                    {concepts.topTopics?.length > 0 && (
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <SectionHeader emoji="🏷️" title="Most Practiced Topics" />
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                                {concepts.topTopics.map(({ topic, count }) => (
                                    <ProgressBar key={topic} label={topic} value={count} max={Math.max(...concepts.topTopics.map(t => t.count), 1)} right={`${count}×`} />
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
                        <div className="rounded-2xl p-6" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 4px 20px rgba(26,72,114,0.06)' }}>
                            <SectionHeader emoji="📊" title="Skill Breakdown" />
                            <div className="space-y-5">
                                <ProgressBar label="Technical Accuracy" value={parseFloat(interview.averages.tech)} max={10} right={`${interview.averages.tech}/10`} />
                                <ProgressBar label="Answer Relevance" value={parseFloat(interview.averages.relevance)} max={10} right={`${interview.averages.relevance}/10`} />
                                <ProgressBar label="Depth & Detail" value={parseFloat(interview.averages.depth)} max={10} right={`${interview.averages.depth}/10`} />
                            </div>
                        </div>
                    )}

                    {!interview.averages && (
                        <div className="text-center py-12">
                            <div className="text-3xl mb-3">🎙️</div>
                            <p className="text-sm" style={{ color: C.navyGhost }}>Complete a Mock Interview to see skill analytics here.</p>
                            <button onClick={() => navigate('/setup')} className="mt-4 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all" style={{ backgroundColor: C.navy, color: '#fff' }}>Start Interview →</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── History Tab ──────────────────────────────────────────────── */}
            {tab === 'history' && (
                <div className="w-full min-h-[500px] h-[600px] flex gap-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {/* Sidebar: List of Sessions */}
                    <div className="w-1/3 flex flex-col rounded-2xl overflow-hidden" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px rgba(26,72,114,0.04)` }}>
                        <div className="p-5" style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt }}>
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: C.navy }}>
                                    🗂️ Interview Folders
                                </h2>
                            </div>
                            <p className="text-xs mt-1 mb-4 font-medium" style={{ color: C.navyGhost }}>Your past practice sessions</p>
                            
                            <div className="flex p-1 rounded-lg" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
                                {['all', 'interview', 'dsa'].map(f => (
                                    <button 
                                        key={f}
                                        onClick={() => setHistoryFilter(f)}
                                        className={`flex-1 text-[11px] font-bold py-1.5 rounded-md capitalize transition-all ${historyFilter === f ? 'shadow-sm' : ''}`}
                                        style={{ backgroundColor: historyFilter === f ? C.navy : 'transparent', color: historyFilter === f ? '#fff' : C.navyMuted }}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                            {historyLoading ? (
                                <p className="text-sm text-center py-4 font-semibold" style={{ color: C.navyGhost }}>Loading sessions...</p>
                            ) : historyData.length === 0 ? (
                                <p className="text-sm text-center py-4 font-semibold" style={{ color: C.navyGhost }}>No past sessions found.</p>
                            ) : historyData.filter(s => historyFilter === 'all' || s.mode === historyFilter).length === 0 ? (
                                <p className="text-sm text-center py-4 font-semibold" style={{ color: C.navyGhost }}>No sessions found for this filter.</p>
                            ) : (
                                historyData.filter(s => historyFilter === 'all' || s.mode === historyFilter).map((session) => {
                                    const isSelected = selectedSessionId === session._id;
                                    return (
                                        <div key={session._id} className="relative group">
                                            <button
                                                onClick={() => loadSessionDetails(session._id)}
                                                className={`w-full text-left p-4 rounded-xl transition-all pr-10 hover:brightness-95`}
                                                style={{ 
                                                    backgroundColor: isSelected ? C.steelLight : C.surfaceAlt, 
                                                    border: `1px solid ${isSelected ? C.steelBorder : C.border}`,
                                                    boxShadow: isSelected ? `0 0 0 1px ${C.steel}` : 'none'
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm capitalize" style={{ color: C.navy }}>
                                                        {session.mode} Session
                                                    </span>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: 'rgba(26,72,114,0.05)', color: C.navyGhost }}>
                                                        {formatDate(session.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="text-xs line-clamp-1 mt-1 break-all" style={{ color: C.navyMuted }}>
                                                    Role: {session.jobRole || 'General'}
                                                </div>
                                            </button>
                                            <button 
                                                onClick={(e) => deleteSession(session._id, e)} 
                                                title="Delete Session"
                                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-red-400 hover:bg-red-400/20 transition-all ${isSelected ? 'opacity-100 block' : 'opacity-0 hidden group-hover:opacity-100 group-hover:block'}`}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Main Content: Session Details */}
                    <div className="w-2/3 rounded-2xl flex flex-col overflow-hidden relative" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px rgba(26,72,114,0.04)` }}>
                        {selectedSessionId && loadingDetails ? (
                            <div className="absolute inset-0 z-10 flex flex-col justify-center items-center" style={{ backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
                                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-3" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }}></div>
                                <p className="text-sm font-semibold" style={{ color: C.navyGhost }}>Loading details...</p>
                            </div>
                        ) : null}

                        {!selectedSessionId ? (
                            <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                                <div className="text-4xl mb-4 opacity-70">📂</div>
                                <p className="font-medium" style={{ color: C.navyMuted }}>Select a session folder from the left<br />to view questions and feedback.</p>
                            </div>
                        ) : sessionDetails ? (
                            <>
                                <div className="p-6 sticky top-0 z-0 flex items-start justify-between" style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfaceAlt }}>
                                    <div>
                                        <h2 className="text-2xl font-extrabold mb-2 capitalize tracking-tight" style={{ color: C.navy }}>
                                            {sessionDetails.session.mode} Session Overview
                                        </h2>
                                        <div className="flex flex-wrap gap-3 text-sm">
                                            <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(26,72,114,0.04)', color: C.navyMuted }}>
                                                Role: <strong style={{ color: C.navy }}>{sessionDetails.session.jobRole || 'General'}</strong>
                                            </span>
                                            <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(26,72,114,0.04)', color: C.navyMuted }}>
                                                Date: <strong style={{ color: C.navy }}>{formatDate(sessionDetails.session.createdAt)}</strong>
                                            </span>
                                            {sessionDetails.session.yoe > 0 && (
                                                <span className="px-3 py-1 rounded-lg" style={{ backgroundColor: 'rgba(26,72,114,0.04)', color: C.navyMuted }}>
                                                    Experience: <strong style={{ color: C.navy }}>{sessionDetails.session.yoe} years</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={downloadSessionReport}
                                        className="text-[11px] font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0"
                                        style={{ backgroundColor: C.navy, color: '#fff', boxShadow: '0 4px 12px rgba(26,72,114,0.15)' }}
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                        Export Report
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                                    {sessionDetails.details.length === 0 ? (
                                        <p className="text-center py-10 font-semibold" style={{ color: C.navyGhost }}>No questions answered in this session.</p>
                                    ) : (
                                        sessionDetails.details.map((item, index) => (
                                            <div key={item.question?._id || index} className="rounded-2xl p-5 relative overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: '0 2px 10px rgba(26,72,114,0.02)' }}>
                                                {/* Question Area */}
                                                <div className="mb-4">
                                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: C.navyFaint }}>
                                                        <span>Question {index + 1}</span>
                                                        {item.question?.difficulty && (
                                                            <span className={`px-2 py-0.5 rounded-full border ${item.question.difficulty === 'Easy' ? 'text-green-600 border-green-500/20 bg-green-500/10' :
                                                                    item.question.difficulty === 'Medium' ? 'text-yellow-600 border-yellow-500/20 bg-yellow-500/10' :
                                                                        'text-red-600 border-red-500/20 bg-red-500/10'
                                                                }`}>
                                                                {item.question.difficulty}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-base leading-relaxed font-bold tracking-tight" style={{ color: C.navy }}>
                                                        {item.question?.text || "Unknown Question"}
                                                    </p>
                                                </div>

                                                {/* User's Answer */}
                                                <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}` }}>
                                                    <span className="text-xs uppercase font-bold mb-2 block tracking-wider flex items-center gap-1.5" style={{ color: C.steel }}><span className="text-xl">🎤</span> Your Answer</span>
                                                    <p className="text-sm leading-relaxed" style={{ color: C.navyMuted }}>
                                                        {item.answer?.transcript || <span className="italic" style={{ color: C.navyGhost }}>No answer provided / Audio skip</span>}
                                                    </p>
                                                </div>

                                                {/* Feedback / Evaluation */}
                                                {item.evaluation ? (
                                                    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(82,183,136,0.05)', border: `1px solid rgba(82,183,136,0.2)` }}>
                                                        <span className="text-xs uppercase font-extrabold mb-3 block tracking-wider flex items-center gap-1.5" style={{ color: C.tealDark }}><span>💡</span> Evaluation Feedback</span>

                                                        <p className="text-sm leading-relaxed mb-4 font-medium" style={{ color: C.navyMuted }}>
                                                            {item.evaluation.generalFeedback}
                                                        </p>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            {[
                                                                { label: 'Technical', val: item.evaluation.scoreTech, max: 10 },
                                                                { label: 'Relevance', val: item.evaluation.scoreRelevance, max: 10 },
                                                                { label: 'Depth', val: item.evaluation.scoreDepth, max: 10 },
                                                                { label: 'Clarity', val: item.evaluation.scoreClarity, max: 10 }
                                                            ].map(score => (
                                                                <div key={score.label} className="p-2 rounded-lg text-center" style={{ backgroundColor: '#fff', border: `1px solid ${C.border}` }}>
                                                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: C.navyFaint }}>{score.label}</div>
                                                                    <div className="font-extrabold text-sm" style={{ color: C.navy }}>
                                                                        {score.val}<span className="text-[10px] font-medium ml-0.5" style={{ color: C.navyGhost }}>/{score.max}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-semibold p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: C.yellowLight, border: `1px solid rgba(212,134,10,0.2)`, color: C.yellow }}>
                                                        <span>⚠️</span> No evaluation available for this answer.
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
