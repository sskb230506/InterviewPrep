import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const C = {
    navy: '#1A4872', navyLight: '#2e5f8a', navyMuted: '#2e6b9a',
    navyFaint: 'rgba(26,72,114,0.55)', navyGhost: 'rgba(26,72,114,0.35)',
    teal: '#52B788', tealDark: '#3d9a6e',
    tealLight: 'rgba(82,183,136,0.12)', tealBorder: 'rgba(82,183,136,0.35)',
    bg: '#dff0e8',
    card: '#ffffff',
    border: 'rgba(26,72,114,0.13)',
    red: '#c0392b', redLight: 'rgba(192,57,43,0.09)',
};

export default function Home() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { login, register, user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && user) navigate('/setup');
    }, [user, loading, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
            } else {
                if (password.length < 8) {
                    setError('Password must be at least 8 characters.');
                    setIsLoading(false);
                    return;
                }
                await register(name, email, password);
            }
            navigate('/setup');
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setEmail('');
        setPassword('');
        setName('');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: C.bg }}>
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: C.tealBorder, borderTopColor: C.teal }} />
        </div>
    );

    return (
        <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif", backgroundColor: C.bg }}>
            <style>{`
                .field-input {
                    width: 100%; background: #fff; border: 1px solid rgba(26,72,114,0.18);
                    border-radius: 10px; padding: 12px 16px; font-size: 14px;
                    color: ${C.navy}; outline: none; transition: all 0.2s;
                }
                .field-input::placeholder { color: rgba(26,72,114,0.35); }
                .field-input:focus { border-color: ${C.teal}; box-shadow: 0 0 0 3px rgba(82,183,136,0.15); }
                .signin-btn {
                    width: 100%; background: linear-gradient(135deg, ${C.teal}, ${C.tealDark});
                    color: #fff; border: none; border-radius: 10px; padding: 13px;
                    font-size: 15px; font-weight: 600; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                    transition: opacity 0.2s, transform 0.15s;
                }
                .signin-btn:hover { opacity: 0.92; transform: translateY(-1px); }
                .signin-btn:active { transform: scale(0.98); }
                .signin-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
                .switch-btn {
                    width: 100%; background: #fff; color: ${C.navyMuted};
                    border: 1px solid rgba(26,72,114,0.15); border-radius: 10px;
                    padding: 13px; font-size: 14px; font-weight: 500; cursor: pointer;
                    transition: all 0.2s;
                }
                .switch-btn:hover { border-color: rgba(26,72,114,0.3); color: ${C.navy}; }
                .feature-pill {
                    padding: 7px 15px; border-radius: 999px; font-size: 13px;
                    background: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.9);
                    color: ${C.navyMuted}; backdrop-filter: blur(4px);
                }
            `}</style>

            {/* ── Left Panel — Branding ─────────────────────────── */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden">
                {/* Logo */}
                <div className="flex items-center gap-3 z-10 relative">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
                        style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg" style={{ color: C.navy }}>InterviewAI</span>
                </div>

                {/* Main copy */}
                <div className="z-10 relative">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-10"
                        style={{ backgroundColor: 'rgba(255,255,255,0.6)', color: C.navyMuted, border: '1px solid rgba(255,255,255,0.9)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.teal }} />
                        AI-Powered Interview Practice
                    </div>

                    <h1 className="text-5xl xl:text-6xl font-extrabold leading-tight mb-5 tracking-tight" style={{ color: C.navy }}>
                        Ace your next<br />
                        <span style={{ color: C.teal }}>interview.</span>
                    </h1>

                    <p className="text-base leading-relaxed max-w-sm mb-12" style={{ color: C.navyMuted }}>
                        Practice with realistic voice-driven mock interviews tailored to{' '}
                        <span style={{ color: C.teal, fontWeight: 600 }}>your role</span> and{' '}
                        <span style={{ color: C.teal, fontWeight: 600 }}>resume</span>.
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {['Voice Responses', 'AI Feedback', 'Skill Analytics', 'Role-Specific'].map((f) => (
                            <span key={f} className="feature-pill">{f}</span>
                        ))}
                    </div>
                </div>

                {/* Quote */}
                <div className="z-10 relative">
                    <p className="text-sm italic font-medium" style={{ color: C.navyMuted }}>
                        "Preparation is the key to success."
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.navyGhost }}>— Alexander Graham Bell</p>
                </div>
            </div>

            {/* ── Right Panel — Auth Form ────────────────────────── */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 xl:p-20">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                        style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})` }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" />
                        </svg>
                    </div>
                    <span className="font-semibold text-lg" style={{ color: C.navy }}>InterviewAI</span>
                </div>

                {/* Card */}
                <div className="w-full max-w-sm rounded-2xl p-10 relative z-10"
                    style={{ backgroundColor: C.card, boxShadow: '0 8px 40px rgba(26,72,114,0.10)' }}>

                    {/* Heading */}
                    <div className="mb-7">
                        <h2 className="text-2xl font-bold tracking-tight mb-1" style={{ color: C.navy }}>
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-sm" style={{ color: C.navyGhost }}>
                            {isLogin
                                ? 'Sign in to continue your interview practice.'
                                : 'Start your AI-powered interview journey.'}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl flex items-start gap-2.5"
                            style={{ backgroundColor: C.redLight, border: `1px solid rgba(192,57,43,0.2)` }}>
                            <svg className="w-4 h-4 mt-0.5 shrink-0" style={{ color: C.red }} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm font-medium" style={{ color: C.red }}>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name — register only */}
                        {!isLogin && (
                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.navyFaint }}>
                                    Full Name
                                </label>
                                <input
                                    type="text" required value={name}
                                    onChange={e => setName(e.target.value)}
                                    autoComplete="name"
                                    className="field-input"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.navyFaint }}>
                                Email Address
                            </label>
                            <input
                                type="email" required value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                className="field-input"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.navyFaint }}>
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    className="field-input pr-12"
                                    placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                    style={{ color: C.navyGhost }}
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {!isLogin && (
                                <p className="text-xs mt-1.5" style={{ color: C.navyGhost }}>Must be at least 8 characters</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={isLoading} className="signin-btn mt-2">
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 rounded-full animate-spin"
                                        style={{ borderColor: 'rgba(255,255,255,0.35)', borderTopColor: '#fff' }} />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
                        <span className="text-xs" style={{ color: C.navyGhost }}>
                            {isLogin ? 'New here?' : 'Have an account?'}
                        </span>
                        <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
                    </div>

                    {/* Switch mode */}
                    <button onClick={switchMode} className="switch-btn">
                        {isLogin ? 'Create a new account' : 'Sign in to existing account'}
                    </button>

                    {/* Footer */}
                    <p className="text-center text-xs mt-6" style={{ color: C.navyGhost }}>
                        By continuing, you agree to our{' '}
                        <span className="underline underline-offset-2 cursor-pointer" style={{ color: C.navyMuted }}>Terms</span>
                        {' '}and{' '}
                        <span className="underline underline-offset-2 cursor-pointer" style={{ color: C.navyMuted }}>Privacy Policy</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
