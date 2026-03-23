import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
        <div className="min-h-screen" style={{ backgroundColor: C.bg, color: C.navyMuted, fontFamily: "'Inter', sans-serif" }}>
            <style>{`
                .nav-link:hover { background-color: rgba(255,255,255,0.1); color: #fff; }
                .nav-link.active { background-color: rgba(255,255,255,0.2); color: #fff; }
                .logout-btn { color: rgba(255,255,255,0.7); }
                .logout-btn:hover { background-color: ${C.red}; color: #fff; border-color: ${C.red}; }
            `}</style>
            {/* Navbar */}
            <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: C.navy }}>
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/setup" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={C.navy}>
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
                                    className={`nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${active ? 'active' : ''}`}
                                    style={{ color: active ? '#fff' : 'rgba(255,255,255,0.7)' }}
                                >
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right side: user + logout */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                                {(user?.name || user?.email || '?')[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{user?.name || user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="logout-btn flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-transparent transition-all duration-150"
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
