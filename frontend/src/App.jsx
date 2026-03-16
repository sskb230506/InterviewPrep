import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Home from './pages/Home';
import SetupInterview from './pages/SetupInterview';
import InterviewRoom from './pages/InterviewRoom';
import Dashboard from './pages/Dashboard';
import ConceptsRoom from './pages/ConceptsRoom';
import DSARoom from './pages/DSARoom';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );
    if (!user) return <Navigate to="/" />;
    return children;
};

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route element={<Layout />}>
                <Route path="/setup" element={<ProtectedRoute><SetupInterview /></ProtectedRoute>} />
                <Route path="/interview/:sessionId" element={<ProtectedRoute><InterviewRoom /></ProtectedRoute>} />
                <Route path="/concepts/:sessionId" element={<ProtectedRoute><ConceptsRoom /></ProtectedRoute>} />
                <Route path="/dsa/:sessionId" element={<ProtectedRoute><DSARoom /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
