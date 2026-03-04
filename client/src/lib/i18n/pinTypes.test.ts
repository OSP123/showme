import { describe, it, expect } from 'vitest';
import { PIN_TYPE_DEFINITIONS, getPinTypeLabel, getPinTypeEmoji } from './pinTypes';

describe('pinTypes', () => {
  describe('PIN_TYPE_DEFINITIONS', () => {
    it('should have 7 pin types', () => {
      expect(PIN_TYPE_DEFINITIONS).toHaveLength(7);
    });

    it('should have all expected types', () => {
      const values = PIN_TYPE_DEFINITIONS.map(d => d.value);
      expect(values).toEqual(['medical', 'water', 'checkpoint', 'shelter', 'food', 'danger', 'other']);
    });

    it('should have labelKey for each type', () => {
      PIN_TYPE_DEFINITIONS.forEach(d => {
        expect(d.labelKey).toMatch(/^pinType\./);
      });
    });

    it('should have emoji for each type', () => {
      PIN_TYPE_DEFINITIONS.forEach(d => {
        expect(d.emoji).toBeTruthy();
      });
    });
  });

  describe('getPinTypeLabel', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'pinType.medical': 'Medical',
        'pinType.water': 'Water',
        'pinType.checkpoint': 'Checkpoint',
        'pinType.shelter': 'Shelter',
        'pinType.food': 'Food',
        'pinType.danger': 'Danger',
        'pinType.other': 'Other',
        'pinType.location': 'Location',
      };
      return translations[key] || key;
    };

    it('should return translated label for known types', () => {
      expect(getPinTypeLabel('medical', mockT)).toBe('Medical');
      expect(getPinTypeLabel('water', mockT)).toBe('Water');
      expect(getPinTypeLabel('danger', mockT)).toBe('Danger');
    });

    it('should return "Location" for "other" type', () => {
      // 'other' has a definition, so it returns 'Other' via the definition
      expect(getPinTypeLabel('other', mockT)).toBe('Other');
    });

    it('should return the raw type string for unknown types', () => {
      expect(getPinTypeLabel('unknown_type', mockT)).toBe('unknown_type');
    });
  });

  describe('getPinTypeEmoji', () => {
    it('should return correct emoji for known types', () => {
      expect(getPinTypeEmoji('medical')).toBe('🏥');
      expect(getPinTypeEmoji('water')).toBe('💧');
      expect(getPinTypeEmoji('checkpoint')).toBe('🚧');
      expect(getPinTypeEmoji('shelter')).toBe('🏠');
      expect(getPinTypeEmoji('food')).toBe('🍽️');
      expect(getPinTypeEmoji('danger')).toBe('⚠️');
      expect(getPinTypeEmoji('other')).toBe('📍');
    });

    it('should return default emoji for unknown types', () => {
      expect(getPinTypeEmoji('unknown')).toBe('📍');
    });
  });
});
