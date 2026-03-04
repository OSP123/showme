import type { PinRow } from './models';

export function getPinColor(pin: PinRow): string {
  // Tags are now arrays (TEXT[]), not JSON strings
  const tags = Array.isArray(pin.tags) ? pin.tags : [];
  if (tags.length > 0) {
    const type = tags[0];
    const colorMap: Record<string, string> = {
      medical: '#e74c3c',
      water: '#3498db',
      checkpoint: '#f39c12',
      shelter: '#2ecc71',
      food: '#9b59b6',
      danger: '#e67e22',
      other: '#95a5a6',
    };
    return colorMap[type] || '#95a5a6';
  }
  return '#95a5a6';
}

export function getPinEmoji(pin: PinRow): string {
  // Tags are now arrays (TEXT[]), not JSON strings
  const tags = Array.isArray(pin.tags) ? pin.tags : [];
  if (tags.length > 0) {
    const type = tags[0];
    const emojiMap: Record<string, string> = {
      medical: '🏥',
      water: '💧',
      checkpoint: '🚧',
      shelter: '🏠',
      food: '🍽️',
      danger: '⚠️',
      other: '📍',
    };
    return emojiMap[type] || '📍';
  }
  return '📍';
}

export function getTimeAgo(date: Date, t?: (key: string, opts?: any) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (t) {
    if (diffMins < 1) return t('time.justNow');
    if (diffMins < 60) return t('time.minutesAgo', { values: { count: diffMins } });
    if (diffHours < 24) return t('time.hoursAgo', { values: { count: diffHours } });
    if (diffDays < 7) return t('time.daysAgo', { values: { count: diffDays } });
  } else {
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}

