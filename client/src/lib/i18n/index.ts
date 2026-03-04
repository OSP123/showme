import { register, init, getLocaleFromNavigator, locale } from 'svelte-i18n';

// Static imports for offline-first (all translations bundled at build time)
import en from './locales/en.json';
import ar from './locales/ar.json';
import fa from './locales/fa.json';
import ur from './locales/ur.json';
import uk from './locales/uk.json';
import ckb from './locales/ckb.json';
import ps from './locales/ps.json';
import ti from './locales/ti.json';
import my from './locales/my.json';
import fr from './locales/fr.json';

// Register all locales synchronously (bundled, no network needed)
register('en', () => Promise.resolve(en));
register('ar', () => Promise.resolve(ar));
register('fa', () => Promise.resolve(fa));
register('ur', () => Promise.resolve(ur));
register('uk', () => Promise.resolve(uk));
register('ckb', () => Promise.resolve(ckb));
register('ps', () => Promise.resolve(ps));
register('ti', () => Promise.resolve(ti));
register('my', () => Promise.resolve(my));
register('fr', () => Promise.resolve(fr));

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  { code: 'ar', name: 'العربية', dir: 'rtl' as const },
  { code: 'fa', name: 'فارسی', dir: 'rtl' as const },
  { code: 'ur', name: 'اردو', dir: 'rtl' as const },
  { code: 'uk', name: 'Українська', dir: 'ltr' as const },
  { code: 'ckb', name: 'کوردی', dir: 'rtl' as const },
  { code: 'ps', name: 'پښتو', dir: 'rtl' as const },
  { code: 'ti', name: 'ትግርኛ', dir: 'ltr' as const },
  { code: 'my', name: 'မြန်မာ', dir: 'ltr' as const },
  { code: 'fr', name: 'Français', dir: 'ltr' as const },
];

export const RTL_LOCALES = new Set(['ar', 'fa', 'ur', 'ckb', 'ps']);

const LOCALE_STORAGE_KEY = 'showme_locale';

export function getInitialLocale(): string {
  // 1. Check localStorage for persisted choice
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.some(l => l.code === stored)) {
      return stored;
    }
  }
  // 2. Auto-detect from browser
  const browserLocale = getLocaleFromNavigator();
  if (browserLocale) {
    const lang = browserLocale.split('-')[0];
    if (SUPPORTED_LOCALES.some(l => l.code === lang)) {
      return lang;
    }
  }
  // 3. Fallback to English
  return 'en';
}

init({
  fallbackLocale: 'en',
  initialLocale: getInitialLocale(),
});

// Persist locale changes and update document dir/lang attributes
locale.subscribe((value) => {
  if (typeof window !== 'undefined' && value) {
    localStorage.setItem(LOCALE_STORAGE_KEY, value);
    document.documentElement.lang = value;
    document.documentElement.dir = RTL_LOCALES.has(value) ? 'rtl' : 'ltr';
  }
});
