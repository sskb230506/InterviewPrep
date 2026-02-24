import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { UploadCloud, FileText, ArrowRight, Loader2 } from 'lucide-react';

export default function SetupInterview() {
    const [jobRole, setJobRole] = useState('');
    const [jdText, setJdText] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setResumeFile(e.target.files[0]);
        }
    };

    const handleStart = async (e) => {
        e.preventDefault();
        if (!resumeFile) {
            setError('Please upload your resume (PDF).');
            return;
        }
        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('resume', resumeFile);
            formData.append('jobRole', jobRole);
            formData.append('jdText', jdText);

            const res = await api.post('/interview/start', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Navigate to the interview room with session ID
            navigate(`/interview/${res.data.sessionId}`);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to initialize session.');
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Configure Mock Interview</h1>
                <p className="text-slate-400">Upload your details to generate a highly tailored AI interview session.</p>
            </div>

            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
                {error && <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">{error}</div>}

                <form onSubmit={handleStart} className="space-y-8">

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Target Job Role</label>
                                <input
                                    type="text"
                                    required
                                    value={jobRole}
                                    onChange={e => setJobRole(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                                    placeholder="e.g. Senior Frontend Engineer"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Upload Resume (PDF)</label>
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700/50 border-dashed rounded-xl cursor-pointer hover:border-teal-500/50 hover:bg-teal-500/5 transition-all group relative overflow-hidden">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-teal-400 mb-2 transition-colors" />
                                        <p className="text-sm text-slate-400 group-hover:text-slate-300">
                                            {resumeFile ? resumeFile.name : 'Click to upload or drag and drop'}
                                        </p>
                                    </div>
                                    <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                <FileText size={16} /> Job Description
                            </label>
                            <textarea
                                required
                                value={jdText}
                                onChange={e => setJdText(e.target.value)}
                                className="w-full h-[220px] bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all resize-none"
                                placeholder="Paste the full job description here. The AI will analyze this to generate relevant technical and behavioral questions..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="group bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-8 py-3.5 rounded-xl shadow-lg shadow-teal-500/25 flex items-center justify-center gap-2 transition-all duration-300"
                        >
                            {loading ? (
                                <> <Loader2 size={18} className="animate-spin" /> Analyzing & Matching... </>
                            ) : (
                                <> Start Interview <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" /> </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
