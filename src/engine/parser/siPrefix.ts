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

  // Unknown suffix — throw rather than silently ignoring to catch typos early
  throw new WebSpiceError(
    'INVALID_PARAMETER',
    `Unknown unit suffix '${suffix}' in value '${value}'`
  );
}

// Ordered from smallest to largest for formatSIValue prefix selection.
// Each entry: [prefix character, multiplier]
const FORMAT_PREFIXES: [string, number][] = [
  ['f', 1e-15],
  ['p', 1e-12],
  ['n', 1e-9],
  ['u', 1e-6],
  ['m', 1e-3],
  ['', 1],
  ['k', 1e3],
  ['M', 1e6],
  ['G', 1e9],
  ['T', 1e12],
];

/**
 * Format a numeric value with an appropriate SI prefix.
 *
 * Tries to select an SI prefix so that the absolute scaled value lies in [1, 1000).
 * Zero is formatted without a prefix.
 * For magnitudes outside the supported prefix range (f…T), the smallest or largest
 * available prefix is used and the scaled value may fall outside [1, 1000).
 *
 * @param value - Numeric value to format
 * @param unit - Unit string to append (e.g. "V", "A", "W")
 * @param precision - Decimal places (default: 3)
 * @returns Formatted string (e.g. "4.000 mA", "-48.000 mW", "0.000 V")
 * @throws {WebSpiceError} INVALID_PARAMETER for non-finite values
 */
export function formatSIValue(
  value: number,
  unit: string,
  precision = 3
): string {
  if (!Number.isFinite(value)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Value must be a finite number, got ${value}`
    );
  }

  if (
    !Number.isFinite(precision) ||
    !Number.isInteger(precision) ||
    precision < 0 ||
    precision > 100
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `precision must be an integer between 0 and 100, got ${precision}`
    );
  }

  if (value === 0) {
    return `${(0).toFixed(precision)} ${unit}`;
  }

  const abs = Math.abs(value);

  // Find the largest prefix whose multiplier is <= abs
  let chosenIndex = 0;
  for (let i = 0; i < FORMAT_PREFIXES.length; i++) {
    if (abs >= FORMAT_PREFIXES[i][1]) {
      chosenIndex = i;
    }
  }

  let [prefix, multiplier] = FORMAT_PREFIXES[chosenIndex];
  let scaled = value / multiplier;

  // After rounding, values very close to a prefix boundary can produce "1000.000 <prefix>".
  // Promote to the next prefix when that happens.
  if (
    Math.abs(Number(scaled.toFixed(precision))) >= 1000 &&
    chosenIndex < FORMAT_PREFIXES.length - 1
  ) {
    chosenIndex += 1;
    [prefix, multiplier] = FORMAT_PREFIXES[chosenIndex];
    scaled = value / multiplier;
  }

  return `${scaled.toFixed(precision)} ${prefix}${unit}`;
}
