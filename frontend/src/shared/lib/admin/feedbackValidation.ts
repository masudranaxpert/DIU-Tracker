const RATE_LIMIT_MS = 10 * 60 * 1000;

const BLOCKED_WORDS = new Set([
  'fuck', 'shit', 'bitch', 'asshole', 'bastard', 'damn', 'crap',
  'dick', 'cock', 'pussy', 'nigger', 'faggot', 'whore', 'slut',
  'motherfucker', 'idiot', 'stupid', 'moron', 'retard', 'dumbass',
  'harami', 'madarchod', 'banchod', 'chutiya', 'sala', 'kuttar bacha',
  'bokachoda', 'khanki', 'randi', 'magi', 'behuda', 'gadhya',
]);

export const feedbackRateLimitKey = (batchId: string, section: string) =>
  `dct_feedback_rl_${batchId}_${section}`;

export function feedbackRateLimitRemaining(batchId: string, section: string): number {
  const key = feedbackRateLimitKey(batchId, section);
  const last = parseInt(localStorage.getItem(key) || '0', 10);
  const remaining = RATE_LIMIT_MS - (Date.now() - last);
  return remaining > 0 ? remaining : 0;
}

export function stampFeedbackRateLimit(batchId: string, section: string) {
  localStorage.setItem(feedbackRateLimitKey(batchId, section), String(Date.now()));
}

export function containsProfanity(text: string): string | null {
  const lower = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
  for (const word of lower.split(/\s+/)) {
    if (BLOCKED_WORDS.has(word)) return word;
  }
  return null;
}

export function sanitizeFeedbackText(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 1000);
}
