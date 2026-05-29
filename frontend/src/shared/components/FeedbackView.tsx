import React, { useState, useEffect } from 'react';
import { Section } from '@/shared/types/types';
import { feedbackService } from '@/shared/services/feedbackService';
import { FEEDBACK_CATEGORIES } from '@/shared/lib/admin/feedbackCategories';
import {
  containsProfanity,
  feedbackRateLimitRemaining,
  sanitizeFeedbackText,
  stampFeedbackRateLimit,
} from '@/shared/lib/admin/feedbackValidation';
import {
  MessageSquare,
  Send,
  Star,
  UserCircle,
  EyeOff,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Clock,
  Lock,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  batchId: string;
  section: Section;
  isCr: boolean;
  userProfile?: { full_name?: string; section?: string } | null;
}

const labelClass =
  'block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2';
const inputClass =
  'w-full px-4 py-3 text-base sm:text-sm font-medium text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 transition-all placeholder:text-slate-400';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

const FeedbackView: React.FC<Props> = ({ batchId, section, isCr, userProfile }) => {
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [authorName, setAuthorName] = useState(userProfile?.full_name || '');
  const [authorSession, setAuthorSession] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    const tick = () => setCooldownMs(feedbackRateLimitRemaining(batchId, section));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [batchId, section]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const remaining = feedbackRateLimitRemaining(batchId, section);
    if (remaining > 0) {
      const mins = Math.ceil(remaining / 60000);
      setError(`Please wait ${mins} minute${mins > 1 ? 's' : ''} before submitting again.`);
      return;
    }

    if (!message.trim()) {
      setError('Please write your feedback.');
      return;
    }
    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }
    if (!isAnonymous && !authorName.trim()) {
      setError('Please enter your name or switch to anonymous.');
      return;
    }

    const badWord = containsProfanity(message);
    if (badWord) {
      setError('Your message contains inappropriate language. Please revise and resubmit.');
      return;
    }
    if (!isAnonymous && containsProfanity(authorName)) {
      setError('Please use your real name without inappropriate language.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await feedbackService.submitFeedback({
        batch_id: batchId,
        section,
        message: sanitizeFeedbackText(message),
        category,
        rating,
        is_anonymous: isAnonymous,
        author_name: isAnonymous ? undefined : sanitizeFeedbackText(authorName),
        author_session: isAnonymous ? undefined : sanitizeFeedbackText(authorSession),
      });
      if (!result.ok) throw new Error(result.error || 'Failed to submit');
      stampFeedbackRateLimit(batchId, section);
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setMessage('');
    setRating(0);
    setCategory('general');
    setIsAnonymous(false);
    setAuthorName(userProfile?.full_name || '');
    setAuthorSession('');
    setSubmitted(false);
    setError(null);
  };

  const cooldownMins = Math.ceil(cooldownMs / 60000);

  if (!isCr) {
    return (
      <div className="flex-1 p-4 sm:p-6 lg:p-8 pb-24">
        <div className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 sm:p-10 text-center shadow-lg">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <Lock className="w-7 h-7" strokeWidth={2} />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            CR only
          </h3>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-2 leading-relaxed">
            Only the active Class Representative for this section can submit feedback. Submissions are
            private and visible only to super admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 max-w-2xl mx-auto w-full space-y-5 sm:space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-white shadow-lg shadow-indigo-600/20">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
            <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.25} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
              Section feedback
            </h2>
            <p className="text-sm text-indigo-100/90 font-medium mt-1 leading-snug">
              Section {section} · Sent to admin inbox only
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-sm sm:text-[15px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
            Share feedback for your section. Students cannot see what you submit.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-5 sm:px-8 py-10 sm:py-12 flex flex-col items-center text-center gap-5"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10" strokeWidth={2} />
              </div>
              <div>
                <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  Thank you
                </h4>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1.5">
                  Your feedback was delivered to the admin inbox.
                </p>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition-colors cursor-pointer"
              >
                Submit another
              </button>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="px-5 sm:px-6 py-5 sm:py-6 space-y-6 sm:space-y-7"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {/* Anonymous */}
              <div className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isAnonymous
                        ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400'
                        : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400'
                    }`}
                  >
                    {isAnonymous ? (
                      <EyeOff className="w-5 h-5" strokeWidth={2} />
                    ) : (
                      <UserCircle className="w-5 h-5" strokeWidth={2} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Post anonymously
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isAnonymous ? 'Admin will not see your name' : 'Your name is shared with admin'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAnonymous}
                  onClick={() => setIsAnonymous(!isAnonymous)}
                  className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer ${
                    isAnonymous ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isAnonymous ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  <div>
                    <label className={labelClass}>Your name</label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Full name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Semester (optional)</label>
                    <input
                      type="text"
                      value={authorSession}
                      onChange={(e) => setAuthorSession(e.target.value)}
                      placeholder="e.g. 5th"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <label className={labelClass}>Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {FEEDBACK_CATEGORIES.map((cat) => {
                    const selected = category === cat.id;
                    const Icon = cat.Icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`group flex flex-col items-center gap-2 p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer min-h-[88px] sm:min-h-[96px] ${
                          selected
                            ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30 shadow-sm shadow-indigo-500/10'
                            : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-colors ${
                            selected ? cat.activeClass : cat.tileClass
                          }`}
                        >
                          <Icon
                            className="w-5 h-5 sm:w-[22px] sm:h-[22px]"
                            strokeWidth={selected ? 2.25 : 2}
                          />
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold leading-tight text-center ${
                            selected
                              ? 'text-indigo-700 dark:text-indigo-300'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className={labelClass}>Rating</label>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star
                        className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors ${
                          star <= (hoverRating || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 dark:text-slate-700'
                        }`}
                        strokeWidth={1.75}
                      />
                    </button>
                  ))}
                  {(hoverRating || rating) > 0 && (
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 ml-1 sm:ml-2">
                      {ratingLabels[hoverRating || rating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label className={`${labelClass} mb-0`}>Message</label>
                  <span
                    className={`text-xs font-medium tabular-nums ${
                      message.length > 900 ? 'text-rose-500' : 'text-slate-400'
                    }`}
                  >
                    {message.length}/1000
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your feedback clearly…"
                  className={`${inputClass} resize-none leading-relaxed min-h-[120px]`}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-300 text-sm font-medium">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={2} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || message.length > 1000 || cooldownMs > 0}
                className="w-full py-3.5 sm:py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-semibold rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending…
                  </>
                ) : cooldownMs > 0 ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Wait {cooldownMins} min
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" strokeWidth={2} />
                    Submit feedback
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                One submission every 10 minutes
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FeedbackView;
