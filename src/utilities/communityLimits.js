const WINDOW_MS = 10 * 60 * 1000;
const MAX_ACTIONS = 5;
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
  const key = storageKey(uid, action);
  const recentAttempts = readAttempts(key).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (recentAttempts.length >= MAX_ACTIONS) {
    const retryAfterMs = Math.max(0, WINDOW_MS - (now - recentAttempts[0]));
    const retryMinutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
    const actionLabel = action === 'report' ? 'reports' : 'messages and photos';
    throw new Error(`Limit reached: up to 5 ${actionLabel} every 10 minutes. Try again in ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`);
  }

  saveAttempts(key, [...recentAttempts, now]);
}
