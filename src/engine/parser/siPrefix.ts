import { WebSpiceError } from '@/types/circuit';

/**
 * SPICE-compatible SI prefix multipliers.
 *
 * Maps single-character suffixes to their numeric multipliers.
 * Case-sensitive except for 'k'/'K' (both = 1e3).
 *
 * Special SPICE conventions:
 * - "meg" = 1e6 (to distinguish from "m" = milli)
 * - "mil" = 25.4e-6 (1 mil = 1/1000 inch)
 */
const SI_PREFIXES: Record<string, number> = {
  f: 1e-15,
  p: 1e-12,
  n: 1e-9,
  u: 1e-6,
  m: 1e-3,
  k: 1e3,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
};

// Matches: optional sign, digits with optional decimal, optional exponent,
// then optional suffix (letters)
const SI_VALUE_REGEX = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)\s*(.*)$/;

/**
 * Parse a numeric value with optional SI prefix suffix.
 *
 * Accepts plain numbers, scientific notation, or numbers with SI prefix
 * suffixes following SPICE conventions. Any trailing text after the
 * prefix character is ignored (e.g., "10kOhm" → 10000).
 *
 * @param value - Number or string to parse
 * @returns Parsed numeric value
 * @throws {WebSpiceError} INVALID_PARAMETER for non-parseable values
 */
export function parseSIValue(value: number | string): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        `Value must be a finite number, got ${value}`
      );
    }
    return value;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Value cannot be an empty string'
    );
  }

  const match = SI_VALUE_REGEX.exec(trimmed);
  if (!match) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Cannot parse numeric value: '${value}'`
    );
  }

  const numericPart = Number(match[1]);
  const suffix = match[2];

  if (!Number.isFinite(numericPart)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Cannot parse numeric value: '${value}'`
    );
  }

  // No suffix → plain number
  if (suffix.length === 0) {
    return numericPart;
  }

  // Check SPICE multi-character prefixes first
  const lowerSuffix = suffix.toLowerCase();
  if (lowerSuffix.startsWith('meg')) {
    return numericPart * 1e6;
  }
  if (lowerSuffix.startsWith('mil')) {
    return numericPart * 25.4e-6;
  }

  // Single-character SI prefix
  const firstChar = suffix[0];
  const multiplier = SI_PREFIXES[firstChar];
  if (multiplier !== undefined) {
    return numericPart * multiplier;
  }

  // Unknown suffix — treat as plain number (SPICE ignores unknown suffixes)
  throw new WebSpiceError(
    'INVALID_PARAMETER',
    `Unknown SI prefix '${firstChar}' in value '${value}'`
  );
}
