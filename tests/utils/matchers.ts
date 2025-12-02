/**
 * Custom Vitest matchers for WebSpice numerical and circuit testing
 */

import type { Matrix } from '../../src/types/circuit';
import type { Resistor } from '../../src/types/component';
import { DEFAULT_TOLERANCE } from '../setup';

/**
 * Checks if two numbers are approximately equal within a tolerance
 */
function isCloseTo(
  actual: number,
  expected: number,
  tolerance: number
): boolean {
  const diff = Math.abs(actual - expected);
  return diff <= tolerance;
}

/**
 * Custom matcher: toBeCloseToArray
 * Checks if an array of numbers is close to another array within a tolerance
 *
 * @example
 * expect([1.0, 2.0, 3.0]).toBeCloseToArray([1.0001, 1.9999, 3.0001], 1e-3);
 */
export function toBeCloseToArray(
  this: { isNot: boolean },
  received: number[],
  expected: number[],
  tolerance: number = DEFAULT_TOLERANCE
) {
  const { isNot } = this;

  // Check if both are arrays
  if (!Array.isArray(received) || !Array.isArray(expected)) {
    return {
      pass: false,
      message: () =>
        `Expected both values to be arrays, but received: ${typeof received} and ${typeof expected}`,
    };
  }

  // Check length equality
  if (received.length !== expected.length) {
    return {
      pass: false,
      message: () =>
        `Expected arrays to have the same length, but received length ${received.length} and expected length ${expected.length}`,
    };
  }

  // Check each element
  const failures: Array<{ index: number; received: number; expected: number }> =
    [];
  for (let i = 0; i < received.length; i++) {
    if (!isCloseTo(received[i], expected[i], tolerance)) {
      failures.push({
        index: i,
        received: received[i],
        expected: expected[i],
      });
    }
  }

  const pass = failures.length === 0;

  return {
    pass,
    message: () => {
      if (isNot) {
        return `Expected arrays NOT to be close within tolerance ${tolerance}, but they were`;
      }

      if (failures.length > 0) {
        const failureDetails = failures
          .map(
            f =>
              `  [${f.index}]: ${f.received} (expected ${f.expected}, diff: ${Math.abs(f.received - f.expected)})`
          )
          .join('\n');
        return `Expected arrays to be close within tolerance ${tolerance}\nFailures:\n${failureDetails}`;
      }

      return `Expected arrays to be close within tolerance ${tolerance}`;
    },
  };
}

/**
 * Custom matcher: toBeValidMatrix
 * Validates that a matrix is properly formatted and optionally checks properties
 *
 * @example
 * expect(matrix).toBeValidMatrix({ square: true, nonSingular: true });
 */
export function toBeValidMatrix(
  this: { isNot: boolean },
  received: Matrix,
  options?: {
    square?: boolean;
    nonSingular?: boolean;
    symmetric?: boolean;
  }
) {
  const { isNot } = this;
  const errors: string[] = [];

  // Check if received is a valid Matrix object
  if (
    !received ||
    typeof received !== 'object' ||
    typeof received.rows !== 'number' ||
    typeof received.cols !== 'number' ||
    !(received.data instanceof Float64Array)
  ) {
    return {
      pass: false,
      message: () =>
        `Expected a valid Matrix object with rows, cols, and data (Float64Array), but received: ${JSON.stringify(received)}`,
    };
  }

  // Check data length matches dimensions
  const expectedLength = received.rows * received.cols;
  if (received.data.length !== expectedLength) {
    errors.push(
      `Data length (${received.data.length}) does not match dimensions (${received.rows}x${received.cols} = ${expectedLength})`
    );
  }

  // Check for non-negative dimensions
  if (received.rows <= 0 || received.cols <= 0) {
    errors.push(
      `Matrix dimensions must be positive, but got ${received.rows}x${received.cols}`
    );
  }

  // Check square matrix if requested
  if (options?.square && received.rows !== received.cols) {
    errors.push(
      `Expected square matrix, but got ${received.rows}x${received.cols}`
    );
  }

  // Check for NaN or Infinity values
  const hasInvalidValues = Array.from(received.data).some(
    val => !isFinite(val)
  );
  if (hasInvalidValues) {
    errors.push('Matrix contains NaN or Infinity values');
  }

  // Check non-singular (determinant != 0) if requested
  // Note: This is a simplified check - for a full implementation,
  // we would need to compute the actual determinant
  if (options?.nonSingular) {
    if (received.rows !== received.cols) {
      errors.push('Cannot check non-singularity for non-square matrix');
    } else {
      // Simple check: ensure no all-zero rows or columns
      const hasZeroRow = Array.from({ length: received.rows }).some(
        (_, row) => {
          return Array.from({ length: received.cols }).every(
            (_, col) => received.data[row * received.cols + col] === 0
          );
        }
      );
      if (hasZeroRow) {
        errors.push('Matrix has all-zero row (likely singular)');
      }
    }
  }

  // Check symmetric if requested
  if (options?.symmetric) {
    if (received.rows !== received.cols) {
      errors.push('Cannot check symmetry for non-square matrix');
    } else {
      const tolerance = 1e-10;
      let isSymmetric = true;
      for (let i = 0; i < received.rows && isSymmetric; i++) {
        for (let j = i + 1; j < received.cols; j++) {
          const val1 = received.data[i * received.cols + j];
          const val2 = received.data[j * received.cols + i];
          if (!isCloseTo(val1, val2, tolerance)) {
            isSymmetric = false;
            errors.push(
              `Matrix is not symmetric: M[${i},${j}]=${val1} != M[${j},${i}]=${val2}`
            );
            break;
          }
        }
      }
    }
  }

  const pass = errors.length === 0;

  return {
    pass,
    message: () => {
      if (isNot) {
        return 'Expected matrix NOT to be valid, but it was';
      }
      return errors.length > 0
        ? `Matrix validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
        : 'Expected matrix to be valid';
    },
  };
}

/**
 * Custom matcher: toSatisfyOhmsLaw
 * Verifies that a component satisfies Ohm's Law: V = I * R
 *
 * @example
 * expect(resistor).toSatisfyOhmsLaw(10, 0.01, 1e-10);
 */
export function toSatisfyOhmsLaw(
  this: { isNot: boolean },
  received: Resistor,
  voltage: number,
  current: number,
  tolerance: number = DEFAULT_TOLERANCE
) {
  const { isNot } = this;

  // Validate input types
  if (
    !received ||
    typeof received !== 'object' ||
    received.type !== 'resistor'
  ) {
    return {
      pass: false,
      message: () =>
        `Expected a Resistor component, but received: ${JSON.stringify(received)}`,
    };
  }

  if (typeof voltage !== 'number' || typeof current !== 'number') {
    return {
      pass: false,
      message: () =>
        `Expected voltage and current to be numbers, but received: voltage=${typeof voltage}, current=${typeof current}`,
    };
  }

  const { resistance } = received;

  // Check Ohm's Law: V = I * R
  const expectedVoltage = current * resistance;
  const voltageDiff = Math.abs(voltage - expectedVoltage);

  // Also check from current perspective: I = V / R
  const expectedCurrent = voltage / resistance;
  const currentDiff = Math.abs(current - expectedCurrent);

  const voltagePass =
    voltageDiff <= tolerance * Math.max(1, Math.abs(expectedVoltage));
  const currentPass =
    currentDiff <= tolerance * Math.max(1, Math.abs(expectedCurrent));

  const pass = voltagePass && currentPass;

  return {
    pass,
    message: () => {
      if (isNot) {
        return `Expected component NOT to satisfy Ohm's Law, but it did:\n  V = ${voltage}V, I = ${current}A, R = ${resistance}Ω\n  V = I × R: ${voltage}V ≈ ${expectedVoltage}V`;
      }

      return `Expected component to satisfy Ohm's Law (V = I × R) within tolerance ${tolerance}\n  Resistance: ${resistance}Ω\n  Given: V = ${voltage}V, I = ${current}A\n  Expected: V = ${expectedVoltage}V (diff: ${voltageDiff}V)\n  Expected: I = ${expectedCurrent}A (diff: ${currentDiff}A)`;
    },
  };
}

/**
 * Custom matcher: toConvergeWithin
 * Checks if a value converged within specified constraints
 *
 * @example
 * expect(result).toConvergeWithin({ iterations: 10, maxIterations: 100, tolerance: 1e-6, error: 1e-7 });
 */
export function toConvergeWithin(
  this: { isNot: boolean },
  received: { converged: boolean },
  options: {
    iterations: number;
    maxIterations: number;
    tolerance: number;
    error: number;
  }
) {
  const { isNot } = this;
  const { iterations, maxIterations, tolerance, error } = options;

  // Validate input
  if (!received || typeof received.converged !== 'boolean') {
    return {
      pass: false,
      message: () =>
        `Expected an object with 'converged' property, but received: ${JSON.stringify(received)}`,
    };
  }

  const errors: string[] = [];

  // Check if converged
  if (!received.converged) {
    errors.push('Solution did not converge');
  }

  // Check iterations within bounds
  if (iterations > maxIterations) {
    errors.push(
      `Iterations (${iterations}) exceeded maximum (${maxIterations})`
    );
  }

  // Check error within tolerance
  if (error > tolerance) {
    errors.push(`Final error (${error}) exceeded tolerance (${tolerance})`);
  }

  const pass = errors.length === 0;

  return {
    pass,
    message: () => {
      if (isNot) {
        return 'Expected NOT to converge within constraints, but it did';
      }

      return errors.length > 0
        ? `Convergence failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n  Iterations: ${iterations}/${maxIterations}\n  Error: ${error} (tolerance: ${tolerance})`
        : `Expected to converge within constraints:\n  Iterations: ${iterations}/${maxIterations}\n  Error: ${error} (tolerance: ${tolerance})`;
    },
  };
}
