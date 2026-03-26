import { describe, expect, it } from 'vitest';
import { formatSIValue, parseSIValue } from '@/engine/parser/siPrefix';

describe('SI Prefix Parser', () => {
  describe('plain numbers (no prefix)', () => {
    it('should parse integer', () => {
      expect(parseSIValue('100')).toBe(100);
    });

    it('should parse decimal', () => {
      expect(parseSIValue('3.14')).toBe(3.14);
    });

    it('should parse negative number', () => {
      expect(parseSIValue('-5')).toBe(-5);
    });

    it('should parse scientific notation', () => {
      expect(parseSIValue('1e3')).toBe(1000);
    });

    it('should return number input as-is', () => {
      expect(parseSIValue(1000)).toBe(1000);
    });
  });

  describe('SI prefix multipliers', () => {
    it('should parse femto (f) = 1e-15', () => {
      expect(parseSIValue('1f')).toBe(1e-15);
    });

    it('should parse pico (p) = 1e-12', () => {
      expect(parseSIValue('10p')).toBe(10e-12);
    });

    it('should parse nano (n) = 1e-9', () => {
      expect(parseSIValue('100n')).toBeCloseTo(100e-9, 20);
    });

    it('should parse micro (u) = 1e-6', () => {
      expect(parseSIValue('4.7u')).toBe(4.7e-6);
    });

    it('should parse milli (m) = 1e-3', () => {
      expect(parseSIValue('10m')).toBe(10e-3);
    });

    it('should parse kilo (k) = 1e3', () => {
      expect(parseSIValue('1k')).toBe(1000);
    });

    it('should parse kilo uppercase (K) = 1e3', () => {
      expect(parseSIValue('2.2K')).toBe(2200);
    });

    it('should parse mega (M) = 1e6', () => {
      expect(parseSIValue('1M')).toBe(1e6);
    });

    it('should parse giga (G) = 1e9', () => {
      expect(parseSIValue('1G')).toBe(1e9);
    });

    it('should parse tera (T) = 1e12', () => {
      expect(parseSIValue('1T')).toBe(1e12);
    });
  });

  describe('SPICE suffix convention', () => {
    it('should ignore trailing unit text after prefix', () => {
      // SPICE allows "10kOhm", "1uF", "100nH" — only first char after number matters
      expect(parseSIValue('10kOhm')).toBe(10e3);
      expect(parseSIValue('1uF')).toBe(1e-6);
      expect(parseSIValue('100nH')).toBeCloseTo(100e-9, 20);
    });

    it('should handle "meg" as mega (SPICE convention)', () => {
      // SPICE uses "meg" for mega to distinguish from "m" (milli)
      expect(parseSIValue('1meg')).toBe(1e6);
      expect(parseSIValue('2.2meg')).toBe(2.2e6);
    });

    it('should handle "mil" as 25.4e-6 (SPICE convention)', () => {
      expect(parseSIValue('1mil')).toBe(25.4e-6);
    });
  });

  describe('edge cases and errors', () => {
    it('should throw for empty string', () => {
      expect(() => parseSIValue('')).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw for non-numeric string', () => {
      expect(() => parseSIValue('abc')).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for NaN number input', () => {
      expect(() => parseSIValue(NaN)).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw for Infinity number input', () => {
      expect(() => parseSIValue(Infinity)).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for unknown SI prefix', () => {
      expect(() => parseSIValue('1x')).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });
  });
});

describe('SI Value Formatter', () => {
  describe('SI prefix selection', () => {
    it('should format femto range (1e-15)', () => {
      expect(formatSIValue(1e-15, 'F')).toBe('1.000 fF');
    });

    it('should format pico range (1e-12)', () => {
      expect(formatSIValue(10e-12, 'F')).toBe('10.000 pF');
    });

    it('should format nano range (1e-9)', () => {
      expect(formatSIValue(100e-9, 'H')).toBe('100.000 nH');
    });

    it('should format micro range (1e-6)', () => {
      expect(formatSIValue(4.7e-6, 'F')).toBe('4.700 uF');
    });

    it('should format milli range (1e-3)', () => {
      expect(formatSIValue(4e-3, 'A')).toBe('4.000 mA');
    });

    it('should format base range (no prefix)', () => {
      expect(formatSIValue(8, 'V')).toBe('8.000 V');
    });

    it('should format kilo range (1e3)', () => {
      expect(formatSIValue(1000, 'Ω')).toBe('1.000 kΩ');
    });

    it('should format mega range (1e6)', () => {
      expect(formatSIValue(2.2e6, 'Ω')).toBe('2.200 MΩ');
    });

    it('should format giga range (1e9)', () => {
      expect(formatSIValue(1e9, 'Hz')).toBe('1.000 GHz');
    });

    it('should format tera range (1e12)', () => {
      expect(formatSIValue(1e12, 'Hz')).toBe('1.000 THz');
    });
  });

  describe('special values', () => {
    it('should format zero without prefix', () => {
      expect(formatSIValue(0, 'V')).toBe('0.000 V');
    });

    it('should format negative values', () => {
      expect(formatSIValue(-48e-3, 'W')).toBe('-48.000 mW');
    });

    it('should use precision parameter', () => {
      expect(formatSIValue(1.23456, 'V', 2)).toBe('1.23 V');
    });

    it('should promote prefix when rounding would produce 1000', () => {
      // 9.9999999e-4 is in the µ range, but rounds to 1000.000 µV — should promote to mV
      expect(formatSIValue(9.9999999e-4, 'V')).toBe('1.000 mV');
    });
  });

  describe('errors', () => {
    it('should throw for NaN', () => {
      expect(() => formatSIValue(NaN, 'V')).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for Infinity', () => {
      expect(() => formatSIValue(Infinity, 'V')).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for -Infinity', () => {
      expect(() => formatSIValue(-Infinity, 'V')).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for negative precision', () => {
      expect(() => formatSIValue(1, 'V', -1)).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for precision > 100', () => {
      expect(() => formatSIValue(1, 'V', 101)).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });

    it('should throw for non-integer precision', () => {
      expect(() => formatSIValue(1, 'V', 2.5)).toThrowWebSpiceError(
        'INVALID_PARAMETER'
      );
    });
  });
});
