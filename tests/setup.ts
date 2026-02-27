/**
 * Vitest Global Setup and Configuration
 * This file initializes the test environment and registers custom matchers
 */

import { expect } from 'vitest';
import type { ErrorCode } from '@/types/circuit';
import * as matchers from './utils/matchers';

/**
 * Numerical tolerance constants for testing
 * These values are used throughout the test suite for floating-point comparisons
 */
export const NUMERICAL_TOLERANCE = {
  /**
   * High precision for critical matrix operations and numerical solver algorithms
   * Used for: LU decomposition, matrix inversion, solver convergence
   */
  HIGH_PRECISION: 1e-12,

  /**
   * Medium precision for general circuit calculations
   * Used for: Nodal analysis, general arithmetic operations
   */
  MEDIUM_PRECISION: 1e-9,

  /**
   * Low precision for UI display and visualization
   * Used for: Chart rendering, user-facing values
   */
  LOW_PRECISION: 1e-6,

  /**
   * Voltage comparison tolerance (Volts)
   * Accounts for numerical errors in voltage calculations
   */
  VOLTAGE_TOLERANCE: 1e-6,

  /**
   * Current comparison tolerance (Amperes)
   * Higher precision needed due to typical small current values
   */
  CURRENT_TOLERANCE: 1e-9,

  /**
   * Resistance comparison tolerance (Ohms)
   * Used for component parameter verification
   */
  RESISTANCE_TOLERANCE: 1e-6,

  /**
   * Power comparison tolerance (Watts)
   * Used for power dissipation calculations
   */
  POWER_TOLERANCE: 1e-9,
} as const;

/**
 * Default tolerance for general floating-point comparisons
 */
export const DEFAULT_TOLERANCE = NUMERICAL_TOLERANCE.MEDIUM_PRECISION;

/**
 * Maximum allowed iterations for convergence tests
 */
export const MAX_ITERATIONS = {
  /**
   * Standard maximum iterations for DC analysis
   */
  DC_ANALYSIS: 100,

  /**
   * Maximum iterations for AC analysis per frequency point
   */
  AC_ANALYSIS: 50,

  /**
   * Maximum iterations for transient analysis per time step
   */
  TRANSIENT_ANALYSIS: 100,
} as const;

// Register custom matchers with Vitest
expect.extend(matchers);

// Declare custom matcher types for TypeScript
declare module 'vitest' {
  interface Assertion<T> {
    /**
     * Checks if an array of numbers is close to another array within a tolerance
     * @param expected - The expected array of numbers
     * @param tolerance - The maximum allowed difference (default: MEDIUM_PRECISION)
     */
    toBeCloseToArray(expected: number[], tolerance?: number): T;

    /**
     * Validates that a matrix is properly formatted and optionally checks properties
     * @param options - Matrix validation options (square, nonSingular, etc.)
     */
    toBeValidMatrix(options?: {
      square?: boolean;
      nonSingular?: boolean;
      symmetric?: boolean;
    }): T;

    /**
     * Verifies that a component satisfies Ohm's Law: V = I * R
     * @param voltage - The voltage across the component (V)
     * @param current - The current through the component (A)
     * @param tolerance - The maximum allowed error (default: MEDIUM_PRECISION)
     */
    toSatisfyOhmsLaw(voltage: number, current: number, tolerance?: number): T;

    /**
     * Checks if a value converged within specified constraints
     * @param options - Convergence criteria
     */
    toConvergeWithin(options: {
      iterations: number;
      maxIterations: number;
      tolerance: number;
      error: number;
    }): T;

    /**
     * Asserts that a function throws a WebSpiceError with the expected error code
     * @param code - Expected WebSpiceError error code
     * @param messageMatch - Optional substring that must appear in the error message
     */
    toThrowWebSpiceError(code: ErrorCode, messageMatch?: string): T;
  }

  interface AsymmetricMatchersContaining {
    toBeCloseToArray(expected: number[], tolerance?: number): unknown;
    toBeValidMatrix(options?: {
      square?: boolean;
      nonSingular?: boolean;
      symmetric?: boolean;
    }): unknown;
    toSatisfyOhmsLaw(
      voltage: number,
      current: number,
      tolerance?: number
    ): unknown;
    toConvergeWithin(options: {
      iterations: number;
      maxIterations: number;
      tolerance: number;
      error: number;
    }): unknown;
    toThrowWebSpiceError(code: ErrorCode, messageMatch?: string): unknown;
  }
}
