import type { PinType } from './models';
import { PIN_TTL_HOURS } from './models';

export interface ExpirationOption {
  value: string;
  labelKey: string;
  hours: number | null;
}

export const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { value: 'default', labelKey: 'createPin.expiresDefault', hours: null },
  { value: '1h',      labelKey: 'createPin.expires1h',      hours: 1 },
  { value: '6h',      labelKey: 'createPin.expires6h',      hours: 6 },
  { value: '12h',     labelKey: 'createPin.expires12h',     hours: 12 },
  { value: '24h',     labelKey: 'createPin.expires24h',     hours: 24 },
  { value: '7d',      labelKey: 'createPin.expires7d',      hours: 7 * 24 },
  { value: 'never',   labelKey: 'createPin.expiresNever',   hours: null },
];

/**
 * Compute the expires_at ISO timestamp based on user selection and pin type.
 * - "default": use the type-based TTL from PIN_TTL_HOURS
 * - "never": no expiration (returns null)
 * - specific time: compute from now + hours
 */
export function computeExpiresAt(
  selection: string,
  pinType?: PinType
): string | null {
  if (selection === 'never') return null;

  if (selection === 'default') {
    const ttl = pinType ? PIN_TTL_HOURS[pinType] : undefined;
    if (ttl === undefined) return null;
    const date = new Date();
    date.setTime(date.getTime() + ttl * 60 * 60 * 1000);
    return date.toISOString();
  }

  const option = EXPIRATION_OPTIONS.find(o => o.value === selection);
  if (!option || option.hours === null) return null;

  const date = new Date();
  date.setTime(date.getTime() + option.hours * 60 * 60 * 1000);
  return date.toISOString();
}
