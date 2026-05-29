import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle } from 'lucide-react';
import { adminAuthService } from '@/features/admin/services/adminAuthService';

export default function AdminLoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
    const [attempts, setAttempts] = useState(0);

    // Redirect if already logged in
    useEffect(() => {
        if (adminAuthService.isAuthenticated()) {
            const cachedAdmin = adminAuthService.getCachedAdmin();
            if (cachedAdmin) {
                navigate('/admin-panel/dashboard', { replace: true });
            }
        }
    }, [navigate]);

    // Initialize lockout tracking
    useEffect(() => {
        const storedLockout = localStorage.getItem('admin_lockout');
        if (storedLockout) {
            const lockoutTime = parseInt(storedLockout);
            if (lockoutTime > Date.now()) {
                setLockoutUntil(lockoutTime);
            }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check lockout
        const now = Date.now();
        if (lockoutUntil && now < lockoutUntil) {
            const remainingMins = Math.ceil((lockoutUntil - now) / 60000);
            setError(`Account locked. Try again in ${remainingMins} minute(s).`);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await adminAuthService.login(email, password);

            if (!result.success) {
                throw new Error(result.error || 'Login failed');
            }

            // Success - redirect to admin panel
            navigate('/admin-panel/dashboard', { replace: true });
        } catch (err: any) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            // Set lockout
            let newLockout: number | null = null;
            if (newAttempts >= 9) {
                newLockout = Date.now() + 30 * 60 * 1000;
            } else if (newAttempts >= 5) {
                newLockout = Date.now() + 5 * 60 * 1000;
            } else if (newAttempts >= 3) {
                newLockout = Date.now() + 1 * 60 * 1000;
            }

            if (newLockout) {
                setLockoutUntil(newLockout);
                localStorage.setItem('admin_lockout', newLockout.toString());
                setError(`Too many attempts. Locked for ${newAttempts >= 9 ? '30' : newAttempts >= 5 ? '5' : '1'} minute(s).`);
            } else {
                setError(err.message || 'Invalid credentials');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px]" />
                <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-[440px] relative z-10 px-4">
                {/* Logo & Header */}
                <div className="text-center mb-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-amber-500/20 mx-auto mb-6">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        Admin <span className="text-amber-400">Portal</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
                        Authorized Personnel Only
                    </p>
                </div>

                {/* Login Form */}
                <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-[2rem] p-8 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-500 text-sm"
                                    placeholder="admin@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-400 transition-colors" size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full pl-12 pr-12 py-3.5 bg-slate-900/50 border border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all font-bold text-white placeholder:text-slate-500 text-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-900 font-black rounded-2xl transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <a
                        href="/login"
                        className="text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
                    >
                        ← Back to Student Portal
                    </a>
                </div>
            </div>
        </div>
    );
}

// Need to import Loader2 and ShieldCheck
function Loader2({ className }: { className?: string }) {
    return (
        <svg className={`animate-spin ${className || ''}`} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

function ShieldCheck({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    );
}