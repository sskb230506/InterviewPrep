import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { BarChart3, TrendingUp, CheckCircle, Target, Loader2 } from 'lucide-react';

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
            <div className="min-h-[60vh] flex justify-center items-center">
                <Loader2 size={48} className="text-teal-500 animate-spin" />
            </div>
        );
    }

    if (!data || !data.averages) {
        return (
            <div className="max-w-5xl mx-auto p-8 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
                <Target size={48} className="text-slate-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">No Interview Data Yet</h2>
                <p className="text-slate-400">Complete your first mock interview to see your metrics here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Performance Analytics</h1>
                <p className="text-slate-400">Track your progress and identify areas for improvement.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
                <StatCard title="Interviews Completed" value={data.sessionsCompleted} icon={<CheckCircle size={20} className="text-teal-400" />} />
                <StatCard title="Questions Answered" value={data.questionsAnswered} icon={<MessageCirclePlus size={20} className="text-blue-400" />} />
                <StatCard title="Average Technical" value={`${data.averages.tech}/10`} icon={<BarChart3 size={20} className="text-indigo-400" />} />
                <StatCard title="Average Relevance" value={`${data.averages.relevance}/10`} icon={<Target size={20} className="text-rose-400" />} />
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                        <TrendingUp className="text-teal-400" /> Overall Score Trend
                    </h3>
                    <div className="h-64 flex items-end gap-2">
                        {data.trend?.map((t, idx) => {
                            const heightPct = (t.score / 10) * 100;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                                    <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {t.score.toFixed(1)}
                                    </span>
                                    <div className="w-full bg-slate-800 rounded-t-md relative overflow-hidden group-hover:bg-slate-700 transition-colors" style={{ height: '100%' }}>
                                        <div
                                            className="absolute bottom-0 w-full bg-teal-500/80 rounded-t-sm group-hover:bg-teal-400 transition-all duration-500"
                                            style={{ height: `${heightPct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                        <Target className="text-rose-400" /> Skill Breakdown
                    </h3>
                    <div className="space-y-6">
                        <ProgressRow label="Technical Accuracy" score={data.averages.tech} color="bg-teal-500" />
                        <ProgressRow label="Answer Relevance" score={data.averages.relevance} color="bg-blue-500" />
                        <ProgressRow label="Depth & Detail" score={data.averages.depth} color="bg-indigo-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex items-center justify-between hover:bg-slate-800/50 transition-colors cursor-default">
            <div>
                <h4 className="text-slate-400 text-sm font-medium mb-1">{title}</h4>
                <span className="text-2xl font-bold text-white">{value}</span>
            </div>
            <div className="p-3 bg-slate-800 rounded-xl">
                {icon}
            </div>
        </div>
    );
}

function ProgressRow({ label, score, color }) {
    const pct = (score / 10) * 100;
    return (
        <div>
            <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300 font-medium">{label}</span>
                <span className="text-slate-400">{score}/10</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }}></div>
            </div>
        </div>
    );
}

// Icon stub
function MessageCirclePlus({ size, className }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 12h8" />
            <path d="M12 8v8" />
        </svg>
    );
}
