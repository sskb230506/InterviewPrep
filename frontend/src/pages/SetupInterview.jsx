import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
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

const MODES = [
    {
        id: 'interview',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
        ),
        label: 'Mock Interview',
        desc: 'Resume-based voice interview tailored to your job role and experience',
        tag: 'Voice',
        tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    },
    {
        id: 'concepts',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
        ),
        label: 'Core Concepts',
        desc: 'Topic-based MCQ or voice Q&A on CS fundamentals, frameworks, and design patterns',
        tag: 'MCQ + Voice',
        tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    },
    {
        id: 'dsa',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
            </svg>
        ),
        label: 'DSA Practice',
        desc: 'LeetCode-style coding problems with a full in-browser code editor',
        tag: 'Code Editor',
        tagColor: 'text-green-400 bg-green-400/10 border-green-400/20',
    },
];

const YOE_OPTIONS = [
    { value: 0, label: 'Fresher', sub: '0 yrs' },
    { value: 1, label: '1 Year', sub: 'Junior' },
    { value: 2, label: '2 Years', sub: 'Junior' },
    { value: 3, label: '3 Years', sub: 'Mid-Level' },
    { value: 4, label: '4 Years', sub: 'Mid-Level' },
    { value: 5, label: '5 Years', sub: 'Senior' },
    { value: 7, label: '7 Years', sub: 'Senior' },
    { value: 10, label: '10+ Years', sub: 'Lead/Arch' },
];

const CONCEPTS_TOPICS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++',
    'React', 'Next.js', 'Node.js', 'Express', 'REST APIs',
    'SQL & Databases', 'MongoDB', 'Redis',
    'System Design', 'OOP Principles', 'Design Patterns',
    'Operating Systems', 'Computer Networks', 'Cloud & DevOps',
    'Git & Version Control', 'Testing & TDD',
];

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DSA_TOPICS = [
    'Arrays & Strings', 'Linked Lists', 'Stacks & Queues',
    'Trees & BST', 'Graphs', 'Dynamic Programming',
    'Recursion & Backtracking', 'Sorting & Searching',
    'Hashing', 'Heaps', 'Greedy Algorithms', 'Bit Manipulation',
];

const COMPANIES = [
    { name: 'TCS', tier: 'Easy', logo: '🔵' },
    { name: 'Cognizant', tier: 'Easy', logo: '🔷' },
    { name: 'Accenture', tier: 'Easy', logo: '🟣' },
    { name: 'Wipro', tier: 'Easy', logo: '⬜' },
    { name: 'Tech Mahindra', tier: 'Easy', logo: '🟤' },
    { name: 'Infosys', tier: 'Medium', logo: '🔶' },
    { name: 'HCL', tier: 'Medium', logo: '🔸' },
    { name: 'Capgemini', tier: 'Medium', logo: '🟠' },
    { name: 'Zoho', tier: 'Medium', logo: '⚪' },
    { name: 'Adobe', tier: 'Medium-Hard', logo: '🔴' },
    { name: 'Flipkart', tier: 'Medium-Hard', logo: '🟡' },
    { name: 'Uber', tier: 'Medium-Hard', logo: '⬛' },
    { name: 'LinkedIn', tier: 'Medium-Hard', logo: '🔹' },
    { name: 'Google', tier: 'Hard', logo: '🌈' },
    { name: 'Amazon', tier: 'Hard', logo: '🟠' },
    { name: 'Microsoft', tier: 'Hard', logo: '🪟' },
    { name: 'Meta', tier: 'Hard', logo: '🔵' },
    { name: 'Apple', tier: 'Hard', logo: '⚫' },
];

const LANGUAGES = ['Python', 'JavaScript', 'Java', 'C++'];

const TIER_STYLE = {
    'Easy': 'text-green-400 bg-green-400/10 border-green-400/20',
    'Medium': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'Medium-Hard': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    'Hard': 'text-red-400 bg-red-400/10 border-red-400/20',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SetupInterview() {
    const navigate = useNavigate();

    // Step 1: mode
    const [selectedMode, setSelectedMode] = useState(null);

    // Shared
    const [yoe, setYoe] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Interview mode
    const [jobRole, setJobRole] = useState('');
    const [jdText, setJdText] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    // Concepts mode
    const [conceptTopic, setConceptTopic] = useState('');
    const [conceptDifficulty, setConceptDifficulty] = useState('Medium');
    const [conceptAnswerMode, setConceptAnswerMode] = useState('mcq');

    // DSA mode
    const [dsaCompany, setDsaCompany] = useState('');
    const [dsaTopic, setDsaTopic] = useState('');
    const [dsaLanguage, setDsaLanguage] = useState('Python');

    const handleFileChange = (file) => {
        if (file && file.type === 'application/pdf') {
            setResumeFile(file);
            setError('');
        } else if (file) {
            setError('Only PDF files are accepted.');
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (selectedMode === 'interview') {
                if (!resumeFile) { setError('Please upload your resume (PDF).'); setLoading(false); return; }
                const formData = new FormData();
                formData.append('resume', resumeFile);
                formData.append('jobRole', jobRole);
                formData.append('jdText', jdText);
                formData.append('yoe', yoe);
                formData.append('mode', 'interview');
                const res = await api.post('/interview/start', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                navigate(`/interview/${res.data.sessionId}`);

            } else if (selectedMode === 'concepts') {
                if (!conceptTopic) { setError('Please select a topic.'); setLoading(false); return; }
                // Create a minimal session for concepts
                const formData = new FormData();
                formData.append('jobRole', conceptTopic);
                formData.append('yoe', yoe);
                formData.append('mode', 'concepts');
                const res = await api.post('/interview/start', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                navigate(`/concepts/${res.data.sessionId}`, {
                    state: { topic: conceptTopic, difficulty: conceptDifficulty, answerMode: conceptAnswerMode, yoe }
                });

            } else if (selectedMode === 'dsa') {
                if (!dsaCompany) { setError('Please select a company.'); setLoading(false); return; }
                const formData = new FormData();
                formData.append('jobRole', dsaCompany);
                formData.append('yoe', yoe);
                formData.append('mode', 'dsa');
                const res = await api.post('/interview/start', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                navigate(`/dsa/${res.data.sessionId}`, {
                    state: { company: dsaCompany, topic: dsaTopic, language: dsaLanguage, yoe }
                });
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to start session. Please try again.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-10" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Header */}
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-5" style={{ backgroundColor: C.steelLight, color: C.steel, border: `1px solid ${C.steelBorder}` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.steel }} />
                    Choose Your Practice Mode
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: C.navy }}>Start a Session</h1>
                <p className="text-sm font-medium" style={{ color: C.navyGhost }}>Select a mode, configure your session, then begin.</p>
            </div>

            <form onSubmit={handleStart}>
                {/* ── Step 1: Mode Selection ──────────────────────────────────── */}
                <div className="mb-8">
                    <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: C.navyFaint }}>
                        <span className="w-5 border-t" style={{ borderColor: C.border }}></span>Step 1 — Choose mode
                    </p>
                    <div className="grid md:grid-cols-3 gap-4">
                        {MODES.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => { setSelectedMode(m.id); setError(''); }}
                                className={`relative text-left p-5 rounded-2xl transition-all duration-200`}
                                style={{
                                    backgroundColor: selectedMode === m.id ? C.surfaceAlt : C.card,
                                    border: `1px solid ${selectedMode === m.id ? C.tealBorder : C.border}`,
                                    boxShadow: selectedMode === m.id ? `0 0 0 1px ${C.teal}` : `0 4px 20px rgba(26,72,114,0.04)`
                                }}
                            >
                                {selectedMode === m.id && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: C.teal, color: '#fff' }}>
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors`} style={{ backgroundColor: selectedMode === m.id ? C.tealLight : C.steelLight, color: selectedMode === m.id ? C.tealDark : C.steel }}>
                                    {m.icon}
                                </div>
                                <h3 className="font-bold text-base mb-1" style={{ color: C.navy }}>{m.label}</h3>
                                <p className="text-xs leading-relaxed mb-3" style={{ color: C.navyMuted }}>{m.desc}</p>
                                <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${m.tagColor.replace('text-white', 'text-black')}`}>
                                    {m.tag}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Step 2: YoE ── Always visible after mode selection ──────── */}
                {selectedMode && (
                    <div className="mb-8 p-6 rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px rgba(26,72,114,0.03)` }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: C.navyFaint }}>
                           <span className="w-5 border-t" style={{ borderColor: C.border }}></span>Step 2 — Years of experience
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {YOE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setYoe(opt.value)}
                                    className={`flex flex-col items-center px-4 py-2.5 rounded-xl transition-all duration-150`}
                                    style={{
                                        backgroundColor: yoe === opt.value ? C.navy : 'transparent',
                                        color: yoe === opt.value ? '#fff' : C.navyMuted,
                                        border: `1px solid ${yoe === opt.value ? C.navy : C.border}`
                                    }}
                                >
                                    <span className="font-bold text-[13px]">{opt.label}</span>
                                    <span className={`text-[10px] mt-0.5 ${yoe === opt.value ? 'text-white/80' : 'text-current opacity-60'}`}>{opt.sub}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Step 3: Mode-specific config ─────────────────────────── */}
                {selectedMode && (
                    <div className="mb-8 p-6 rounded-2xl" style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, boxShadow: `0 4px 20px rgba(26,72,114,0.03)` }}>
                        <p className="text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: C.navyFaint }}>
                           <span className="w-5 border-t" style={{ borderColor: C.border }}></span>Step 3 — Configure session
                        </p>

                        {/* ── Interview mode ── */}
                        {selectedMode === 'interview' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyMuted }}>Target Job Role</label>
                                        <input
                                            type="text" required value={jobRole}
                                            onChange={e => setJobRole(e.target.value)}
                                            className="w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all"
                                            style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.navy }}
                                            placeholder="e.g. Senior Frontend Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyMuted }}>Resume (PDF)</label>
                                        <div
                                            onClick={() => document.getElementById('resume-file-input').click()}
                                            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
                                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200`}
                                            style={{ backgroundColor: dragOver ? C.tealLight : C.surfaceAlt, borderColor: dragOver ? C.teal : C.border }}
                                        >
                                            {resumeFile ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-6 h-6" style={{ color: C.teal }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                                                    <p className="text-sm font-medium truncate max-w-[200px]" style={{ color: C.navy }}>{resumeFile.name}</p>
                                                    <p className="text-xs" style={{ color: C.navyGhost }}>Click to change</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                    <svg className="w-6 h-6" style={{ color: C.navyGhost }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                                                    <p className="text-sm" style={{ color: C.navyMuted }}>Drop PDF or <span className="underline font-semibold" style={{ color: C.navy }}>browse</span></p>
                                                </div>
                                            )}
                                            <input id="resume-file-input" type="file" className="hidden" accept=".pdf" onChange={e => handleFileChange(e.target.files[0])} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.navyMuted }}>Job Description</label>
                                    <textarea required value={jdText} onChange={e => setJdText(e.target.value)}
                                        className="w-full h-[220px] rounded-xl px-4 py-3.5 text-sm focus:outline-none transition-all resize-none"
                                        style={{ backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.navy }}
                                        placeholder="Paste the job description here. The AI will analyze it to generate role-specific questions tailored to your experience level..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Concepts mode ── */}
                        {selectedMode === 'concepts' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Topic</label>
                                    <div className="flex flex-wrap gap-2">
                                        {CONCEPTS_TOPICS.map((t) => (
                                            <button key={t} type="button" onClick={() => setConceptTopic(t)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-150`}
                                                style={{
                                                    backgroundColor: conceptTopic === t ? C.navy : 'transparent',
                                                    color: conceptTopic === t ? '#fff' : C.navyMuted,
                                                    border: `1px solid ${conceptTopic === t ? C.navy : C.border}`
                                                }}
                                            >{t}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Difficulty</label>
                                        <div className="flex gap-3">
                                            {DIFFICULTIES.map((d) => (
                                                <button key={d} type="button" onClick={() => setConceptDifficulty(d)}
                                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-150`}
                                                    style={{
                                                        backgroundColor: conceptDifficulty === d ? C.navy : 'transparent',
                                                        color: conceptDifficulty === d ? '#fff' : C.navyMuted,
                                                        border: `1px solid ${conceptDifficulty === d ? C.navy : C.border}`
                                                    }}
                                                >{d}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Answer Format</label>
                                        <div className="flex gap-3">
                                            {[{ id: 'mcq', label: '📝 MCQ', sub: 'Multiple choice' }, { id: 'voice', label: '🎙️ Voice', sub: 'Spoken answer' }].map((opt) => (
                                                <button key={opt.id} type="button" onClick={() => setConceptAnswerMode(opt.id)}
                                                    className={`flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl transition-all duration-150`}
                                                    style={{
                                                        backgroundColor: conceptAnswerMode === opt.id ? C.navy : 'transparent',
                                                        color: conceptAnswerMode === opt.id ? '#fff' : C.navyMuted,
                                                        border: `1px solid ${conceptAnswerMode === opt.id ? C.navy : C.border}`
                                                    }}
                                                >
                                                    <div className="font-bold text-sm">{opt.label}</div>
                                                    <div className={`text-[10px] mt-0.5 ${conceptAnswerMode === opt.id ? 'text-white/80' : 'opacity-60'}`}>{opt.sub}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── DSA mode ── */}
                        {selectedMode === 'dsa' && (
                            <div className="space-y-6">
                                {/* Company grid */}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Company (sets difficulty level)</label>
                                    <div className="flex flex-wrap gap-2">
                                        {COMPANIES.map((c) => (
                                            <button key={c.name} type="button" onClick={() => setDsaCompany(c.name)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150`}
                                                style={{
                                                    backgroundColor: dsaCompany === c.name ? C.navy : 'transparent',
                                                    color: dsaCompany === c.name ? '#fff' : C.navyMuted,
                                                    border: `1px solid ${dsaCompany === c.name ? C.navy : C.border}`
                                                }}
                                            >
                                                <span>{c.logo}</span>
                                                <span>{c.name}</span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${dsaCompany === c.name ? 'text-white/80 bg-white/20 border-white/30' : TIER_STYLE[c.tier].replace('text-', 'text-black/70 ')}`}>
                                                    {c.tier}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Topic */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Topic (optional)</label>
                                        <div className="flex flex-wrap gap-2">
                                            {DSA_TOPICS.map((t) => (
                                                <button key={t} type="button" onClick={() => setDsaTopic(dsaTopic === t ? '' : t)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-150`}
                                                    style={{
                                                        backgroundColor: dsaTopic === t ? C.navy : 'transparent',
                                                        color: dsaTopic === t ? '#fff' : C.navyMuted,
                                                        border: `1px solid ${dsaTopic === t ? C.navy : C.border}`
                                                    }}
                                                >{t}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Language */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.navyMuted }}>Language</label>
                                        <div className="flex flex-col gap-2">
                                            {LANGUAGES.map((lang) => (
                                                <button key={lang} type="button" onClick={() => setDsaLanguage(lang)}
                                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-150`}
                                                    style={{
                                                        backgroundColor: dsaLanguage === lang ? C.navy : 'transparent',
                                                        color: dsaLanguage === lang ? '#fff' : C.navyMuted,
                                                        border: `1px solid ${dsaLanguage === lang ? C.navy : C.border}`
                                                    }}
                                                >
                                                    <span>{lang}</span>
                                                    {dsaLanguage === lang && (
                                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ backgroundColor: C.redLight, border: `1px solid rgba(192,57,43,0.2)` }}>
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.red }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        <p className="text-sm font-semibold" style={{ color: C.red }}>{error}</p>
                    </div>
                )}

                {/* Submit */}
                {selectedMode && (
                    <div className="flex justify-end">
                        <button type="submit" disabled={loading}
                            className="flex items-center gap-2 text-sm font-bold px-8 py-3.5 rounded-xl transition-all duration-200"
                            style={{ 
                                background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, 
                                color: '#fff', 
                                opacity: loading ? 0.6 : 1, 
                                cursor: loading ? 'not-allowed' : 'pointer',
                                boxShadow: '0 4px 15px rgba(82,183,136,0.3)' 
                            }}
                        >
                            {loading ? (
                                <><div className="w-4 h-4 border-2 border-t-white rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)' }} />Starting session...</>
                            ) : (
                                <>
                                    {selectedMode === 'interview' && 'Begin Interview'}
                                    {selectedMode === 'concepts' && 'Start Practice'}
                                    {selectedMode === 'dsa' && 'Open Code Editor'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}
