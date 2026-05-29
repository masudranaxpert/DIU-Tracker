import React, { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ArrowRight, MailCheck, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { authService } from '@/shared/services/authService';

type Status = 'idle' | 'verifying' | 'success' | 'error';

const cardClass =
  'bg-white dark:bg-slate-900/90 border border-white/10 rounded-[3rem] p-12 lg:p-14 shadow-2xl';
const primaryButtonClass =
  'flex items-center justify-center gap-3 w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-500/20 uppercase tracking-[0.2em] text-xs';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('token');
  const pendingEmail = (location.state as { email?: string } | null)?.email ?? null;

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      const result = await authService.verifyEmail(token);
      if (!active) return;
      if (result.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(result.error || 'This verification link is invalid or has expired.');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handleResend = async () => {
    if (!pendingEmail) return;
    setResending(true);
    await authService.resendVerifyEmail(pendingEmail);
    setResending(false);
    setResent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 relative overflow-hidden p-6">
      <div className="w-full max-w-[540px] relative z-10 text-center">
        <div className={cardClass}>
          {status === 'verifying' && (
            <>
              <div className="w-24 h-24 bg-indigo-500/10 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Loader2 size={48} className="animate-spin" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                VERIFYING…
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Hang tight while we confirm your email.
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                EMAIL VERIFIED
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
                Your email is confirmed. An admin will review and approve your CR access shortly.
              </p>
              <Link to="/login" className={primaryButtonClass}>
                Continue to Login <ArrowRight size={18} />
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-24 h-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <XCircle size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                VERIFICATION FAILED
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
                {errorMessage}
              </p>
              <Link to="/login" className={primaryButtonClass}>
                Return to Login <ArrowRight size={18} />
              </Link>
            </>
          )}

          {status === 'idle' && (
            <>
              <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <MailCheck size={48} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                CHECK YOUR EMAIL
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed font-medium">
                {pendingEmail ? (
                  <>
                    A verification link was sent to <strong className="text-slate-700 dark:text-slate-200">{pendingEmail}</strong>.
                    Open it to finish your CR application.
                  </>
                ) : (
                  'A verification link has been sent to your email. Open it to finish your CR application.'
                )}
              </p>

              {pendingEmail && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || resent}
                  className="mb-4 flex items-center justify-center gap-2 w-full py-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl transition-all hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-60 uppercase tracking-[0.15em] text-xs"
                >
                  {resending ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  {resent ? 'Email Sent' : 'Resend Email'}
                </button>
              )}

              <Link to="/login" className={primaryButtonClass}>
                Return to Login <ArrowRight size={18} />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
