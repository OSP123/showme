// @ts-ignore - Skip type checking for setup file
import '@testing-library/jest-dom';
// @ts-ignore
import { afterEach, vi } from 'vitest';
// @ts-ignore
import { cleanup } from '@testing-library/svelte';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock global fetch
global.fetch = vi.fn();

// Mock crypto.randomUUID and preserve crypto.subtle for Web Crypto API
// Node.js has Web Crypto API available via crypto.webcrypto
import { webcrypto } from 'node:crypto';

const realCrypto = global.crypto || webcrypto;
Object.defineProperty(global, 'crypto', {
  value: {
    ...realCrypto,
    randomUUID: () => {
      return 'test-uuid-' + Math.random().toString(36).substring(2, 15);
    },
    // Use real Web Crypto API from Node.js
    subtle: webcrypto.subtle,
    getRandomValues: webcrypto.getRandomValues.bind(webcrypto),
  },
  writable: true,
  configurable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock IndexedDB
global.indexedDB = {
  open: vi.fn(),
} as any;

