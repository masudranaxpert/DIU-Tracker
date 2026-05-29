
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { authService } from '@/shared/services/authService';
import { Mail, Loader2, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await authService.resetPassword(email);

            if (!result.success) {
                setError(result.error || 'Failed to process reset request');
                setIsLoading(false);
                return;
            }

            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link');
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden p-6 font-outfit">
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                </div>

                <div
                    className="w-full max-w-[440px] relative z-10"
                >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 lg:p-12 text-center shadow-xl">
                        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-emerald-100 dark:border-emerald-500/20">
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tight">Check Your Email</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-10 leading-relaxed font-medium">
                            We've sent a password reset link to <br />
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">{email}</span>
                        </p>
                        <Link
                            to="/login"
                            className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all"
                        >
                            <ArrowLeft size={18} />
                            <span className="uppercase tracking-widest text-xs">Back to Login</span>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden p-6 font-outfit">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
            </div>

            <div
                className="w-full max-w-[440px] relative z-10"
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 lg:p-12 shadow-xl">
                    <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-500 transition-colors mb-8 group">
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Back to Login</span>
                    </Link>

                    <div className="mb-10">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">
                            Reset <span className="text-indigo-600">Password</span>
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em] leading-relaxed">
                            Enter your institutional email and we'll send you a recovery link.
                        </p>
                    </div>

                    <form onSubmit={handleResetRequest} className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Institutional Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 text-sm"
                                    placeholder="id@diu.edu.bd"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
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
                                    <span className="uppercase tracking-[0.2em] text-xs">Send Recovery Link</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
