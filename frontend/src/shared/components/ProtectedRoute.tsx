import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

const ProtectedRoute: React.FC = () => {
    const { profile, isLoading } = useAuth();
    const hasUserAuth = !!localStorage.getItem('auth_token');

    // isLoading is only true on very first ever visit (no cache yet).
    // On subsequent refreshes the cached profile is read synchronously
    // so this block is never reached.
    if (isLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-900">
                <div className="w-10 h-10 border-[3px] border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!hasUserAuth || !profile) {
        return <Navigate to="/login" replace />;
    }

    // CR users only — admin portal uses separate AdminUser auth
    if (!profile.is_cr) {
        return <Navigate to="/dashboard" replace />;
    }

    if (!profile.is_active) {
        return <Navigate to="/pending-approval" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
