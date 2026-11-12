export function uid(prefix = '') {
  const rand =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(36).padStart(2, '0')).join('')
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}
