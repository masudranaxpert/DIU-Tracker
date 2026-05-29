import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';
import { LogOut, Clock, LayoutDashboard, ShieldAlert, MailWarning, RefreshCw } from 'lucide-react';
import { authService } from '@/shared/services/authService';

const PendingApprovalPage: React.FC = () => {
    const { profile, logout } = useAuth();
    const navigate = useNavigate();
    const [needsVerification, setNeedsVerification] = React.useState(false);
    const [resent, setResent] = React.useState(false);

    React.useEffect(() => {
        if (!localStorage.getItem('auth_token')) {
            navigate('/login', { replace: true });
            return;
        }
        if (profile?.is_cr && profile?.is_active) {
            navigate('/admin', { replace: true });
        }
    }, [profile, navigate]);

    React.useEffect(() => {
        if (profile?.is_cr && profile && !profile.is_verified) {
            authService.isEmailVerificationEnabled().then(setNeedsVerification);
        } else {
            setNeedsVerification(false);
        }
    }, [profile]);

    const handleResend = async () => {
        if (!profile?.email) return;
        await authService.resendVerifyEmail(profile.email);
        setResent(true);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    const handleDashboard = () => {
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
            <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute -top-1/4 -left-1/4 w-[800px] h-[800px] bg-amber-600/20 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[540px] relative z-10 text-center">
                <div className="bg-white dark:bg-slate-900/90 border border-white/10 rounded-[3rem] p-12 lg:p-14 shadow-2xl">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                        <Clock className="text-amber-500" size={40} />
                    </div>

                    <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tight uppercase italic">Access Pending</h2>

                    {needsVerification && (
                        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 p-5 text-left">
                            <div className="flex items-center gap-2 mb-2">
                                <MailWarning className="text-amber-500" size={18} />
                                <span className="font-black text-sm text-amber-700 dark:text-amber-400 uppercase tracking-wider">Verify your email</span>
                            </div>
                            <p className="text-sm text-amber-700/80 dark:text-amber-300/80 leading-relaxed mb-4">
                                We sent a verification link to <strong>{profile?.email}</strong>. Verify it to complete your CR application.
                            </p>
                            <button
                                type="button"
                                onClick={handleResend}
                                disabled={resent}
                                className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 px-4 py-2 bg-amber-500/10 rounded-full hover:bg-amber-500/20 transition-colors disabled:opacity-60"
                            >
                                <RefreshCw size={14} />
                                {resent ? 'Email Sent' : 'Resend Email'}
                            </button>
                        </div>
                    )}

                    <div className="space-y-4 text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed px-4">
                        <p>Hi <span className="text-amber-500 font-bold">{profile?.full_name || 'Representative'}</span>,</p>
                        <p>Your Class Representative account is currently in the <strong>verification queue</strong>.</p>
                        <p className="text-sm">For security reasons, all CR accounts must be manually verified by the administrator to prevent unauthorized access. It usually takes some hours to complete.</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button
                            type="button"
                            onClick={handleDashboard}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            <LayoutDashboard size={18} />
                            <span className="uppercase tracking-widest text-xs">Dashboard</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full py-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                        >
                            <LogOut size={18} />
                            <span className="uppercase tracking-widest text-xs">Sign Out</span>
                        </button>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4">Urgent Access Required?</p>
                        <div className="flex items-center justify-center gap-4">
                            <a href="https://wa.me/+8801969507606" className="flex items-center gap-2 text-indigo-500 hover:text-indigo-400 transition-colors text-xs font-bold px-4 py-2 bg-indigo-500/10 rounded-full">
                                <ShieldAlert size={14} /> Contact Admin
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;
