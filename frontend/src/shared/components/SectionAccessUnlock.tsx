import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, User, Hash, Phone, LogIn, UserPlus } from 'lucide-react';
import { studentService, StudentSession, StudentUnlockPayload } from '@/shared/services/studentService';
import { Section } from '@/shared/types/types';

interface Props {
  batchId: string;
  section: Section;
  subSection?: string | null;
  batchLabel?: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  embedded?: boolean;
  onUnlocked: (session: StudentSession) => void;
}

function readStoredBatchLabel(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('selectedBatchName')?.trim() || '';
}

type UnlockMode = 'returning' | 'new';

const SectionAccessUnlock: React.FC<Props> = ({
  batchId,
  section,
  subSection,
  batchLabel,
  title = 'Access Locked',
  description,
  submitLabel = 'Unlock',
  embedded = false,
  onUnlocked,
}) => {
  const [mode, setMode] = useState<UnlockMode>('returning');
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [knownStudent, setKnownStudent] = useState<{ name: string; phone?: string } | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [resolvedBatchLabel, setResolvedBatchLabel] = useState(batchLabel?.trim() || '');

  useEffect(() => {
    if (batchLabel?.trim()) {
      setResolvedBatchLabel(batchLabel.trim());
      return;
    }
    setResolvedBatchLabel(readStoredBatchLabel());
  }, [batchLabel]);

  useEffect(() => {
    const storedAttempts = localStorage.getItem(`pin_attempts_${batchId}_${section}`);
    const storedLockout = localStorage.getItem(`pin_lockout_${batchId}_${section}`);
    if (storedAttempts) setAttempts(parseInt(storedAttempts, 10));
    if (storedLockout) setLockoutUntil(parseInt(storedLockout));
  }, [batchId, section]);

  const lookupStudent = useCallback(async (sid: string) => {
    const trimmed = sid.trim();
    if (trimmed.length < 3) {
      setKnownStudent(null);
      return;
    }
    setIsLookingUp(true);
    try {
      const result = await studentService.lookupStudent(trimmed);
      if (result.found && result.name) {
        setKnownStudent({ name: result.name, phone: result.phone });
        setName(result.name);
        setPhone(result.phone || '');
      } else {
        setKnownStudent(null);
      }
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (studentId.trim().length >= 3) lookupStudent(studentId);
      else setKnownStudent(null);
    }, 400);
    return () => clearTimeout(t);
  }, [studentId, lookupStudent]);

  const desc =
    description ||
    `Content for Section ${section} is protected. Enter your details and the PIN from your Class Representative.`;

  const quickUnlock = mode === 'returning' && !!knownStudent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const now = Date.now();
    if (lockoutUntil && now < lockoutUntil) return;

    const sid = studentId.trim();
    if (!sid) {
      setFormError('Student ID is required.');
      return;
    }
    if (pinInput.length !== 4) {
      setPinError(true);
      return;
    }

    const fullName = name.trim();
    if (mode === 'new' && !fullName) {
      setFormError('Full name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: StudentUnlockPayload = {
        batch_id: batchId,
        section: String(section),
        pin: String(pinInput).trim(),
        student_id: sid,
        ...(subSection ? { sub_section: subSection } : {}),
      };

      if (mode === 'returning') {
        // Returning: ID + PIN only — backend loads existing student from DB
      } else {
        payload.name = fullName;
        payload.phone = phone.trim();
      }

      const { session, error, errorCode } = await studentService.unlockSection(payload);

      if (session) {
        localStorage.removeItem(`pin_attempts_${batchId}_${section}`);
        localStorage.removeItem(`pin_lockout_${batchId}_${section}`);
        setPinError(false);
        setAttempts(0);
        setLockoutUntil(null);
        onUnlocked(session);
        return;
      }

      const pinFailed = errorCode === 'invalid_pin' || errorCode === 'network';
      if (pinFailed) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(`pin_attempts_${batchId}_${section}`, String(newAttempts));

        let newLockout: number | null = null;
        if (newAttempts >= 9) newLockout = Date.now() + 30 * 60 * 1000;
        else if (newAttempts >= 5) newLockout = Date.now() + 5 * 60 * 1000;
        else if (newAttempts >= 3) newLockout = Date.now() + 60 * 1000;

        if (newLockout) {
          setLockoutUntil(newLockout);
          localStorage.setItem(`pin_lockout_${batchId}_${section}`, String(newLockout));
        }
        setPinInput('');
      }

      setPinError(true);
      if (errorCode === 'invalid_pin') {
        setFormError(
          error ||
            'Wrong CR PIN for this section. Use the 4-digit code from your Class Representative (not 0000 unless they set that).'
        );
      } else if (errorCode === 'registration') {
        setFormError(error || 'Registration failed. Switch to New Student and enter your name.');
      } else {
        setFormError(error || 'Unlock failed. Try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const locked = !!(lockoutUntil && Date.now() < lockoutUntil);
  const canSubmit =
    !locked &&
    !!studentId.trim() &&
    pinInput.length === 4 &&
    (mode === 'returning' || !!name.trim());

  const tabBtnClass = (active: boolean) =>
    embedded
      ? `flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium transition-all duration-200 cursor-pointer ${
          active
            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-white dark:ring-slate-700/80'
            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
        }`
      : `flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          active
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`;

  const embeddedInputClass =
    'h-11 w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-indigo-400';

  const embeddedPinClass = (hasError: boolean) =>
    `h-12 w-11 rounded-lg border bg-white text-center text-xl font-semibold tabular-nums shadow-sm outline-none transition-all duration-200 disabled:opacity-50 dark:bg-slate-900 sm:h-[3.25rem] sm:w-12 ${
      hasError
        ? 'border-rose-400 focus:border-rose-500 focus:ring-[3px] focus:ring-rose-500/15'
        : 'border-slate-200 focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 dark:border-slate-700 dark:focus:border-indigo-400'
    }`;

  const bannerClass = (tone: 'emerald' | 'slate' | 'sky') => {
    const map = {
      emerald:
        'border-emerald-200/80 bg-emerald-50/90 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300',
      slate:
        'border-slate-200/80 bg-slate-50/90 text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-300',
      sky: 'border-sky-200/80 bg-sky-50/90 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300',
    };
    return `rounded-lg border px-3.5 py-2.5 text-[13px] leading-snug ${map[tone]}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: embedded ? 6 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        embedded
          ? 'w-full max-w-[340px] space-y-5 text-center'
          : 'bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 lg:p-12 shadow-2xl max-w-lg mx-auto text-center space-y-6'
      }
    >
      <div className="space-y-4">
        <div className="relative mx-auto w-fit">
          {embedded && (
            <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-indigo-500/15 blur-xl dark:bg-indigo-500/10" />
          )}
          <div
            className={`relative flex items-center justify-center text-white ${
              embedded
                ? 'h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/25 ring-1 ring-white/20'
                : 'mx-auto w-20 h-20 rounded-[2rem] bg-indigo-600 shadow-xl shadow-indigo-600/20'
            }`}
          >
            <ShieldAlert size={embedded ? 26 : 40} strokeWidth={embedded ? 2 : 2} />
          </div>
        </div>

        <div className="space-y-2">
          <h2
            id="section-unlock-form-title"
            className={
              embedded
                ? 'text-[1.375rem] font-semibold normal-case leading-tight tracking-tight text-slate-900 dark:text-white'
                : 'text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight'
            }
          >
            {title}
          </h2>
          <p
            className={
              embedded
                ? 'mx-auto max-w-[30ch] text-[13px] font-normal normal-case leading-relaxed text-slate-600 dark:text-slate-400'
                : 'text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider'
            }
          >
            {desc}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {resolvedBatchLabel ? (
              <span
                className={
                  embedded
                    ? 'inline-flex items-center rounded-full bg-violet-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25'
                    : 'inline-flex items-center rounded-full bg-violet-600/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 ring-1 ring-violet-500/20'
                }
              >
                {resolvedBatchLabel}
              </span>
            ) : null}
            <span
              className={
                embedded
                  ? 'inline-flex items-center rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/15 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/25'
                  : 'inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600/10 to-violet-600/10 dark:from-indigo-500/15 dark:to-violet-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
              }
            >
              Section {section}
              {subSection ? ` · Sub ${subSection}` : ''}
            </span>
          </div>
        </div>
      </div>

      <div
        className={
          embedded
            ? 'flex w-full gap-1 rounded-lg bg-slate-100/90 p-1 ring-1 ring-slate-200/60 dark:bg-slate-900/80 dark:ring-slate-800/80'
            : 'flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl'
        }
      >
        <button
          type="button"
          onClick={() => {
            setMode('returning');
            setFormError('');
          }}
          className={tabBtnClass(mode === 'returning')}
        >
          <LogIn size={embedded ? 16 : 14} />
          Already joined
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('new');
            setFormError('');
          }}
          className={tabBtnClass(mode === 'new')}
        >
          <UserPlus size={embedded ? 16 : 14} />
          New student
        </button>
      </div>

      {quickUnlock && (
        <p className={embedded ? bannerClass('emerald') : 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 py-2 px-4 rounded-xl'}>
          Welcome back, {knownStudent!.name}! Your student ID and PIN are enough.
        </p>
      )}

      {mode === 'returning' && studentId.trim().length >= 3 && !isLookingUp && !knownStudent && (
        <p className={embedded ? bannerClass('slate') : 'text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 py-2 px-4 rounded-xl'}>
          Enter your ID and PIN. If you are new, switch to the New student tab.
        </p>
      )}

      {mode === 'new' && knownStudent && (
        <p className={embedded ? bannerClass('sky') : 'text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/30 py-2 px-4 rounded-xl'}>
          This ID already exists — you can update your name and phone below.
        </p>
      )}

      <form onSubmit={handleSubmit} className={`space-y-4 ${embedded ? 'w-full' : 'text-left'}`}>
        <div className="space-y-1.5 text-left">
          {embedded && (
            <label htmlFor="unlock-student-id" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Student ID
            </label>
          )}
          <div className="relative">
            <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              id="unlock-student-id"
              type="text"
              placeholder="e.g. 252-15-346"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                setFormError('');
              }}
              className={embedded ? embeddedInputClass : 'w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500'}
              required
            />
            {isLookingUp && (
              <span
                className={`absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 ${
                  embedded ? 'text-xs font-medium' : 'text-[9px] font-black text-indigo-500 uppercase'
                }`}
              >
                Checking…
              </span>
            )}
          </div>
        </div>

        {mode === 'new' && (
          <>
            <div className="space-y-1.5 text-left">
              {embedded && (
                <label htmlFor="unlock-full-name" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Full name
                </label>
              )}
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  id="unlock-full-name"
                  type="text"
                  placeholder="Your full name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setFormError('');
                  }}
                  className={embedded ? embeddedInputClass : 'w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500'}
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5 text-left">
              {embedded && (
                <label htmlFor="unlock-phone" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Phone <span className="font-normal text-slate-400">(optional)</span>
                </label>
              )}
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                <input
                  id="unlock-phone"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={embedded ? embeddedInputClass : 'w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none font-bold text-sm focus:border-indigo-500'}
                />
              </div>
            </div>
          </>
        )}

        <div className="relative space-y-2.5 pt-0.5">
          <label
            htmlFor="pin-digit-0"
            className={
              embedded
                ? 'block text-center text-xs font-medium text-slate-700 dark:text-slate-300'
                : 'text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block text-center'
            }
          >
            CR access PIN
          </label>
          <div className="flex justify-center gap-2" role="group" aria-label="4 digit CR PIN">
            {[0, 1, 2, 3].map((i) => (
              <input
                key={i}
                id={`pin-digit-${i}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                disabled={locked}
                value={pinInput[i] || ''}
                onChange={(e) => {
                  const digit = e.target.value.replace(/\D/g, '').slice(-1);
                  const chars = pinInput.padEnd(4, ' ').split('').slice(0, 4);
                  chars[i] = digit;
                  const next = chars.join('').replace(/\s/g, '').slice(0, 4);
                  setPinInput(next);
                  setPinError(false);
                  setFormError('');
                  if (digit && i < 3) {
                    document.getElementById(`pin-digit-${i + 1}`)?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !pinInput[i] && i > 0) {
                    document.getElementById(`pin-digit-${i - 1}`)?.focus();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                  setPinInput(pasted);
                  setPinError(false);
                  setFormError('');
                }}
                className={
                  embedded
                    ? embeddedPinClass(pinError)
                    : `w-12 h-14 sm:w-14 sm:h-16 bg-slate-50 dark:bg-slate-800 border-2 rounded-xl outline-none text-center font-black text-2xl transition-all disabled:opacity-50 ${pinError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`
                }
                aria-label={`PIN digit ${i + 1}`}
              />
            ))}
          </div>
          <p
            className={
              embedded
                ? 'text-center text-[11px] text-slate-500 dark:text-slate-400'
                : 'text-[9px] text-center text-slate-400 font-bold mt-2'
            }
          >
            {pinInput.length} of 4 digits
          </p>
          {locked && (
            <div className="absolute inset-0 mt-6 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px] dark:bg-slate-900/80">
              <span
                className={
                  embedded
                    ? 'rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-medium text-rose-600 dark:border-rose-900 dark:bg-slate-900 dark:text-rose-400'
                    : 'text-[10px] font-black text-rose-500 uppercase tracking-widest bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-rose-200'
                }
              >
                Too many wrong PINs — wait {Math.max(1, Math.ceil((lockoutUntil! - Date.now()) / 1000))}s
              </span>
            </div>
          )}
        </div>

        {formError && (
          <p
            className={
              embedded
                ? 'rounded-lg border border-rose-200/80 bg-rose-50/90 px-3 py-2 text-center text-[13px] font-medium leading-snug text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/35 dark:text-rose-300'
                : 'text-[10px] font-black text-rose-500 uppercase tracking-widest text-center'
            }
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={locked || isSubmitting || !canSubmit}
          className={`w-full font-medium text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            embedded
              ? 'h-11 cursor-pointer rounded-lg bg-indigo-600 text-sm shadow-sm hover:bg-indigo-500 active:bg-indigo-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-indigo-500/25'
              : 'py-4 rounded-2xl bg-indigo-600 font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs disabled:grayscale'
          }`}
        >
          {locked ? 'Temporarily locked' : isSubmitting ? 'Verifying…' : submitLabel}
        </button>
      </form>

      <p
        className={
          embedded
            ? 'border-t border-slate-200/80 pt-4 text-center text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400'
            : 'text-[9px] font-black text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-slate-800'
        }
      >
        The CR PIN is set by your Class Representative for Section {section} only — not your student ID.
      </p>
    </motion.div>
  );
};

export default SectionAccessUnlock;
