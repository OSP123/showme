import type { PinType } from '$lib/models';
import { PIN_TTL_HOURS } from '$lib/models';

export interface PinTypeInfo {
  value: PinType;
  labelKey: string;
  emoji: string;
  ttl?: number;
}

export const PIN_TYPE_DEFINITIONS: PinTypeInfo[] = [
  { value: 'medical', labelKey: 'pinType.medical', emoji: '🏥', ttl: PIN_TTL_HOURS.medical },
  { value: 'water', labelKey: 'pinType.water', emoji: '💧' },
  { value: 'checkpoint', labelKey: 'pinType.checkpoint', emoji: '🚧', ttl: PIN_TTL_HOURS.checkpoint },
  { value: 'shelter', labelKey: 'pinType.shelter', emoji: '🏠', ttl: PIN_TTL_HOURS.shelter },
  { value: 'food', labelKey: 'pinType.food', emoji: '🍽️', ttl: PIN_TTL_HOURS.food },
  { value: 'danger', labelKey: 'pinType.danger', emoji: '⚠️', ttl: PIN_TTL_HOURS.danger },
  { value: 'other', labelKey: 'pinType.other', emoji: '📍', ttl: PIN_TTL_HOURS.other },
];

/** For use in imperative code (PinLayer popups) where reactive $_ won't work */
export function getPinTypeLabel(type: string, t: (key: string) => string): string {
  const def = PIN_TYPE_DEFINITIONS.find(d => d.value === type);
  if (def) return t(def.labelKey);
  // Fallback for 'other' → show as 'Location' in popups
  if (type === 'other') return t('pinType.location');
  return type;
}

/** Get emoji for a pin type */
export function getPinTypeEmoji(type: string): string {
  const def = PIN_TYPE_DEFINITIONS.find(d => d.value === type);
  return def?.emoji || '📍';
}
