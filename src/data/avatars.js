export const AVATAR_GRADIENTS = [
  ['#6366f1', '#a855f7'],
  ['#ec4899', '#f43f5e'],
  ['#f59e0b', '#ef4444'],
  ['#10b981', '#06b6d4'],
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#84cc16'],
  ['#0f172a', '#475569'],
];

export const AVATAR_EMOJIS = [
  '🦊', '🐼', '🐨', '🦁', '🐯', '🐸', '🐙', '🦄',
  '🐝', '🐧', '🦉', '🐳', '🌵', '🌈', '🚀', '🎨',
  '🎧', '⚡', '🔥', '🍀', '🍕', '🎯', '💡', '👾',
];

export function randomAvatar() {
  return {
    type: 'emoji',
    value: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)],
    gradient: Math.floor(Math.random() * AVATAR_GRADIENTS.length),
  };
}

export function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
