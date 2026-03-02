import { describe, it, expect } from 'vitest';
import { PIN_TTL_HOURS } from './models';

describe('Models Configuration', () => {
    describe('PIN_TTL_HOURS', () => {
        it('should have correct default values', () => {
            expect(PIN_TTL_HOURS.medical).toBe(24);
            expect(PIN_TTL_HOURS.water).toBeUndefined(); // Should have broken the TDD cycle here!
            expect(PIN_TTL_HOURS.checkpoint).toBe(2);
            expect(PIN_TTL_HOURS.shelter).toBe(24);
            expect(PIN_TTL_HOURS.food).toBe(12);
            expect(PIN_TTL_HOURS.danger).toBe(6);
            expect(PIN_TTL_HOURS.other).toBe(24);
        });
    });
});
