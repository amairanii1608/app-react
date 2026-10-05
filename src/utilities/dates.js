export function formatGameDate(value) {
  const [month, day] = value.split('/').map(Number);
  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2000, month - 1, 1)));
  return `${monthName} ${day}`;
}

function toValidDate(timestamp) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatMessageTime(timestamp) {
  if (typeof timestamp !== 'number') return 'Now';
  const date = toValidDate(timestamp);
  if (!date) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' })
    .format(date);
}

export function formatPhotoDate(timestamp) {
  if (typeof timestamp !== 'number') return 'Now';
  const date = toValidDate(timestamp);
  if (!date) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    .format(date);
}
