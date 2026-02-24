import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, Home, BarChart2, Mic } from 'lucide-react';

export default function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[var(--color-dark-bg)] text-slate-200 font-sans selection:bg-brand-500/30">
            {/* Premium Glassmorphic Navbar */}
            <header className="sticky top-0 z-50 backdrop-blur-md bg-[var(--color-dark-bg)]/80 border-b border-slate-800">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/setup" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform duration-300">
                            <Mic size={18} className="text-white" />
                        </div>
                        <span className="text-xl font-semibold tracking-tight text-white">InterviewAI</span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/setup" className="text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors">Start Mock</Link>
                        <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-teal-400 transition-colors">Dashboard</Link>
                    </nav>

                    <div className="flex items-center gap-4">
                        <div className="text-sm text-slate-400 hidden sm:block">
                            {user?.name || user?.email}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-all duration-200"
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <Outlet />
            </main>
        </div>
    );
}
