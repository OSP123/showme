import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SUPPORTED_LOCALES, RTL_LOCALES, getInitialLocale } from './index';
import { locale } from 'svelte-i18n';
import { get } from 'svelte/store';

describe('i18n configuration', () => {
  describe('SUPPORTED_LOCALES', () => {
    it('should have 10 supported locales', () => {
      expect(SUPPORTED_LOCALES).toHaveLength(10);
    });

    it('should include English as first locale', () => {
      expect(SUPPORTED_LOCALES[0]).toEqual({ code: 'en', name: 'English', dir: 'ltr' });
    });

    it('should include Arabic', () => {
      const ar = SUPPORTED_LOCALES.find(l => l.code === 'ar');
      expect(ar).toBeDefined();
      expect(ar!.dir).toBe('rtl');
    });

    it('should have dir property for all locales', () => {
      SUPPORTED_LOCALES.forEach(locale => {
        expect(['ltr', 'rtl']).toContain(locale.dir);
      });
    });

    it('should have all expected locale codes', () => {
      const codes = SUPPORTED_LOCALES.map(l => l.code);
      expect(codes).toEqual(['en', 'ar', 'fa', 'ur', 'uk', 'ckb', 'ps', 'ti', 'my', 'fr']);
    });

    it('should have native language names', () => {
      const ar = SUPPORTED_LOCALES.find(l => l.code === 'ar');
      expect(ar!.name).toBe('العربية');
      const uk = SUPPORTED_LOCALES.find(l => l.code === 'uk');
      expect(uk!.name).toBe('Українська');
      const fr = SUPPORTED_LOCALES.find(l => l.code === 'fr');
      expect(fr!.name).toBe('Français');
    });
  });

  describe('RTL_LOCALES', () => {
    it('should contain 5 RTL locales', () => {
      expect(RTL_LOCALES.size).toBe(5);
    });

    it('should include Arabic, Farsi, Urdu, Kurdish, Pashto', () => {
      expect(RTL_LOCALES.has('ar')).toBe(true);
      expect(RTL_LOCALES.has('fa')).toBe(true);
      expect(RTL_LOCALES.has('ur')).toBe(true);
      expect(RTL_LOCALES.has('ckb')).toBe(true);
      expect(RTL_LOCALES.has('ps')).toBe(true);
    });

    it('should not include LTR languages', () => {
      expect(RTL_LOCALES.has('en')).toBe(false);
      expect(RTL_LOCALES.has('uk')).toBe(false);
      expect(RTL_LOCALES.has('fr')).toBe(false);
      expect(RTL_LOCALES.has('ti')).toBe(false);
      expect(RTL_LOCALES.has('my')).toBe(false);
    });

    it('should match RTL locales in SUPPORTED_LOCALES', () => {
      const rtlFromSupported = SUPPORTED_LOCALES
        .filter(l => l.dir === 'rtl')
        .map(l => l.code);
      const rtlFromSet = Array.from(RTL_LOCALES);
      expect(rtlFromSupported.sort()).toEqual(rtlFromSet.sort());
    });
  });

  describe('getInitialLocale', () => {
    beforeEach(() => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
    });

    it('should return stored locale from localStorage', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('ar');
      expect(getInitialLocale()).toBe('ar');
    });

    it('should ignore invalid stored locale', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('zz');
      expect(getInitialLocale()).toBe('en');
    });

    it('should fallback to English when no stored locale', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      expect(getInitialLocale()).toBe('en');
    });

    it('should accept all supported locale codes', () => {
      for (const loc of SUPPORTED_LOCALES) {
        vi.mocked(localStorage.getItem).mockReturnValue(loc.code);
        expect(getInitialLocale()).toBe(loc.code);
      }
    });
  });

  describe('locale switching', () => {
    // Helper to wait for locale to finish loading after set()
    function waitForLocale(): Promise<void> {
      return new Promise((resolve) => {
        const unsub = locale.subscribe((val) => {
          if (val) {
            // Use setTimeout to let the subscriber side effects run
            setTimeout(() => {
              unsub();
              resolve();
            }, 0);
          }
        });
      });
    }

    afterEach(async () => {
      // Reset to English after each test
      locale.set('en');
      await waitForLocale();
    });

    it('should set document dir to rtl when switching to Arabic', async () => {
      locale.set('ar');
      await waitForLocale();
      expect(document.documentElement.dir).toBe('rtl');
    });

    it('should set document dir to ltr when switching to English', async () => {
      locale.set('ar');
      await waitForLocale();
      locale.set('en');
      await waitForLocale();
      expect(document.documentElement.dir).toBe('ltr');
    });

    it('should set document lang attribute when switching locale', async () => {
      locale.set('ar');
      await waitForLocale();
      expect(document.documentElement.lang).toBe('ar');

      locale.set('fr');
      await waitForLocale();
      expect(document.documentElement.lang).toBe('fr');
    });

    it('should persist locale to localStorage on change', async () => {
      vi.mocked(localStorage.setItem).mockClear();
      locale.set('uk');
      await waitForLocale();
      expect(localStorage.setItem).toHaveBeenCalledWith('showme_locale', 'uk');
    });

    it('should set RTL for all RTL locales', async () => {
      for (const rtlCode of RTL_LOCALES) {
        locale.set(rtlCode);
        await waitForLocale();
        expect(document.documentElement.dir).toBe('rtl');
      }
    });

    it('should set LTR for all LTR locales', async () => {
      const ltrLocales = SUPPORTED_LOCALES.filter(l => l.dir === 'ltr');
      for (const loc of ltrLocales) {
        locale.set(loc.code);
        await waitForLocale();
        expect(document.documentElement.dir).toBe('ltr');
      }
    });
  });
});
