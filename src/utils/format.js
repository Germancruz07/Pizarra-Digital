const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function timeAgo(timestamp) {
  const diff = (timestamp - Date.now()) / 1000;
  for (const [unit, seconds] of UNITS) {
    if (Math.abs(diff) >= seconds) return rtf.format(Math.round(diff / seconds), unit);
  }
  return 'hace un momento';
}

export function formatDate(timestamp) {
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp);
}

export function pluralize(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

export function safeFileName(name) {
  return (name || 'pizarra').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'pizarra';
}
