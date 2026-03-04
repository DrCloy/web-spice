import { describe, expect, it } from 'vitest';
import { parseSIValue } from '@/engine/parser/siPrefix';

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
      expect(() => parseSIValue('')).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'empty string'
      );
    });

    it('should throw for non-numeric string', () => {
      expect(() => parseSIValue('abc')).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        "Cannot parse numeric value: 'abc'"
      );
    });

    it('should throw for NaN number input', () => {
      expect(() => parseSIValue(NaN)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'finite number'
      );
    });

    it('should throw for Infinity number input', () => {
      expect(() => parseSIValue(Infinity)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'finite number'
      );
    });
  });
});
