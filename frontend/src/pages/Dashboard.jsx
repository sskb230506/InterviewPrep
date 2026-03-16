import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

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

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col justify-center items-center gap-4">
                <div className="w-8 h-8 border-2 border-white/10 border-t-white/60 rounded-full animate-spin" />
                <p className="text-white/30 text-sm">Loading analytics...</p>
            </div>
        );
    }

    if (!data || !data.averages) {
        return (
            <div className="max-w-md mx-auto mt-20 text-center">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">No data yet</h2>
                <p className="text-white/30 text-sm leading-relaxed">
                    Complete your first mock interview to see your performance analytics here.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs text-white/40 mb-5 bg-white/5">
                    <span className="w-1.5 h-1.5 bg-white/60 rounded-full" />
                    Analytics
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Performance Dashboard</h1>
                <p className="text-white/40">Track your progress and identify areas for improvement.</p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Interviews Completed"
                    value={data.sessionsCompleted}
                    icon={
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                />
                <StatCard
                    title="Questions Answered"
                    value={data.questionsAnswered}
                    icon={
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                        </svg>
                    }
                />
                <StatCard
                    title="Avg. Technical"
                    value={`${data.averages.tech}/10`}
                    icon={
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                    }
                />
                <StatCard
                    title="Avg. Relevance"
                    value={`${data.averages.relevance}/10`}
                    icon={
                        <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                    }
                />
            </div>

            {/* Charts row */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Score Trend Chart */}
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-white text-base">Score Trend</h3>
                        <span className="text-xs text-white/30 uppercase tracking-widest">Last sessions</span>
                    </div>
                    <div className="h-52 flex items-end gap-2">
                        {data.trend?.length > 0 ? data.trend.map((t, idx) => {
                            const heightPct = (t.score / 10) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                                        {t.score.toFixed(1)}
                                    </span>
                                    <div className="w-full bg-white/5 rounded-t relative overflow-hidden" style={{ height: '100%' }}>
                                        <div
                                            className="absolute bottom-0 w-full bg-white/20 group-hover:bg-white/40 rounded-t transition-all duration-500"
                                            style={{ height: `${heightPct}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-white/20">#{idx + 1}</span>
                                </div>
                            );
                        }) : (
                            <div className="w-full flex items-center justify-center text-white/20 text-sm">
                                No session data yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Skill Breakdown */}
                <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-7">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-semibold text-white text-base">Skill Breakdown</h3>
                        <span className="text-xs text-white/30 uppercase tracking-widest">Averages</span>
                    </div>
                    <div className="space-y-6 mt-2">
                        <ProgressRow label="Technical Accuracy" score={data.averages.tech} />
                        <ProgressRow label="Answer Relevance" score={data.averages.relevance} />
                        <ProgressRow label="Depth & Detail" score={data.averages.depth} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }) {
    return (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] transition-colors cursor-default group">
            <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-white/5 group-hover:bg-white/10 rounded-xl flex items-center justify-center transition-colors">
                    {icon}
                </div>
            </div>
            <p className="text-white/30 text-xs mb-1 font-medium">{title}</p>
            <span className="text-2xl font-bold text-white tracking-tight">{value ?? '—'}</span>
        </div>
    );
}

function ProgressRow({ label, score }) {
    const pct = ((score ?? 0) / 10) * 100;
    const scoreNum = score ?? 0;
    return (
        <div>
            <div className="flex justify-between text-sm mb-2.5">
                <span className="text-white/50 text-xs">{label}</span>
                <span className="text-white font-semibold text-xs">{scoreNum.toFixed(1)}<span className="text-white/30">/10</span></span>
            </div>
            <div className="w-full bg-white/6 rounded-full h-1.5 overflow-hidden">
                <div
                    className="h-1.5 rounded-full bg-white/50 transition-all duration-700"
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
