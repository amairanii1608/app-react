const LIMITS = {
  post: { max: 5, windowMs: 30 * 1000, label: 'messages and photos', windowLabel: '30 seconds' },
  report: { max: 2, windowMs: 10 * 1000, label: 'reports', windowLabel: '10 seconds' },
};
const memoryLimits = new Map();

function storageKey(uid, action) {
  return `nysl:${action}-rate:${uid}`;
}

function readAttempts(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.filter(Number.isFinite) : [];
  } catch {
    return memoryLimits.get(key) || [];
  }
}

function saveAttempts(key, attempts) {
  memoryLimits.set(key, attempts);
  try { localStorage.setItem(key, JSON.stringify(attempts)); } catch { /* Keep the limit for this page session. */ }
}

export function consumeCommunityLimit(uid, action, now = Date.now()) {
  const limit = LIMITS[action];
  if (!limit) throw new Error('Unknown community action.');

  const key = storageKey(uid, action);
  const recentAttempts = readAttempts(key).filter((timestamp) => now - timestamp < limit.windowMs);
  if (recentAttempts.length >= limit.max) {
    const retryAfterMs = Math.max(0, limit.windowMs - (now - recentAttempts[0]));
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    throw new Error(`Limit reached: up to ${limit.max} ${limit.label} every ${limit.windowLabel}. Try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`);
  }

  saveAttempts(key, [...recentAttempts, now]);
}
