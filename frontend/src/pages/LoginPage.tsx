
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authService } from '@/shared/services/authService';
import { useAuth } from '@/app/providers/AuthProvider';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Eye, EyeOff, UserPlus, Home } from 'lucide-react';

const LoginPage: React.FC = () => {
    const { profile, refreshProfile } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [attempts, setAttempts] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();
    const signupMessage = (location.state as { message?: string } | null)?.message;

    // Redirect when profile is loaded
    useEffect(() => {
        if (profile) {
            console.log('[LoginPage] Profile loaded, redirecting...', profile.is_cr);
            if (profile.is_cr && !profile.is_active) {
                navigate('/pending-approval', { replace: true });
            } else if (profile.is_cr && profile.is_active) {
                navigate('/admin', { replace: true });
            } else {
                navigate('/dashboard', { replace: true });
            }
        }
    }, [profile, navigate]);

    // Initialize security tracking
    React.useEffect(() => {
        const storedAttempts = localStorage.getItem('login_attempts');
        const storedLockout = localStorage.getItem('login_lockout');
        
        if (storedAttempts) setAttempts(parseInt(storedAttempts));
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout);
            if (lockoutTime > Date.now()) {
                setLockoutUntil(lockoutTime);
            }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Check for active lockout
        const now = Date.now();
        if (lockoutUntil && now < lockoutUntil) {
            const remainingMins = Math.ceil((lockoutUntil - now) / 60000);
            setError(`Account temporarily locked. Please try again in ${remainingMins} minute(s).`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await authService.login(email, password);
            if (result.error) {
                throw new Error(result.error);
            }

            // SUCCESS: Reset tracking
            localStorage.removeItem('login_attempts');
            localStorage.removeItem('login_lockout');
            setAttempts(0);
            setLockoutUntil(null);

            // We let AuthContext handle the redirection by updating the global profile state
            console.log('Login successful, waiting for AuthContext...');
            
            // Refresh auth context to sync the new login
            await refreshProfile();
        } catch (err: any) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            localStorage.setItem('login_attempts', newAttempts.toString());

            let newLockout = null;
            if (newAttempts >= 9) {
                newLockout = Date.now() + 30 * 60 * 1000;
            } else if (newAttempts >= 5) {
                newLockout = Date.now() + 5 * 60 * 1000;
            } else if (newAttempts >= 3) {
                newLockout = Date.now() + 1 * 60 * 1000;
            }

            if (newLockout) {
                setLockoutUntil(newLockout);
                localStorage.setItem('login_lockout', newLockout.toString());
                setError(`Incorrect credentials. Account locked for ${newAttempts >= 9 ? '30' : newAttempts >= 5 ? '5' : '1'} minute(s).`);
            } else {
                setError(err.message || 'Failed to sign in');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden p-6 font-outfit">
            {/* Optimized Background Pattern */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-right from-transparent via-indigo-500/20 to-transparent" />
            </div>

            <div
                className="w-full max-w-[440px] relative z-10"
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 lg:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    <div className="mb-10 text-center">
                        <div
                            className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-6 border border-slate-100 dark:border-slate-800 p-2.5"
                        >
                            <img src="/logo.png" alt="DCT logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">
                            Admin <span className="text-indigo-600">Portal</span>
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Authorized Personnel Only</p>
                    </div>

                    {signupMessage && (
                        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium text-center">
                            {signupMessage}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Institutional Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
                                    placeholder="name@diu.edu.bd"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Security Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
                                    placeholder="Your secret key"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors bg-white dark:bg-slate-800 p-1 rounded-lg"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex justify-end px-1">
                                <Link 
                                    to="/forgot-password" 
                                    className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                >
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        {error && (
                            <div
                                className="p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-500 rounded-2xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-3"
                            >
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span className="uppercase tracking-[0.2em] text-xs">Login & Continue</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
                            New CR? <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 font-black hover:underline underline-offset-4 inline-flex items-center gap-1.5"><UserPlus size={14} className="-mt-0.5" /> Apply for Access</Link>
                        </p>
                        <Link to="/dashboard" className="px-5 py-2.5 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2">
                            <Home size={14} className="-mt-0.5" /> Return to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
