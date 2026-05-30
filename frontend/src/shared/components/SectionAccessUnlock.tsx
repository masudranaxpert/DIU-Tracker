import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, User, Hash, Phone, LogIn, UserPlus } from 'lucide-react';
import { studentService, StudentSession, StudentUnlockPayload } from '@/shared/services/studentService';
import { Section } from '@/shared/types/types';

interface Props {
  batchId: string;
  section: Section;
  subSection?: string | null;
  title?: string;
  description?: string;
  submitLabel?: string;
  embedded?: boolean;
  onUnlocked: (session: StudentSession) => void;
}

type UnlockMode = 'returning' | 'new';

const SectionAccessUnlock: React.FC<Props> = ({
  batchId,
  section,
  subSection,
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
      ? `flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors duration-200 cursor-pointer ${
          active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
            : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-700/60'
        }`
      : `flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          active
            ? 'bg-indigo-600 text-white shadow-lg'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`;

  return (
    <motion.div
      initial={{ opacity: 0, y: embedded ? 8 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={
        embedded
          ? 'mx-auto max-w-lg space-y-5 pr-10 text-center'
          : 'bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 p-8 lg:p-12 shadow-2xl max-w-lg mx-auto text-center space-y-6'
      }
    >
      <div
        className={`flex items-center justify-center bg-indigo-600 text-white mx-auto shadow-lg shadow-indigo-600/20 ${
          embedded ? 'h-12 w-12 rounded-2xl' : 'w-20 h-20 rounded-[2rem]'
        }`}
      >
        <ShieldAlert size={embedded ? 24 : 40} strokeWidth={embedded ? 2.25 : 2} />
      </div>
      <div className="space-y-2.5">
        <h2
          id="section-unlock-form-title"
          className={
            embedded
              ? 'text-xl font-bold normal-case tracking-tight text-slate-900 dark:text-white'
              : 'text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight'
          }
        >
          {title}
        </h2>
        <p
          className={
            embedded
              ? 'text-sm font-normal normal-case leading-relaxed text-slate-600 dark:text-slate-300'
              : 'text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider'
          }
        >
          {desc}
        </p>
        <p className="pt-0.5">
          <span
            className={
              embedded
                ? 'inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-800/60'
                : 'inline-flex items-center rounded-full bg-gradient-to-r from-indigo-600/10 to-violet-600/10 dark:from-indigo-500/15 dark:to-violet-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
            }
          >
            Section {section}
            {subSection ? ` · Sub ${subSection}` : ''}
          </span>
        </p>
      </div>

      <div
        className={
          embedded
            ? 'flex gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80'
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
        <p
          className={
            embedded
              ? 'rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 py-2 px-4 rounded-xl'
          }
        >
          Welcome back, {knownStudent!.name}! Your student ID and PIN are enough.
        </p>
      )}

      {mode === 'returning' && studentId.trim().length >= 3 && !isLookingUp && !knownStudent && (
        <p
          className={
            embedded
              ? 'rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
              : 'text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 dark:bg-slate-800/50 py-2 px-4 rounded-xl'
          }
        >
          Enter your ID and PIN. If you are new, switch to the New student tab.
        </p>
      )}

      {mode === 'new' && knownStudent && (
        <p
          className={
            embedded
              ? 'rounded-xl bg-sky-50 px-4 py-2.5 text-sm text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
              : 'text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 dark:bg-sky-950/30 py-2 px-4 rounded-xl'
          }
        >
          This ID already exists — you can update your name and phone below.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
        <div className="relative">
          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Student ID (e.g. 252-15-346)"
            value={studentId}
            onChange={(e) => {
              setStudentId(e.target.value);
              setFormError('');
            }}
            className={`w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
              embedded ? '' : 'bg-slate-50 font-bold border-slate-100'
            }`}
            required
          />
          {isLookingUp && (
            <span
              className={`absolute right-4 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 ${
                embedded ? 'text-xs font-medium' : 'text-[9px] font-black text-indigo-500 uppercase'
              }`}
            >
              Checking…
            </span>
          )}
        </div>

        {mode === 'new' && (
          <>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setFormError('');
                }}
                className={`w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                  embedded ? '' : 'bg-slate-50 font-bold border-slate-100'
                }`}
                required
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="tel"
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition-colors duration-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                  embedded ? '' : 'bg-slate-50 font-bold border-slate-100'
                }`}
              />
            </div>
          </>
        )}

        <div className="relative pt-1">
          <label
            className={
              embedded
                ? 'mb-2 block px-1 text-center text-sm font-medium text-slate-700 dark:text-slate-300'
                : 'text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block text-center'
            }
          >
            CR access PIN (4 digits)
          </label>
          <div className="flex justify-center gap-2.5">
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
                className={`h-14 w-12 rounded-xl border-2 bg-white text-center text-2xl font-bold outline-none transition-all duration-200 disabled:opacity-50 dark:bg-slate-800 sm:h-16 sm:w-14 ${
                  pinError
                    ? 'border-rose-500 focus:border-rose-500'
                    : 'border-slate-200 focus:border-indigo-500 dark:border-slate-700'
                } ${embedded ? '' : 'bg-slate-50 font-black'}`}
              />
            ))}
          </div>
          <p
            className={
              embedded
                ? 'mt-2 text-center text-xs text-slate-500 dark:text-slate-400'
                : 'text-[9px] text-center text-slate-400 font-bold mt-2'
            }
          >
            {pinInput.length}/4 digits entered
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
                ? 'rounded-xl bg-rose-50 px-3 py-2 text-center text-sm font-medium leading-snug text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : 'text-[10px] font-black text-rose-500 uppercase tracking-widest text-center'
            }
          >
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={locked || isSubmitting || !canSubmit}
          className={`w-full rounded-2xl bg-indigo-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors duration-200 hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 ${
            embedded
              ? 'text-sm cursor-pointer'
              : 'py-4 font-black shadow-xl hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs disabled:grayscale'
          }`}
        >
          {locked ? 'Temporarily locked' : isSubmitting ? 'Verifying…' : submitLabel}
        </button>
      </form>

      <p
        className={
          embedded
            ? 'border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400'
            : 'text-[9px] font-black text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100 dark:border-slate-800'
        }
      >
        The CR PIN is set by your Class Representative for Section {section} only — not your student ID.
      </p>
    </motion.div>
  );
};

export default SectionAccessUnlock;
