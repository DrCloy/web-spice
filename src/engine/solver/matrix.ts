/**
 * Matrix and Vector Operations for WebSpice Numerical Engine
 *
 * This module provides core mathematical operations for matrix and vector
 * computations used in circuit analysis. All operations return new instances
 * (immutable) and use Float64Array for numerical stability.
 *
 * @module engine/solver/matrix
 */

import type {
  CSRMatrix,
  Matrix,
  SparseEntry,
  SparseMatrix,
  Vector,
} from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';

// ============================================================================
// Internal Helpers
// ============================================================================

function validateTolerance(tolerance: number): void {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Tolerance must be a finite non-negative number'
    );
  }
}

// ============================================================================
// Vector Operations
// ============================================================================

/**
 * Add two vectors element-wise
 *
 * @param v1 - First vector
 * @param v2 - Second vector
 * @returns New vector with element-wise sum
 * @throws {WebSpiceError} If vector dimensions don't match
 *
 * @example
 * const v1 = { length: 3, data: Float64Array.from([1, 2, 3]) };
 * const v2 = { length: 3, data: Float64Array.from([4, 5, 6]) };
 * const result = addVectors(v1, v2);
 * // result.data = [5, 7, 9]
 */
export function addVectors(v1: Vector, v2: Vector): Vector {
  // Validate inputs exist
  if (!v1 || !v2) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vectors cannot be null or undefined'
    );
  }

  // Validate dimensions
  if (v1.length !== v2.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector dimensions must match: ${v1.length} vs ${v2.length}`
    );
  }

  // Perform operation
  const data = new Float64Array(v1.length);
  for (let i = 0; i < v1.length; i++) {
    data[i] = v1.data[i] + v2.data[i];
  }

  return { length: v1.length, data };
}

/**
 * Subtract two vectors element-wise (v1 - v2)
 *
 * @param v1 - First vector
 * @param v2 - Second vector (subtracted from v1)
 * @returns New vector with element-wise difference
 * @throws {WebSpiceError} If vector dimensions don't match
 */
export function subtractVectors(v1: Vector, v2: Vector): Vector {
  // Validate inputs exist
  if (!v1 || !v2) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vectors cannot be null or undefined'
    );
  }

  // Validate dimensions
  if (v1.length !== v2.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector dimensions must match: ${v1.length} vs ${v2.length}`
    );
  }

  // Perform operation
  const data = new Float64Array(v1.length);
  for (let i = 0; i < v1.length; i++) {
    data[i] = v1.data[i] - v2.data[i];
  }

  return { length: v1.length, data };
}

/**
 * Scale a vector by a scalar value
 *
 * @param v - Vector to scale
 * @param scalar - Scalar multiplier
 * @returns New vector with all elements multiplied by scalar
 * @throws {WebSpiceError} If vector is null or scalar is invalid
 */
export function scaleVector(v: Vector, scalar: number): Vector {
  // Validate inputs
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  if (!Number.isFinite(scalar)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Scalar must be a finite number'
    );
  }

  // Perform operation
  const data = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) {
    data[i] = v.data[i] * scalar;
  }

  return { length: v.length, data };
}

/**
 * Negate all elements of a vector
 *
 * @param v - Vector to negate
 * @returns New vector with all elements negated
 * @throws {WebSpiceError} If vector is null
 */
export function negateVector(v: Vector): Vector {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Perform operation
  const data = new Float64Array(v.length);
  for (let i = 0; i < v.length; i++) {
    // Handle -0 case: convert both +0 and -0 to +0 for consistency
    data[i] = v.data[i] === 0 ? 0 : -v.data[i];
  }

  return { length: v.length, data };
}

/**
 * Compute dot product of two vectors
 *
 * @param v1 - First vector
 * @param v2 - Second vector
 * @returns Scalar dot product (sum of element-wise products)
 * @throws {WebSpiceError} If vector dimensions don't match
 *
 * @example
 * const v1 = { length: 3, data: Float64Array.from([1, 2, 3]) };
 * const v2 = { length: 3, data: Float64Array.from([4, 5, 6]) };
 * const result = dotProduct(v1, v2);
 * // result = 1*4 + 2*5 + 3*6 = 32
 */
export function dotProduct(v1: Vector, v2: Vector): number {
  // Validate inputs exist
  if (!v1 || !v2) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vectors cannot be null or undefined'
    );
  }

  // Validate dimensions
  if (v1.length !== v2.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector dimensions must match: ${v1.length} vs ${v2.length}`
    );
  }

  // Perform operation
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    sum += v1.data[i] * v2.data[i];
  }

  return sum;
}

/**
 * Compute Hadamard product (element-wise multiplication) of two vectors
 *
 * @param v1 - First vector
 * @param v2 - Second vector
 * @returns New vector with element-wise product
 * @throws {WebSpiceError} If vector dimensions don't match
 *
 * @example
 * const v1 = { length: 3, data: Float64Array.from([1, 2, 3]) };
 * const v2 = { length: 3, data: Float64Array.from([4, 5, 6]) };
 * const result = hadamardProduct(v1, v2);
 * // result.data = [4, 10, 18]
 */
export function hadamardProduct(v1: Vector, v2: Vector): Vector {
  // Validate inputs exist
  if (!v1 || !v2) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vectors cannot be null or undefined'
    );
  }

  // Validate dimensions
  if (v1.length !== v2.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector dimensions must match: ${v1.length} vs ${v2.length}`
    );
  }

  // Perform operation
  const data = new Float64Array(v1.length);
  for (let i = 0; i < v1.length; i++) {
    data[i] = v1.data[i] * v2.data[i];
  }

  return { length: v1.length, data };
}

/**
 * Compute L1 norm (Manhattan norm) of a vector
 *
 * @param v - Vector
 * @returns L1 norm (sum of absolute values)
 * @throws {WebSpiceError} If vector is null
 *
 * @example
 * const v = { length: 3, data: Float64Array.from([1, -2, 3]) };
 * const result = normL1(v);
 * // result = |1| + |-2| + |3| = 6
 */
export function normL1(v: Vector): number {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Perform operation
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += Math.abs(v.data[i]);
  }

  return sum;
}

/**
 * Compute L2 norm (Euclidean norm) of a vector
 * Uses scaling to prevent overflow for large values
 *
 * @param v - Vector
 * @returns L2 norm (square root of sum of squares)
 * @throws {WebSpiceError} If vector is null
 *
 * @example
 * const v = { length: 2, data: Float64Array.from([3, 4]) };
 * const result = normL2(v);
 * // result = sqrt(3^2 + 4^2) = sqrt(25) = 5
 */
export function normL2(v: Vector): number {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Find maximum absolute value for scaling
  let maxAbs = 0;
  for (let i = 0; i < v.length; i++) {
    const abs = Math.abs(v.data[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  // Handle zero vector
  if (maxAbs === 0) {
    return 0;
  }

  // Scale down to prevent overflow, then scale back up
  let sumSquares = 0;
  for (let i = 0; i < v.length; i++) {
    const scaled = v.data[i] / maxAbs;
    sumSquares += scaled * scaled;
  }

  return maxAbs * Math.sqrt(sumSquares);
}

/**
 * Compute L-infinity norm (maximum norm) of a vector
 *
 * @param v - Vector
 * @returns L-infinity norm (maximum absolute value)
 * @throws {WebSpiceError} If vector is null
 *
 * @example
 * const v = { length: 4, data: Float64Array.from([1, -5, 3, -2]) };
 * const result = normInfinity(v);
 * // result = max(|1|, |-5|, |3|, |-2|) = 5
 */
export function normInfinity(v: Vector): number {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Perform operation
  let maxAbs = 0;
  for (let i = 0; i < v.length; i++) {
    const abs = Math.abs(v.data[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  return maxAbs;
}

/**
 * Normalize a vector to unit length using L2 norm
 *
 * @param v - Vector to normalize
 * @returns New vector with unit length
 * @throws {WebSpiceError} If vector is null or zero vector
 *
 * @example
 * const v = { length: 2, data: Float64Array.from([3, 4]) };
 * const result = normalize(v);
 * // result.data = [3/5, 4/5] = [0.6, 0.8]
 */
export function normalize(v: Vector): Vector {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Compute norm
  const norm = normL2(v);

  // Check for zero vector
  if (norm === 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Cannot normalize zero vector'
    );
  }

  // Scale by inverse of norm
  return scaleVector(v, 1 / norm);
}

/**
 * Compute Euclidean distance between two vectors
 *
 * @param v1 - First vector
 * @param v2 - Second vector
 * @returns Euclidean distance between vectors
 * @throws {WebSpiceError} If vector dimensions don't match
 *
 * @example
 * const v1 = { length: 2, data: Float64Array.from([0, 0]) };
 * const v2 = { length: 2, data: Float64Array.from([3, 4]) };
 * const result = distance(v1, v2);
 * // result = sqrt((3-0)^2 + (4-0)^2) = 5
 */
export function distance(v1: Vector, v2: Vector): number {
  const diff = subtractVectors(v1, v2);
  return normL2(diff);
}

/**
 * Check if a vector is a zero vector (all elements are zero)
 *
 * @param v - Vector to check
 * @param tolerance - Optional tolerance for comparison (default: 0)
 * @returns True if all elements are zero within tolerance
 * @throws {WebSpiceError} If vector is null
 */
export function isZeroVector(v: Vector, tolerance = 0): boolean {
  validateTolerance(tolerance);

  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  // Check all elements
  for (let i = 0; i < v.length; i++) {
    if (Math.abs(v.data[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two vectors are equal (element-wise)
 *
 * @param v1 - First vector
 * @param v2 - Second vector
 * @param tolerance - Optional tolerance for comparison (default: 0)
 * @returns True if vectors are equal within tolerance
 * @throws {WebSpiceError} If vectors are null
 */
export function areVectorsEqual(
  v1: Vector,
  v2: Vector,
  tolerance = 0
): boolean {
  validateTolerance(tolerance);

  // Validate inputs
  if (!v1 || !v2) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vectors cannot be null or undefined'
    );
  }

  // Check dimensions
  if (v1.length !== v2.length) {
    return false;
  }

  // Check elements
  for (let i = 0; i < v1.length; i++) {
    if (Math.abs(v1.data[i] - v2.data[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Find maximum element and its index in a vector
 *
 * @param v - Vector
 * @returns Object with maximum value and its index
 * @throws {WebSpiceError} If vector is null or empty
 *
 * @example
 * const v = { length: 4, data: Float64Array.from([1, 5, 3, 2]) };
 * const result = maxElement(v);
 * // result = { value: 5, index: 1 }
 */
export function maxElement(v: Vector): { value: number; index: number } {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  if (v.length === 0) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Vector cannot be empty');
  }

  // Find maximum
  let maxValue = v.data[0];
  let maxIndex = 0;

  for (let i = 1; i < v.length; i++) {
    if (v.data[i] > maxValue) {
      maxValue = v.data[i];
      maxIndex = i;
    }
  }

  return { value: maxValue, index: maxIndex };
}

/**
 * Find minimum element and its index in a vector
 *
 * @param v - Vector
 * @returns Object with minimum value and its index
 * @throws {WebSpiceError} If vector is null or empty
 *
 * @example
 * const v = { length: 4, data: Float64Array.from([5, 1, 3, 2]) };
 * const result = minElement(v);
 * // result = { value: 1, index: 1 }
 */
export function minElement(v: Vector): { value: number; index: number } {
  // Validate input
  if (!v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector cannot be null or undefined'
    );
  }

  if (v.length === 0) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Vector cannot be empty');
  }

  // Find minimum
  let minValue = v.data[0];
  let minIndex = 0;

  for (let i = 1; i < v.length; i++) {
    if (v.data[i] < minValue) {
      minValue = v.data[i];
      minIndex = i;
    }
  }

  return { value: minValue, index: minIndex };
}

// ============================================================================
// Matrix Operations
// ============================================================================

/**
 * Add two matrices element-wise
 *
 * @param A - First matrix
 * @param B - Second matrix
 * @returns New matrix with element-wise sum
 * @throws {WebSpiceError} If matrix dimensions don't match
 */
export function addMatrices(A: Matrix, B: Matrix): Matrix {
  if (!A || !B) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrices cannot be null or undefined'
    );
  }

  if (A.rows !== B.rows || A.cols !== B.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix dimensions must match: ${A.rows}x${A.cols} vs ${B.rows}x${B.cols}`
    );
  }

  const data = new Float64Array(A.rows * A.cols);
  for (let i = 0; i < data.length; i++) {
    data[i] = A.data[i] + B.data[i];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Subtract two matrices element-wise (A - B)
 *
 * @param A - First matrix
 * @param B - Second matrix (subtracted from A)
 * @returns New matrix with element-wise difference
 * @throws {WebSpiceError} If matrix dimensions don't match
 */
export function subtractMatrices(A: Matrix, B: Matrix): Matrix {
  if (!A || !B) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrices cannot be null or undefined'
    );
  }

  if (A.rows !== B.rows || A.cols !== B.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix dimensions must match: ${A.rows}x${A.cols} vs ${B.rows}x${B.cols}`
    );
  }

  const data = new Float64Array(A.rows * A.cols);
  for (let i = 0; i < data.length; i++) {
    data[i] = A.data[i] - B.data[i];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Scale a matrix by a scalar value
 *
 * @param A - Matrix to scale
 * @param scalar - Scalar multiplier
 * @returns New matrix with all elements multiplied by scalar
 */
export function scaleMatrix(A: Matrix, scalar: number): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (!Number.isFinite(scalar)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Scalar must be a finite number'
    );
  }

  const data = new Float64Array(A.rows * A.cols);
  for (let i = 0; i < data.length; i++) {
    data[i] = A.data[i] * scalar;
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Negate all elements of a matrix
 *
 * @param A - Matrix to negate
 * @returns New matrix with all elements negated
 */
export function negateMatrix(A: Matrix): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  const data = new Float64Array(A.rows * A.cols);
  for (let i = 0; i < data.length; i++) {
    data[i] = A.data[i] === 0 ? 0 : -A.data[i];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Multiply two matrices (A × B)
 *
 * @param A - Left matrix (m × n)
 * @param B - Right matrix (n × p)
 * @returns Result matrix (m × p)
 * @throws {WebSpiceError} If matrix dimensions are incompatible
 */
export function multiplyMatrices(A: Matrix, B: Matrix): Matrix {
  if (!A || !B) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrices cannot be null or undefined'
    );
  }

  if (A.cols !== B.rows) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix dimensions incompatible for multiplication: ${A.rows}x${A.cols} × ${B.rows}x${B.cols}`
    );
  }

  const data = new Float64Array(A.rows * B.cols);

  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < B.cols; j++) {
      let sum = 0;
      for (let k = 0; k < A.cols; k++) {
        sum += A.data[i * A.cols + k] * B.data[k * B.cols + j];
      }
      data[i * B.cols + j] = sum;
    }
  }

  return { rows: A.rows, cols: B.cols, data };
}

/**
 * Multiply matrix by vector (A × v)
 *
 * @param A - Matrix (m × n)
 * @param v - Column vector (length n)
 * @returns Result vector (length m)
 * @throws {WebSpiceError} If dimensions are incompatible
 */
export function multiplyMatrixVector(A: Matrix, v: Vector): Vector {
  if (!A || !v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix and vector cannot be null or undefined'
    );
  }

  if (A.cols !== v.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix columns must match vector length: ${A.cols} vs ${v.length}`
    );
  }

  const data = new Float64Array(A.rows);

  for (let i = 0; i < A.rows; i++) {
    let sum = 0;
    for (let j = 0; j < A.cols; j++) {
      sum += A.data[i * A.cols + j] * v.data[j];
    }
    data[i] = sum;
  }

  return { length: A.rows, data };
}

/**
 * Multiply vector by matrix (v × A) - row vector multiplication
 *
 * @param v - Row vector (length m)
 * @param A - Matrix (m × n)
 * @returns Result vector (length n)
 * @throws {WebSpiceError} If dimensions are incompatible
 */
export function multiplyVectorMatrix(v: Vector, A: Matrix): Vector {
  if (!v || !A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Vector and matrix cannot be null or undefined'
    );
  }

  if (v.length !== A.rows) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector length must match matrix rows: ${v.length} vs ${A.rows}`
    );
  }

  const data = new Float64Array(A.cols);

  for (let j = 0; j < A.cols; j++) {
    let sum = 0;
    for (let i = 0; i < A.rows; i++) {
      sum += v.data[i] * A.data[i * A.cols + j];
    }
    data[j] = sum;
  }

  return { length: A.cols, data };
}

// ============================================================================
// Structural Operations
// ============================================================================

/**
 * Transpose a matrix
 *
 * @param A - Matrix to transpose
 * @returns Transposed matrix
 */
export function transpose(A: Matrix): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  const data = new Float64Array(A.rows * A.cols);

  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < A.cols; j++) {
      data[j * A.rows + i] = A.data[i * A.cols + j];
    }
  }

  return { rows: A.cols, cols: A.rows, data };
}

/**
 * Extract a row from matrix as a vector
 *
 * @param A - Matrix
 * @param rowIndex - Row index (0-based)
 * @returns Row as a vector
 * @throws {WebSpiceError} If row index is out of bounds
 */
export function getRow(A: Matrix, rowIndex: number): Vector {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (rowIndex < 0 || rowIndex >= A.rows) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Row index out of bounds: ${rowIndex} (matrix has ${A.rows} rows)`
    );
  }

  const data = new Float64Array(A.cols);
  for (let j = 0; j < A.cols; j++) {
    data[j] = A.data[rowIndex * A.cols + j];
  }

  return { length: A.cols, data };
}

/**
 * Extract a column from matrix as a vector
 *
 * @param A - Matrix
 * @param colIndex - Column index (0-based)
 * @returns Column as a vector
 * @throws {WebSpiceError} If column index is out of bounds
 */
export function getColumn(A: Matrix, colIndex: number): Vector {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (colIndex < 0 || colIndex >= A.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Column index out of bounds: ${colIndex} (matrix has ${A.cols} columns)`
    );
  }

  const data = new Float64Array(A.rows);
  for (let i = 0; i < A.rows; i++) {
    data[i] = A.data[i * A.cols + colIndex];
  }

  return { length: A.rows, data };
}

/**
 * Set a row in matrix (returns new matrix)
 *
 * @param A - Matrix
 * @param rowIndex - Row index (0-based)
 * @param values - New row values
 * @returns New matrix with updated row
 * @throws {WebSpiceError} If row length doesn't match
 */
export function setRow(A: Matrix, rowIndex: number, values: number[]): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (rowIndex < 0 || rowIndex >= A.rows) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Row index out of bounds: ${rowIndex}`
    );
  }

  if (values.length !== A.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Row length must match matrix columns: ${values.length} vs ${A.cols}`
    );
  }

  const data = new Float64Array(A.data);
  for (let j = 0; j < A.cols; j++) {
    data[rowIndex * A.cols + j] = values[j];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Set a column in matrix (returns new matrix)
 *
 * @param A - Matrix
 * @param colIndex - Column index (0-based)
 * @param values - New column values
 * @returns New matrix with updated column
 * @throws {WebSpiceError} If column length doesn't match
 */
export function setColumn(
  A: Matrix,
  colIndex: number,
  values: number[]
): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (colIndex < 0 || colIndex >= A.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Column index out of bounds: ${colIndex}`
    );
  }

  if (values.length !== A.rows) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Column length must match matrix rows: ${values.length} vs ${A.rows}`
    );
  }

  const data = new Float64Array(A.data);
  for (let i = 0; i < A.rows; i++) {
    data[i * A.cols + colIndex] = values[i];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Extract a submatrix
 *
 * @param A - Matrix
 * @param rowStart - Starting row index (inclusive)
 * @param rowEnd - Ending row index (exclusive)
 * @param colStart - Starting column index (inclusive)
 * @param colEnd - Ending column index (exclusive)
 * @returns Submatrix
 * @throws {WebSpiceError} If indices are invalid
 */
export function submatrix(
  A: Matrix,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number
): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (
    rowStart < 0 ||
    rowEnd > A.rows ||
    colStart < 0 ||
    colEnd > A.cols ||
    rowStart >= rowEnd ||
    colStart >= colEnd
  ) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Invalid submatrix indices');
  }

  const newRows = rowEnd - rowStart;
  const newCols = colEnd - colStart;
  const data = new Float64Array(newRows * newCols);

  for (let i = 0; i < newRows; i++) {
    for (let j = 0; j < newCols; j++) {
      data[i * newCols + j] = A.data[(rowStart + i) * A.cols + (colStart + j)];
    }
  }

  return { rows: newRows, cols: newCols, data };
}

// ============================================================================
// Properties and Analysis
// ============================================================================

/**
 * Compute trace of a square matrix (sum of diagonal elements)
 *
 * @param A - Square matrix
 * @returns Trace value
 * @throws {WebSpiceError} If matrix is not square
 */
export function trace(A: Matrix): number {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Matrix must be square');
  }

  let sum = 0;
  for (let i = 0; i < A.rows; i++) {
    sum += A.data[i * A.cols + i];
  }

  return sum;
}

/**
 * Compute Frobenius norm of a matrix
 * Uses scaling to prevent overflow
 *
 * @param A - Matrix
 * @returns Frobenius norm
 */
export function frobeniusNorm(A: Matrix): number {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  // Find maximum absolute value for scaling
  let maxAbs = 0;
  for (let i = 0; i < A.data.length; i++) {
    const abs = Math.abs(A.data[i]);
    if (abs > maxAbs) {
      maxAbs = abs;
    }
  }

  if (maxAbs === 0) {
    return 0;
  }

  // Scale down to prevent overflow, then scale back up
  let sumSquares = 0;
  for (let i = 0; i < A.data.length; i++) {
    const scaled = A.data[i] / maxAbs;
    sumSquares += scaled * scaled;
  }

  return maxAbs * Math.sqrt(sumSquares);
}

/**
 * Check if a matrix is symmetric
 *
 * @param A - Matrix
 * @param tolerance - Tolerance for comparison (default: 0)
 * @returns True if matrix is symmetric
 */
export function isSymmetric(A: Matrix, tolerance = 0): boolean {
  validateTolerance(tolerance);

  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    return false;
  }

  for (let i = 0; i < A.rows; i++) {
    for (let j = i + 1; j < A.cols; j++) {
      if (
        Math.abs(A.data[i * A.cols + j] - A.data[j * A.cols + i]) > tolerance
      ) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a matrix is diagonal
 *
 * @param A - Matrix
 * @param tolerance - Tolerance for comparison (default: 0)
 * @returns True if matrix is diagonal
 */
export function isDiagonal(A: Matrix, tolerance = 0): boolean {
  validateTolerance(tolerance);

  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    return false;
  }

  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < A.cols; j++) {
      if (i !== j && Math.abs(A.data[i * A.cols + j]) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a matrix is an identity matrix
 *
 * @param A - Matrix
 * @param tolerance - Tolerance for comparison (default: 0)
 * @returns True if matrix is identity
 */
export function isIdentity(A: Matrix, tolerance = 0): boolean {
  validateTolerance(tolerance);

  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    return false;
  }

  for (let i = 0; i < A.rows; i++) {
    for (let j = 0; j < A.cols; j++) {
      const expected = i === j ? 1 : 0;
      if (Math.abs(A.data[i * A.cols + j] - expected) > tolerance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a matrix is a zero matrix
 *
 * @param A - Matrix
 * @param tolerance - Tolerance for comparison (default: 0)
 * @returns True if all elements are zero
 */
export function isZeroMatrix(A: Matrix, tolerance = 0): boolean {
  validateTolerance(tolerance);

  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  for (let i = 0; i < A.data.length; i++) {
    if (Math.abs(A.data[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Check if two matrices are equal
 *
 * @param A - First matrix
 * @param B - Second matrix
 * @param tolerance - Tolerance for comparison (default: 0)
 * @returns True if matrices are equal
 */
export function areMatricesEqual(A: Matrix, B: Matrix, tolerance = 0): boolean {
  validateTolerance(tolerance);

  if (!A || !B) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrices cannot be null or undefined'
    );
  }

  if (A.rows !== B.rows || A.cols !== B.cols) {
    return false;
  }

  for (let i = 0; i < A.data.length; i++) {
    if (Math.abs(A.data[i] - B.data[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

/**
 * Compute condition number of a square matrix using power iteration
 * This is a simplified estimate using the ratio of largest to smallest singular values
 *
 * @param A - Square matrix
 * @returns Condition number estimate
 * @throws {WebSpiceError} If matrix is not square
 */
export function conditionNumber(A: Matrix): number {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Matrix must be square');
  }

  // For identity matrix, condition number is 1
  if (isIdentity(A, 1e-10)) {
    return 1;
  }

  // Use power iteration to estimate largest singular value
  const maxIterations = 100;
  const tolerance = 1e-10;
  const n = A.rows;

  // A^T * A for symmetric positive semi-definite
  const ATA = multiplyMatrices(transpose(A), A);

  // Power iteration for largest eigenvalue
  let v: Vector = { length: n, data: new Float64Array(n).fill(1) };
  v = scaleVector(v, 1 / normL2(v));

  let lambdaMax = 0;
  for (let iter = 0; iter < maxIterations; iter++) {
    const Av = multiplyMatrixVector(ATA, v);
    const lambdaNew = normL2(Av);

    if (lambdaNew === 0) {
      return Infinity;
    }

    v = scaleVector(Av, 1 / lambdaNew);

    if (Math.abs(lambdaNew - lambdaMax) < tolerance) {
      lambdaMax = lambdaNew;
      break;
    }
    lambdaMax = lambdaNew;
  }

  // Estimate smallest singular value using inverse power iteration
  // For simplicity, use Frobenius norm based estimate
  const fNorm = frobeniusNorm(A);
  const sigmaMax = Math.sqrt(lambdaMax);
  const sigmaMin = fNorm / (sigmaMax * Math.sqrt(n));

  // Condition number is always >= 1 for invertible matrices
  const estimate = sigmaMin > 0 ? sigmaMax / sigmaMin : Infinity;
  return Math.max(estimate, 1);
}

// ============================================================================
// Numerical Stability
// ============================================================================

/**
 * Check if matrix or vector contains NaN or Infinity
 *
 * @param A - Matrix or Vector
 * @returns True if contains NaN or Infinity
 */
export function hasNaNOrInfinity(A: Matrix | Vector): boolean {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Input cannot be null or undefined'
    );
  }

  for (let i = 0; i < A.data.length; i++) {
    if (!Number.isFinite(A.data[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Clamp matrix values to a range
 *
 * @param A - Matrix
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns New matrix with clamped values
 */
export function clampMatrix(A: Matrix, min: number, max: number): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Clamp min and max must be finite numbers'
    );
  }

  if (min > max) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Clamp min must be less than or equal to max'
    );
  }

  const data = new Float64Array(A.data.length);
  for (let i = 0; i < A.data.length; i++) {
    data[i] = Math.max(min, Math.min(max, A.data[i]));
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Replace NaN values in matrix
 *
 * @param A - Matrix
 * @param replacement - Value to replace NaN with
 * @returns New matrix with NaN replaced
 */
export function replaceNaN(A: Matrix, replacement: number): Matrix {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (!Number.isFinite(replacement)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Replacement value must be a finite number'
    );
  }

  const data = new Float64Array(A.data.length);
  for (let i = 0; i < A.data.length; i++) {
    data[i] = Number.isNaN(A.data[i]) ? replacement : A.data[i];
  }

  return { rows: A.rows, cols: A.cols, data };
}

/**
 * Estimate condition number using a diagonal-based heuristic
 * Faster but less accurate than power iteration based conditionNumber().
 *
 * Note: This heuristic relies on diagonal elements. For matrices with zero
 * diagonal entries (e.g., permutation matrices), it falls back to the
 * power iteration based conditionNumber() for a more accurate estimate.
 *
 * @param A - Square matrix
 * @returns Condition number estimate (always >= 1)
 * @throws {WebSpiceError} If matrix is not square
 */
export function estimateConditionNumber(A: Matrix): number {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Matrix must be square');
  }

  // Use infinity norm based estimate: ||A||_inf * ||A^-1||_inf
  // For simplicity, estimate using ||A||_inf / min diagonal
  let maxRowSum = 0;
  let minDiag = Infinity;

  for (let i = 0; i < A.rows; i++) {
    let rowSum = 0;
    for (let j = 0; j < A.cols; j++) {
      rowSum += Math.abs(A.data[i * A.cols + j]);
    }
    maxRowSum = Math.max(maxRowSum, rowSum);

    const diag = Math.abs(A.data[i * A.cols + i]);
    if (diag > 0) {
      minDiag = Math.min(minDiag, diag);
    }
  }

  // Fallback to power iteration when diagonal heuristic is not applicable
  if (minDiag === Infinity || minDiag === 0) {
    return conditionNumber(A);
  }

  return Math.max(maxRowSum / minDiag, 1);
}

/**
 * Compute rank of a matrix using Gaussian elimination with partial pivoting
 *
 * @param A - Matrix
 * @param tolerance - Tolerance for considering a value as zero (default: 1e-10)
 * @returns Matrix rank
 */
export function rank(A: Matrix, tolerance = 1e-10): number {
  validateTolerance(tolerance);

  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  // Create a copy for elimination
  const m = A.rows;
  const n = A.cols;
  const data = new Float64Array(A.data);

  let rankValue = 0;
  let pivotCol = 0;

  for (let row = 0; row < m && pivotCol < n; row++) {
    // Find pivot
    let maxVal = Math.abs(data[row * n + pivotCol]);
    let maxRow = row;

    for (let i = row + 1; i < m; i++) {
      const val = Math.abs(data[i * n + pivotCol]);
      if (val > maxVal) {
        maxVal = val;
        maxRow = i;
      }
    }

    if (maxVal < tolerance) {
      // No pivot found in this column, try next column
      pivotCol++;
      row--;
      continue;
    }

    // Swap rows
    if (maxRow !== row) {
      for (let j = 0; j < n; j++) {
        const temp = data[row * n + j];
        data[row * n + j] = data[maxRow * n + j];
        data[maxRow * n + j] = temp;
      }
    }

    // Eliminate column
    const pivot = data[row * n + pivotCol];
    for (let i = row + 1; i < m; i++) {
      const factor = data[i * n + pivotCol] / pivot;
      for (let j = pivotCol; j < n; j++) {
        data[i * n + j] -= factor * data[row * n + j];
      }
    }

    rankValue++;
    pivotCol++;
  }

  return rankValue;
}

// ============================================================================
// Sparse Matrix Operations
// ============================================================================

/**
 * Convert COO (Coordinate) format to CSR (Compressed Sparse Row) format
 *
 * CSR format is more efficient for matrix-vector multiplication and row access.
 *
 * @param coo - Sparse matrix in COO format
 * @returns Sparse matrix in CSR format
 */
export function cooToCSR(coo: SparseMatrix): CSRMatrix {
  if (!coo) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  if (!isValidCOO(coo)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  const numNonZeros = coo.entries.length;

  // Sort entries by row, then by column
  const sortedEntries = [...coo.entries].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });

  // Build CSR arrays
  const values = new Float64Array(numNonZeros);
  const columnIndices = new Int32Array(numNonZeros);
  const rowPointers = new Int32Array(coo.rows + 1);

  // Fill values and column indices
  for (let i = 0; i < numNonZeros; i++) {
    values[i] = sortedEntries[i].value;
    columnIndices[i] = sortedEntries[i].col;
  }

  // Build row pointers
  let currentRow = 0;
  for (let i = 0; i < numNonZeros; i++) {
    while (currentRow <= sortedEntries[i].row) {
      rowPointers[currentRow] = i;
      currentRow++;
    }
  }
  // Fill remaining row pointers
  while (currentRow <= coo.rows) {
    rowPointers[currentRow] = numNonZeros;
    currentRow++;
  }

  return {
    rows: coo.rows,
    cols: coo.cols,
    values,
    columnIndices,
    rowPointers,
  };
}

/**
 * Convert dense matrix to sparse matrix (COO format)
 *
 * @param matrix - Dense matrix
 * @param tolerance - Values with absolute value below this threshold are treated as zero (default: 0)
 * @returns Sparse matrix in COO format
 */
export function denseToSparse(matrix: Matrix, tolerance = 0): SparseMatrix {
  validateTolerance(tolerance);

  if (!matrix) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  const entries: SparseEntry[] = [];

  for (let i = 0; i < matrix.rows; i++) {
    for (let j = 0; j < matrix.cols; j++) {
      const value = matrix.data[i * matrix.cols + j];
      if (Math.abs(value) > tolerance) {
        entries.push({ row: i, col: j, value });
      }
    }
  }

  return { rows: matrix.rows, cols: matrix.cols, entries };
}

/**
 * Convert sparse matrix (COO format) to dense matrix
 *
 * @param sparse - Sparse matrix in COO format
 * @returns Dense matrix
 */
export function sparseToDense(sparse: SparseMatrix): Matrix {
  if (!sparse) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  if (!isValidCOO(sparse)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  const data = new Float64Array(sparse.rows * sparse.cols);

  for (const entry of sparse.entries) {
    data[entry.row * sparse.cols + entry.col] = entry.value;
  }

  return { rows: sparse.rows, cols: sparse.cols, data };
}

/**
 * Multiply sparse matrix (COO format) by vector
 *
 * @param sparse - Sparse matrix (m × n)
 * @param v - Vector (length n)
 * @returns Result vector (length m)
 */
export function sparseMatrixVectorMultiply(
  sparse: SparseMatrix,
  v: Vector
): Vector {
  if (!sparse || !v) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix and vector cannot be null or undefined'
    );
  }

  if (!isValidCOO(sparse)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  if (sparse.cols !== v.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix columns must match vector length: ${sparse.cols} vs ${v.length}`
    );
  }

  const data = new Float64Array(sparse.rows);

  for (const entry of sparse.entries) {
    data[entry.row] += entry.value * v.data[entry.col];
  }

  return { length: sparse.rows, data };
}

/**
 * Transpose sparse matrix (COO format)
 *
 * @param sparse - Sparse matrix
 * @returns Transposed sparse matrix
 */
export function sparseTranspose(sparse: SparseMatrix): SparseMatrix {
  if (!sparse) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  if (!isValidCOO(sparse)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  const entries = sparse.entries.map(e => ({
    row: e.col,
    col: e.row,
    value: e.value,
  }));

  return { rows: sparse.cols, cols: sparse.rows, entries };
}

/**
 * Extract a row from sparse matrix as a dense vector
 *
 * @param sparse - Sparse matrix in COO format
 * @param rowIndex - Row index (0-based)
 * @returns Row as a dense vector
 * @throws {WebSpiceError} If row index is out of bounds
 */
export function getSparseRow(sparse: SparseMatrix, rowIndex: number): Vector {
  if (!sparse) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  if (!isValidCOO(sparse)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  if (rowIndex < 0 || rowIndex >= sparse.rows) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Row index out of bounds');
  }

  const data = new Float64Array(sparse.cols);

  for (const entry of sparse.entries) {
    if (entry.row === rowIndex) {
      data[entry.col] = entry.value;
    }
  }

  return { length: sparse.cols, data };
}

/**
 * Count non-zero entries in sparse matrix (COO format)
 *
 * @param sparse - Sparse matrix in COO format
 * @returns Number of non-zero entries
 */
export function countNonZeros(sparse: SparseMatrix): number {
  if (!sparse) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  return sparse.entries.length;
}

/**
 * Validate COO format sparse matrix
 *
 * Checks:
 * - All entries have valid row/column indices (within bounds)
 * - No duplicate entries (same row,col pair)
 * - No negative indices
 *
 * @param sparse - Sparse matrix in COO format
 * @returns True if valid COO format
 */
export function isValidCOO(sparse: SparseMatrix): boolean {
  if (!sparse) {
    return false;
  }

  if (sparse.rows <= 0 || sparse.cols <= 0) {
    return false;
  }

  const seen = new Set<string>();

  for (const entry of sparse.entries) {
    // Check bounds
    if (
      entry.row < 0 ||
      entry.row >= sparse.rows ||
      entry.col < 0 ||
      entry.col >= sparse.cols
    ) {
      return false;
    }

    // Check for duplicates
    const key = `${entry.row},${entry.col}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }

  return true;
}

/**
 * Validate CSR format sparse matrix
 *
 * Checks:
 * - rowPointers has length rows + 1
 * - values and columnIndices have same length
 * - columnIndices are within bounds
 * - rowPointers are monotonically non-decreasing
 *
 * @param csr - Sparse matrix in CSR format
 * @returns True if valid CSR format
 */
export function isValidCSR(csr: CSRMatrix): boolean {
  if (!csr) {
    return false;
  }

  if (csr.rows <= 0 || csr.cols <= 0) {
    return false;
  }

  // Check rowPointers length
  if (csr.rowPointers.length !== csr.rows + 1) {
    return false;
  }

  // Check values and columnIndices have same length
  if (csr.values.length !== csr.columnIndices.length) {
    return false;
  }

  // Check rowPointers structural constraints
  if (csr.rowPointers[0] !== 0) {
    return false;
  }
  if (csr.rowPointers[csr.rows] !== csr.values.length) {
    return false;
  }

  // Check rowPointers are monotonically non-decreasing and within bounds
  for (let i = 1; i < csr.rowPointers.length; i++) {
    if (
      csr.rowPointers[i] < csr.rowPointers[i - 1] ||
      csr.rowPointers[i] > csr.values.length
    ) {
      return false;
    }
  }

  // Check columnIndices are within bounds
  for (let i = 0; i < csr.columnIndices.length; i++) {
    if (csr.columnIndices[i] < 0 || csr.columnIndices[i] >= csr.cols) {
      return false;
    }
  }

  return true;
}

/**
 * Estimate sparsity ratio of a sparse matrix
 *
 * Sparsity = 1 - (non-zeros / total elements)
 * A fully sparse (all zeros) matrix has sparsity 1.0
 * A fully dense (no zeros) matrix has sparsity 0.0
 *
 * @param sparse - Sparse matrix in COO format
 * @returns Sparsity ratio (0 to 1)
 */
export function estimateSparsity(sparse: SparseMatrix): number {
  if (!sparse) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Sparse matrix cannot be null or undefined'
    );
  }

  if (!isValidCOO(sparse)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Invalid COO matrix: contains out-of-bounds indices or duplicate entries'
    );
  }

  const totalElements = sparse.rows * sparse.cols;
  const nonZeros = sparse.entries.length;
  const density = nonZeros / totalElements;

  return 1 - density;
}
