import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navLinks = [
        { to: '/setup', label: 'New Interview' },
        { to: '/dashboard', label: 'Dashboard' },
    ];

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* Navbar */}
            <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/setup" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:bg-white/90 transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="black">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z"/>
                            </svg>
                        </div>
                        <span className="font-semibold text-white tracking-tight">InterviewAI</span>
                    </Link>

                    {/* Nav links */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map(({ to, label }) => {
                            const active = location.pathname === to;
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                                        active
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/40 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side: user + logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-xs font-semibold text-white/70">
                                {(user?.name || user?.email || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-sm text-white/40">{user?.name || user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-150"
                            title="Sign out"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-6 py-10">
                <Outlet />
            </main>
        </div>
    );
}
