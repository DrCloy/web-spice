/**
 * Helper utilities for testing WebSpice
 * Provides common functions for numerical comparison and validation
 */

import type { Circuit, Matrix, Vector } from '@/types/circuit';
import type { Component } from '@/types/component';
import { DEFAULT_TOLERANCE } from '../setup';

// =============================================================================
// Numerical Comparison
// =============================================================================

/**
 * Checks if two numbers are approximately equal within a tolerance
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @param tolerance - Maximum allowed difference (default: DEFAULT_TOLERANCE)
 * @returns true if values are within tolerance
 *
 * @example
 * isCloseTo(1.0001, 1.0, 1e-3); // true
 * isCloseTo(1.1, 1.0, 1e-3); // false
 */
export function isCloseTo(
  actual: number,
  expected: number,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  if (!isFinite(actual) || !isFinite(expected)) {
    return false;
  }
  const diff = Math.abs(actual - expected);
  return diff <= tolerance;
}

/**
 * Checks if two arrays are approximately equal element-wise
 *
 * @param actual - The actual array
 * @param expected - The expected array
 * @param tolerance - Maximum allowed difference per element
 * @returns true if all elements are within tolerance
 *
 * @example
 * areArraysClose([1, 2, 3], [1.001, 2.001, 3.001], 1e-2); // true
 */
export function areArraysClose(
  actual: number[],
  expected: number[],
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  return actual.every((val, idx) => isCloseTo(val, expected[idx], tolerance));
}

/**
 * Computes the relative error between two values
 *
 * @param actual - The actual value
 * @param expected - The expected value
 * @returns Relative error: |actual - expected| / max(|expected|, 1)
 *
 * @example
 * relativeError(1.01, 1.0); // 0.01
 */
export function relativeError(actual: number, expected: number): number {
  const diff = Math.abs(actual - expected);
  const denominator = Math.max(Math.abs(expected), 1);
  return diff / denominator;
}

/**
 * Computes the maximum absolute error in an array
 *
 * @param actual - The actual array
 * @param expected - The expected array
 * @returns Maximum absolute difference
 *
 * @example
 * maxAbsoluteError([1, 2, 3], [1.1, 2.2, 3.3]); // 0.3
 */
export function maxAbsoluteError(actual: number[], expected: number[]): number {
  if (actual.length !== expected.length) {
    return Infinity;
  }

  let maxError = 0;
  for (let i = 0; i < actual.length; i++) {
    const error = Math.abs(actual[i] - expected[i]);
    if (error > maxError) {
      maxError = error;
    }
  }

  return maxError;
}

// =============================================================================
// Matrix Operations and Validation
// =============================================================================

/**
 * Checks if a matrix is square
 *
 * @param matrix - The matrix to check
 * @returns true if rows === cols
 */
export function isSquareMatrix(matrix: Matrix): boolean {
  return matrix.rows === matrix.cols;
}

/**
 * Checks if a matrix is symmetric (within tolerance)
 *
 * @param matrix - The matrix to check
 * @param tolerance - Maximum allowed difference
 * @returns true if matrix is symmetric
 */
export function isSymmetricMatrix(
  matrix: Matrix,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  if (!isSquareMatrix(matrix)) {
    return false;
  }

  const { rows, cols, data } = matrix;

  for (let i = 0; i < rows; i++) {
    for (let j = i + 1; j < cols; j++) {
      const val1 = data[i * cols + j];
      const val2 = data[j * cols + i];
      if (!isCloseTo(val1, val2, tolerance)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Gets a matrix element at (row, col)
 *
 * @param matrix - The matrix
 * @param row - Row index (0-based)
 * @param col - Column index (0-based)
 * @returns The element value
 */
export function getMatrixElement(
  matrix: Matrix,
  row: number,
  col: number
): number {
  if (row < 0 || row >= matrix.rows || col < 0 || col >= matrix.cols) {
    throw new Error(
      `Matrix index out of bounds: [${row}, ${col}] for ${matrix.rows}x${matrix.cols} matrix`
    );
  }
  return matrix.data[row * matrix.cols + col];
}

/**
 * Converts a matrix to a 2D array for easier inspection
 *
 * @param matrix - The matrix to convert
 * @returns 2D array representation
 *
 * @example
 * const arr = matrixTo2DArray(matrix);
 * console.log(arr); // [[1, 2], [3, 4]]
 */
export function matrixTo2DArray(matrix: Matrix): number[][] {
  const result: number[][] = [];

  for (let i = 0; i < matrix.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < matrix.cols; j++) {
      row.push(matrix.data[i * matrix.cols + j]);
    }
    result.push(row);
  }

  return result;
}

/**
 * Checks if two matrices are approximately equal
 *
 * @param actual - The actual matrix
 * @param expected - The expected matrix
 * @param tolerance - Maximum allowed difference per element
 * @returns true if matrices match within tolerance
 */
export function areMatricesClose(
  actual: Matrix,
  expected: Matrix,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  if (actual.rows !== expected.rows || actual.cols !== expected.cols) {
    return false;
  }

  return areArraysClose(
    Array.from(actual.data),
    Array.from(expected.data),
    tolerance
  );
}

// =============================================================================
// Vector Operations
// =============================================================================

/**
 * Computes the Euclidean norm (L2 norm) of a vector
 *
 * @param vector - The vector
 * @returns ||v||_2 = sqrt(sum(v_i^2))
 *
 * @example
 * vectorNorm({ length: 3, data: new Float64Array([3, 4, 0]) }); // 5
 */
export function vectorNorm(vector: Vector): number {
  let sumSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSquares += vector.data[i] * vector.data[i];
  }
  return Math.sqrt(sumSquares);
}

/**
 * Checks if two vectors are approximately equal
 *
 * @param actual - The actual vector
 * @param expected - The expected vector
 * @param tolerance - Maximum allowed difference per element
 * @returns true if vectors match within tolerance
 */
export function areVectorsClose(
  actual: Vector,
  expected: Vector,
  tolerance: number = DEFAULT_TOLERANCE
): boolean {
  if (actual.length !== expected.length) {
    return false;
  }

  return areArraysClose(
    Array.from(actual.data),
    Array.from(expected.data),
    tolerance
  );
}

// =============================================================================
// Circuit Validation
// =============================================================================

/**
 * Validates that a circuit has a ground node
 *
 * @param circuit - The circuit to validate
 * @returns true if circuit has a valid ground node
 */
export function hasGroundNode(circuit: Circuit): boolean {
  const groundNode = circuit.nodes.find(n => n.id === circuit.groundNodeId);
  return groundNode !== undefined && groundNode.isGround;
}

/**
 * Checks if a circuit has floating nodes (nodes with no connections)
 *
 * @param circuit - The circuit to validate
 * @returns Array of floating node IDs (empty if none)
 */
export function findFloatingNodes(circuit: Circuit): string[] {
  return circuit.nodes
    .filter(node => node.connectedComponents.length === 0)
    .map(node => node.id);
}

/**
 * Validates basic circuit structure
 *
 * @param circuit - The circuit to validate
 * @returns Validation result with any errors
 */
export function validateCircuit(circuit: Circuit): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for ground node
  if (!hasGroundNode(circuit)) {
    errors.push('Circuit must have a ground node');
  }

  // Check for floating nodes
  const floatingNodes = findFloatingNodes(circuit);
  if (floatingNodes.length > 0) {
    errors.push(`Floating nodes detected: ${floatingNodes.join(', ')}`);
  }

  // Check for components
  if (circuit.components.length === 0) {
    errors.push('Circuit must have at least one component');
  }

  // Check for nodes
  if (circuit.nodes.length === 0) {
    errors.push('Circuit must have at least one node');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets all components of a specific type from a circuit
 *
 * @param circuit - The circuit
 * @param type - The component type to filter
 * @returns Array of components matching the type
 */
export function getComponentsByType<T extends Component['type']>(
  circuit: Circuit,
  type: T
): Extract<Component, { type: T }>[] {
  return circuit.components.filter(c => c.type === type) as Extract<
    Component,
    { type: T }
  >[];
}

// =============================================================================
// Performance Measurement
// =============================================================================

/**
 * Measures the execution time of a function
 *
 * @param fn - The function to measure
 * @returns Execution time in milliseconds and the function result
 *
 * @example
 * const { time, result } = measureExecutionTime(() => heavyComputation());
 * console.log(`Took ${time}ms`);
 */
export function measureExecutionTime<T>(fn: () => T): {
  time: number;
  result: T;
} {
  const start = performance.now();
  const result = fn();
  const end = performance.now();

  return {
    time: end - start,
    result,
  };
}

/**
 * Runs a benchmark with multiple iterations
 *
 * @param fn - The function to benchmark
 * @param iterations - Number of iterations (default: 100)
 * @returns Statistics about execution time
 *
 * @example
 * const stats = benchmark(() => solver.solve(), 1000);
 * console.log(`Avg: ${stats.average}ms, Min: ${stats.min}ms, Max: ${stats.max}ms`);
 */
export function benchmark(
  fn: () => void,
  iterations: number = 100
): {
  average: number;
  min: number;
  max: number;
  total: number;
} {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  const total = times.reduce((sum, t) => sum + t, 0);
  const average = total / iterations;
  const min = Math.min(...times);
  const max = Math.max(...times);

  return { average, min, max, total };
}
