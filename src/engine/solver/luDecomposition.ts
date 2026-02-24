/**
 * LU Decomposition for WebSpice Numerical Engine
 *
 * Implements LU decomposition with partial pivoting for solving linear systems
 * Ax = b. Designed for Modified Nodal Analysis (MNA) matrices in SPICE
 * circuit simulation.
 *
 * @module engine/solver/luDecomposition
 */

import type { LUResult, Matrix, Vector } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type { SolverOptions } from '@/types/simulation';
import { DEFAULT_SOLVER_OPTIONS } from '@/types/simulation';
import { hasNaNOrInfinity } from '@/engine/solver/matrix';

// ============================================================================
// Core Decomposition
// ============================================================================

/**
 * Perform LU decomposition with partial pivoting
 *
 * Decomposes matrix A into PA = LU where:
 * - P is a permutation matrix (stored as permutation vector)
 * - L is unit lower triangular (diagonal = 1)
 * - U is upper triangular
 *
 * L and U are stored compactly in a single matrix:
 * upper triangle (including diagonal) stores U,
 * strict lower triangle stores L (unit diagonal is implicit).
 *
 * @param A - Square matrix to decompose
 * @param options - Solver options (pivotTolerance for singularity detection)
 * @returns LU decomposition result (does not throw on singularity, sets singular flag)
 * @throws {WebSpiceError} If matrix is null, not square, or contains NaN/Infinity
 */
export function luDecompose(
  A: Matrix,
  options?: Partial<SolverOptions>
): LUResult {
  if (!A) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be null or undefined'
    );
  }

  if (A.rows !== A.cols) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix must be square: got ${A.rows}x${A.cols}`
    );
  }

  if (A.rows === 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix cannot be empty (0x0)'
    );
  }

  if (hasNaNOrInfinity(A)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix contains NaN or Infinity'
    );
  }

  const pivotTolerance =
    options?.pivotTolerance ?? DEFAULT_SOLVER_OPTIONS.pivotTolerance;
  const n = A.rows;

  // Create mutable copy of input data
  const data = new Float64Array(A.data);
  const permutation = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    permutation[i] = i;
  }

  let swapCount = 0;
  let singular = false;

  for (let k = 0; k < n; k++) {
    // Find pivot: row with maximum |A[i][k]| for i = k..n-1
    let maxVal = Math.abs(data[k * n + k]);
    let pivotRow = k;

    for (let i = k + 1; i < n; i++) {
      const val = Math.abs(data[i * n + k]);
      if (val > maxVal) {
        maxVal = val;
        pivotRow = i;
      }
    }

    // Check for singularity
    if (maxVal < pivotTolerance) {
      singular = true;
      continue;
    }

    // Swap rows if needed
    if (pivotRow !== k) {
      // Swap rows in data
      for (let j = 0; j < n; j++) {
        const temp = data[k * n + j];
        data[k * n + j] = data[pivotRow * n + j];
        data[pivotRow * n + j] = temp;
      }

      // Swap in permutation
      const tempPerm = permutation[k];
      permutation[k] = permutation[pivotRow];
      permutation[pivotRow] = tempPerm;

      swapCount++;
    }

    // Elimination
    const pivot = data[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const multiplier = data[i * n + k] / pivot;
      data[i * n + k] = multiplier; // Store L factor

      for (let j = k + 1; j < n; j++) {
        data[i * n + j] -= multiplier * data[k * n + j];
      }
    }
  }

  return {
    LU: { rows: n, cols: n, data },
    permutation,
    swapCount,
    size: n,
    singular,
  };
}

// ============================================================================
// Extract L and U
// ============================================================================

/**
 * Extract lower triangular matrix L from LU result
 *
 * L has unit diagonal (all 1s on diagonal) and the multipliers
 * from Gaussian elimination below the diagonal.
 *
 * @param lu - LU decomposition result
 * @returns Lower triangular matrix with unit diagonal
 */
export function extractL(lu: LUResult): Matrix {
  if (!lu) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result cannot be null or undefined'
    );
  }

  const n = lu.size;
  const data = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    data[i * n + i] = 1; // Unit diagonal

    for (let j = 0; j < i; j++) {
      data[i * n + j] = lu.LU.data[i * n + j];
    }
  }

  return { rows: n, cols: n, data };
}

/**
 * Extract upper triangular matrix U from LU result
 *
 * @param lu - LU decomposition result
 * @returns Upper triangular matrix
 */
export function extractU(lu: LUResult): Matrix {
  if (!lu) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result cannot be null or undefined'
    );
  }

  const n = lu.size;
  const data = new Float64Array(n * n);

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      data[i * n + j] = lu.LU.data[i * n + j];
    }
  }

  return { rows: n, cols: n, data };
}

// ============================================================================
// Solve
// ============================================================================

/**
 * Solve Ax = b using LU factorization
 *
 * Applies permutation, then forward substitution (Ly = Pb),
 * then backward substitution (Ux = y).
 *
 * @param lu - LU decomposition result from luDecompose
 * @param b - Right-hand side vector
 * @returns Solution vector x
 * @throws {WebSpiceError} If system is singular or dimensions mismatch
 */
export function luSolve(lu: LUResult, b: Vector): Vector {
  if (!lu || !b) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result and vector cannot be null or undefined'
    );
  }

  if (lu.singular) {
    throw new WebSpiceError(
      'SINGULAR_MATRIX',
      'Matrix is singular or near-singular, linear system has no unique solution'
    );
  }

  if (b.length !== lu.size) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Vector length must match matrix size: ${b.length} vs ${lu.size}`
    );
  }

  const n = lu.size;
  const luData = lu.LU.data;

  // Apply permutation: Pb
  const pb = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    pb[i] = b.data[lu.permutation[i]];
  }

  // Forward substitution: Ly = Pb
  // L has unit diagonal (implicit), multipliers stored below diagonal
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let sum = pb[i];
    for (let j = 0; j < i; j++) {
      sum -= luData[i * n + j] * y[j];
    }
    y[i] = sum;
  }

  // Backward substitution: Ux = y
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i + 1; j < n; j++) {
      sum -= luData[i * n + j] * x[j];
    }
    x[i] = sum / luData[i * n + i];
  }

  return { length: n, data: x };
}

/**
 * Solve AX = B for multiple right-hand sides
 *
 * Each column of B is solved independently using the same LU factorization.
 * Useful for DC sweep analysis where topology stays the same.
 *
 * @param lu - LU decomposition result
 * @param B - Matrix where each column is a right-hand side vector
 * @returns Solution matrix X where each column is a solution vector
 * @throws {WebSpiceError} If system is singular or dimensions mismatch
 */
export function luSolveMultiple(lu: LUResult, B: Matrix): Matrix {
  if (!lu || !B) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result and matrix cannot be null or undefined'
    );
  }

  if (B.rows !== lu.size) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Matrix rows must match system size: ${B.rows} vs ${lu.size}`
    );
  }

  const n = lu.size;
  const numRHS = B.cols;
  const resultData = new Float64Array(n * numRHS);

  for (let col = 0; col < numRHS; col++) {
    // Extract column as vector
    const bData = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      bData[i] = B.data[i * numRHS + col];
    }
    const bVec: Vector = { length: n, data: bData };

    const solution = luSolve(lu, bVec);

    // Store solution column
    for (let i = 0; i < n; i++) {
      resultData[i * numRHS + col] = solution.data[i];
    }
  }

  return { rows: n, cols: numRHS, data: resultData };
}

// ============================================================================
// Derived Operations
// ============================================================================

/**
 * Compute determinant from LU factorization
 *
 * det(A) = (-1)^swapCount * product(U[i][i])
 *
 * @param lu - LU decomposition result
 * @returns Determinant value (0 if singular)
 */
export function determinant(lu: LUResult): number {
  if (!lu) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result cannot be null or undefined'
    );
  }

  if (lu.singular) {
    return 0;
  }

  const n = lu.size;
  let det = lu.swapCount % 2 === 0 ? 1 : -1;

  for (let i = 0; i < n; i++) {
    det *= lu.LU.data[i * n + i];
  }

  return det;
}

/**
 * Compute matrix inverse using LU factorization
 *
 * Solves A * A^(-1) = I by solving for each column of the identity matrix.
 * For solving Ax = b, prefer luSolve over computing the inverse.
 *
 * @param lu - LU decomposition result
 * @returns Inverse matrix
 * @throws {WebSpiceError} If matrix is singular
 */
export function luInverse(lu: LUResult): Matrix {
  if (!lu) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'LU result cannot be null or undefined'
    );
  }

  if (lu.singular) {
    throw new WebSpiceError(
      'SINGULAR_MATRIX',
      'Cannot compute inverse of singular matrix'
    );
  }

  const n = lu.size;
  const resultData = new Float64Array(n * n);

  for (let col = 0; col < n; col++) {
    // Create identity column vector
    const eData = new Float64Array(n);
    eData[col] = 1;
    const e: Vector = { length: n, data: eData };

    const solution = luSolve(lu, e);

    // Store solution as column of result
    for (let i = 0; i < n; i++) {
      resultData[i * n + col] = solution.data[i];
    }
  }

  return { rows: n, cols: n, data: resultData };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Solve linear system Ax = b in one call
 *
 * Combines luDecompose + luSolve. For solving multiple systems with the same
 * matrix A, use luDecompose once and luSolve multiple times instead.
 *
 * @param A - Coefficient matrix
 * @param b - Right-hand side vector
 * @param options - Solver options
 * @returns Solution vector x
 * @throws {WebSpiceError} If system is singular or parameters are invalid
 */
export function solveLinearSystem(
  A: Matrix,
  b: Vector,
  options?: Partial<SolverOptions>
): Vector {
  const lu = luDecompose(A, options);
  return luSolve(lu, b);
}
