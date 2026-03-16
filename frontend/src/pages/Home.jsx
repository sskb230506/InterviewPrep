import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
        if (!loading && user) {
            navigate('/setup');
        }
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Left Panel — Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden border-r border-white/5">
                {/* Grid texture */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                        backgroundSize: '40px 40px',
                    }}
                />
                {/* Radial glow */}
                <div
                    className="absolute bottom-0 left-0 w-[500px] h-[500px] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }}
                />

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg tracking-tight">InterviewAI</span>
                </div>

                {/* Main copy */}
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-full text-xs text-white/50 mb-8 bg-white/5">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                        AI-Powered Interview Practice
                    </div>
                    <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight mb-6 tracking-tight">
                        Ace your next<br />
                        <span className="text-white/40">interview.</span>
                    </h1>
                    <p className="text-white/40 text-lg leading-relaxed max-w-sm">
                        Practice with realistic voice-driven mock interviews tailored to your role and resume.
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-3 mt-10">
                        {['Voice Responses', 'AI Feedback', 'Skill Analytics', 'Role-Specific'].map((f) => (
                            <span key={f} className="px-4 py-2 border border-white/10 rounded-full text-sm text-white/50 bg-white/5">
                                {f}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Quote */}
                <div className="relative z-10 border-l-2 border-white/10 pl-5">
                    <p className="text-white/30 text-sm italic">"Preparation is the key to success."</p>
                    <p className="text-white/20 text-xs mt-1">— Alexander Graham Bell</p>
                </div>
            </div>

            {/* Right Panel — Auth form */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 xl:p-16 relative">
                {/* Mobile logo */}
                <div className="lg:hidden flex items-center gap-2 mb-12">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="black">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                        </svg>
                    </div>
                    <span className="text-white font-semibold text-lg">InterviewAI</span>
                </div>

                <div className="w-full max-w-sm">
                    {/* Heading */}
                    <div className="mb-10">
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {isLogin ? 'Welcome back' : 'Create account'}
                        </h2>
                        <p className="text-white/40 mt-2 text-sm">
                            {isLogin
                                ? 'Sign in to continue your interview practice.'
                                : 'Start your AI-powered interview journey.'}
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                            <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name field — register only */}
                        {!isLogin && (
                            <div>
                                <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    autoComplete="name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all duration-200"
                                    placeholder="John Doe"
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                autoComplete="email"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all duration-200"
                                placeholder="you@example.com"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-white/50 uppercase tracking-widest mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all duration-200"
                                    placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
                                <p className="text-white/25 text-xs mt-2">Must be at least 8 characters</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-2 bg-white text-black font-semibold py-3.5 rounded-xl transition-all duration-200 hover:bg-white/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm tracking-wide"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    {isLogin ? 'Signing in...' : 'Creating account...'}
                                </>
                            ) : (
                                <>
                                    {isLogin ? 'Sign in' : 'Create account'}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-8">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-white/20 text-xs">{isLogin ? 'New here?' : 'Have an account?'}</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {/* Switch mode */}
                    <button
                        onClick={switchMode}
                        className="w-full py-3.5 border border-white/10 rounded-xl text-sm text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all duration-200"
                    >
                        {isLogin ? 'Create a new account' : 'Sign in to existing account'}
                    </button>

                    {/* Footer note */}
                    <p className="text-center text-white/20 text-xs mt-8">
                        By continuing, you agree to our{' '}
                        <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">Terms</span>
                        {' '}and{' '}
                        <span className="underline underline-offset-2 cursor-pointer hover:text-white/40 transition-colors">Privacy Policy</span>.
                    </p>
                </div>
            </div>
        </div>
    );
}
