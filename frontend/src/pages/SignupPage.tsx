
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/shared/services/authService';
import { apiClient } from '@/shared/services/apiClient';
import { Section, Batch } from '@/shared/types/types';
import { SECTIONS } from '@/shared/utils/constants';
import { User, UserCircle, Layers, Users, Mail, Lock, Loader2, AlertCircle, ArrowRight, ShieldCheck, Activity, Eye, EyeOff, ChevronDown, LogIn, Home, X, BookOpen } from 'lucide-react';
import NativeSelect from '@/shared/components/NativeSelect';

const SignupPage: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [showAgreement, setShowAgreement] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const [batches, setBatches] = useState<Batch[]>([]);
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        student_id: '',
        batch_id: '',
        section: 'A' as Section,
        sub_section: ''
    });

    React.useEffect(() => {
        apiClient.get<Batch[]>('/batches').then((res) => setBatches(res.data || []));
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!form.student_id.trim()) {
            setError('Please enter your Student ID.');
            setIsLoading(false);
            return;
        }

        if (!form.batch_id) {
            setError('Please select your batch.');
            setIsLoading(false);
            return;
        }

        if (!agreed) {
            setError('You must agree to the Terms and Conditions.');
            setIsLoading(false);
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            setIsLoading(false);
            return;
        }

        try {
            console.log('[Signup] Starting signup for:', form.email);
            const result = await authService.register({
                email: form.email,
                password: form.password,
                fullName: form.name,
                student_id: form.student_id.trim(),
                batch_id: form.batch_id,
                section: form.section,
                sub_section: form.sub_section || undefined,
                is_cr: true,
            });

            if (!result.success) {
                throw new Error(result.error || 'Failed to create account');
            }

            const verificationRequired = await authService.isEmailVerificationEnabled();
            if (verificationRequired) {
                navigate('/verify-email', { state: { email: form.email } });
                return;
            }

            navigate('/login', {
                state: {
                    message:
                        'Application submitted! Login with your Student ID account (email above) — admin will approve your CR access.',
                },
            });
        } catch (err: any) {
            console.error('[Signup] Error:', err);
            setError(err.message || 'Failed to create account');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 relative overflow-hidden p-6 py-20 font-outfit">
            {/* Optimized Background Pattern */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-right from-transparent via-indigo-500/20 to-transparent" />
            </div>

            <div
                className="w-full max-w-[680px] relative z-10"
            >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 lg:p-14 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                    <div className="mb-12 text-center">
                        <div
                            className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-6 border border-slate-100 dark:border-slate-800 p-2.5"
                        >
                            <img src="/logo.png" alt="DCT logo" className="w-full h-full object-contain" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight uppercase">
                            Create <span className="text-indigo-600">Account</span>
                        </h2>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-[0.2em]">Management Access Request</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Full Name</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm"
                                        placeholder="Enter your name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Student ID</label>
                                <div className="relative group">
                                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm"
                                        placeholder="2XX-XX-XXX"
                                        value={form.student_id}
                                        onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <NativeSelect
                                label="Assigned Batch"
                                placeholder="SELECT BATCH"
                                options={batches.map(b => ({ id: b.id, name: b.name.toUpperCase() }))}
                                value={form.batch_id}
                                onChange={(val) => setForm({ ...form, batch_id: String(val) })}
                                icon={<Layers size={18} />}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <NativeSelect
                                    label="Section"
                                    placeholder="SELECT SECTION"
                                    options={SECTIONS.map(s => ({ id: s, name: `SECTION ${s}` }))}
                                    value={form.section}
                                    onChange={(val) => setForm({ ...form, section: val as Section })}
                                    icon={<BookOpen size={18} />}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <NativeSelect
                                    label="Lab Group (Optional)"
                                    placeholder="WHOLE SECTION"
                                    options={[
                                        { id: '1', name: 'GROUP 01' },
                                        { id: '2', name: 'GROUP 02' }
                                    ]}
                                    value={form.sub_section}
                                    onChange={(val) => setForm({ ...form, sub_section: String(val) })}
                                    icon={<Users size={18} />}
                                    isClearable={true}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Institutional Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm"
                                    placeholder="id@diu.edu.bd"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Security Key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm"
                                        placeholder="••••••••"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">Confirm Key</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors pointer-events-none" size={18} />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all font-bold text-slate-700 dark:text-white text-sm"
                                        placeholder="••••••••"
                                        value={form.confirmPassword}
                                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-500 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 px-1 py-2">
                            <div className="flex items-center h-5 mt-0.5">
                                <input
                                    id="agreed"
                                    type="checkbox"
                                    required
                                    checked={agreed}
                                    onChange={(e) => setAgreed(e.target.checked)}
                                    className="w-4 h-4 text-indigo-600 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-800 rounded focus:ring-indigo-500 focus:ring-offset-0 transition-all cursor-pointer"
                                />
                            </div>
                            <label htmlFor="agreed" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed cursor-pointer select-none">
                                I have read and agree to the{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowAgreement(true)}
                                    className="text-indigo-600 dark:text-indigo-400 font-black hover:underline inline"
                                >
                                    Terms and Conditions of DCT Agreement
                                </button>.
                            </label>
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
                            disabled={isLoading || !agreed}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span className="uppercase tracking-[0.2em] text-xs">Register & Apply</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
                            Already registered? <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-black hover:underline underline-offset-4 inline-flex items-center gap-1.5"><LogIn size={14} className="-mt-0.5" /> Sign In Now</Link>
                        </p>
                        <Link to="/dashboard" className="px-5 py-2.5 mt-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white text-[10px] font-black uppercase tracking-widest rounded-full transition-all flex items-center justify-center gap-2">
                            <Home size={14} className="-mt-0.5" /> Return to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </div>

            {/* Agreement PDF Modal */}
            {showAgreement && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                        onClick={() => setShowAgreement(false)}
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 60, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 40, scale: 0.97 }}
                        className="relative w-full sm:max-w-3xl h-[90vh] sm:h-[85vh] bg-white dark:bg-slate-900 sm:rounded-[2.5rem] rounded-t-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 z-10"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 sm:p-7 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Official Document</p>
                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mt-0.5">DCT CR Agreement</h3>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAgreement(false)}
                                className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* PDF iframe */}
                        <div className="flex-1 bg-slate-100 dark:bg-slate-950 relative">
                            {import.meta.env.VITE_AGREEMENT_PDF_URL ? (
                                <iframe
                                    src={`https://docs.google.com/gview?url=${encodeURIComponent(import.meta.env.VITE_AGREEMENT_PDF_URL)}&embedded=true`}
                                    className="w-full h-full border-none"
                                    title="DCT CR Terms and Conditions"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <p className="text-sm">Agreement PDF not configured</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-shrink-0">
                            <button
                                onClick={() => { setAgreed(true); setShowAgreement(false); }}
                                className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                <ShieldCheck size={16} /> I Accept These Terms
                            </button>
                            <button
                                onClick={() => setShowAgreement(false)}
                                className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-black uppercase tracking-widest rounded-2xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default SignupPage;
