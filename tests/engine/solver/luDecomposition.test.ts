import { describe, expect, it } from 'vitest';
import {
  determinant,
  extractL,
  extractU,
  luDecompose,
  luInverse,
  luSolve,
  luSolveMultiple,
  solveLinearSystem,
} from '@/engine/solver/luDecomposition';
import { multiplyMatrices, multiplyMatrixVector } from '@/engine/solver/matrix';
import type { LUResult, Matrix, Vector } from '@/types/circuit';
import {
  createDiagonalMatrix,
  createDiagonallyDominantMatrix,
  createHilbertMatrix,
  createIdentityMatrix,
  createSingularMatrix,
  createTestMatrix,
  createTestVector,
} from '../../factories/matrix';

// ============================================================================
// Helpers
// ============================================================================

/** Check that two arrays are approximately equal */
function expectArrayClose(
  actual: Float64Array,
  expected: number[],
  tolerance = 1e-10
) {
  expect(actual.length).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i], -Math.log10(tolerance));
  }
}

/** Compute residual norm ||Ax - b|| for solution verification */
function residualNorm(A: Matrix, x: Vector, b: Vector): number {
  const Ax = multiplyMatrixVector(A, x);
  let norm = 0;
  for (let i = 0; i < b.length; i++) {
    const diff = Ax.data[i] - b.data[i];
    norm += diff * diff;
  }
  return Math.sqrt(norm);
}

/** Apply permutation to matrix rows: P * A */
function applyPermutation(perm: Int32Array, A: Matrix): Matrix {
  const n = A.rows;
  const data = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      data[i * n + j] = A.data[perm[i] * n + j];
    }
  }
  return { rows: n, cols: n, data };
}

describe('LU Decomposition', () => {
  // ============================================================================
  // Input Validation
  // ============================================================================

  describe('Input Validation', () => {
    it('should throw for null matrix', () => {
      expect(() => luDecompose(null as unknown as Matrix)).toThrow(
        'Matrix cannot be null or undefined'
      );
    });

    it('should throw for non-square matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      expect(() => luDecompose(A)).toThrow('Matrix must be square');
    });

    it('should throw for empty matrix', () => {
      const A = createTestMatrix({ rows: 0, cols: 0 });
      expect(() => luDecompose(A)).toThrow('Matrix cannot be empty');
    });

    it('should throw for matrix with NaN', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, NaN, 3, 4] });
      expect(() => luDecompose(A)).toThrow('Matrix contains NaN or Infinity');
    });

    it('should throw for matrix with Infinity', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 2, Infinity, 4],
      });
      expect(() => luDecompose(A)).toThrow('Matrix contains NaN or Infinity');
    });
  });

  // ============================================================================
  // Basic LU Decomposition
  // ============================================================================

  describe('Basic LU Decomposition', () => {
    it('should decompose 1x1 matrix', () => {
      const A = createTestMatrix({ rows: 1, cols: 1, data: [5] });
      const lu = luDecompose(A);

      expect(lu.size).toBe(1);
      expect(lu.singular).toBe(false);
      expect(lu.LU.data[0]).toBe(5);
    });

    it('should decompose 2x2 matrix', () => {
      // A = [[2, 1], [4, 3]]
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);

      expect(lu.size).toBe(2);
      expect(lu.singular).toBe(false);

      // Verify PA = LU
      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });

    it('should decompose 3x3 matrix', () => {
      // A = [[2, 1, 1], [4, 3, 3], [8, 7, 9]]
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, 1, 4, 3, 3, 8, 7, 9],
      });
      const lu = luDecompose(A);

      expect(lu.size).toBe(3);
      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });

    it('should decompose 4x4 matrix', () => {
      const A = createTestMatrix({
        rows: 4,
        cols: 4,
        data: [2, 1, 0, 1, 4, 3, 1, 2, 6, 5, 4, 3, 2, 3, 2, 5],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });

    it('should decompose 5x5 matrix', () => {
      const A = createDiagonallyDominantMatrix(5);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data), 1e-8);
    });

    it('should decompose diagonal matrix', () => {
      const A = createDiagonalMatrix([3, 5, 7]);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      // Diagonal matrix: L = I, U = A (no pivoting needed)
      const U = extractU(lu);
      for (let i = 0; i < 3; i++) {
        expect(U.data[i * 3 + i]).toBeCloseTo(A.data[i * 3 + i]);
      }
    });

    it('should decompose identity matrix', () => {
      const A = createIdentityMatrix(3);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);
      expect(lu.swapCount).toBe(0);

      const L = extractL(lu);
      const U = extractU(lu);

      // L = I and U = I
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const expected = i === j ? 1 : 0;
          expect(L.data[i * 3 + j]).toBeCloseTo(expected);
          expect(U.data[i * 3 + j]).toBeCloseTo(expected);
        }
      }
    });

    it('should not modify the original matrix', () => {
      const data = [2, 1, 4, 3];
      const A = createTestMatrix({ rows: 2, cols: 2, data });
      const originalData = new Float64Array(A.data);

      luDecompose(A);

      expect(Array.from(A.data)).toEqual(Array.from(originalData));
    });
  });

  // ============================================================================
  // Partial Pivoting
  // ============================================================================

  describe('Partial Pivoting', () => {
    it('should swap rows when needed for numerical stability', () => {
      // A = [[0, 1], [1, 0]] — requires row swap
      const A = createTestMatrix({ rows: 2, cols: 2, data: [0, 1, 1, 0] });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);
      expect(lu.swapCount).toBe(1);
    });

    it('should handle small leading element', () => {
      // A = [[1e-15, 1], [1, 1]] — pivot should choose row 1
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1e-15, 1, 1, 1],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });

    it('should produce correct permutation vector', () => {
      // A = [[0, 1, 0], [0, 0, 1], [1, 0, 0]]
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [0, 1, 0, 0, 0, 1, 1, 0, 0],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      // Verify PA = LU still holds
      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });

    it('should select row with maximum absolute value as pivot', () => {
      // A = [[1, 2], [3, 4]] — row 1 has larger value in column 0
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const lu = luDecompose(A);

      // After pivoting, first row of U should come from row with value 3
      expect(lu.swapCount).toBe(1);
      expect(lu.permutation[0]).toBe(1); // Row 1 moved to position 0
    });

    it('should not swap when diagonal is already the maximum', () => {
      // A = [[4, 1], [2, 3]] — 4 > 2, no swap needed
      const A = createTestMatrix({ rows: 2, cols: 2, data: [4, 1, 2, 3] });
      const lu = luDecompose(A);

      expect(lu.swapCount).toBe(0);
      expect(lu.permutation[0]).toBe(0);
      expect(lu.permutation[1]).toBe(1);
    });

    it('should handle matrix requiring multiple swaps', () => {
      // A = [[1, 2, 3], [4, 5, 6], [7, 8, 10]]
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 10],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });
  });

  // ============================================================================
  // Singularity Detection
  // ============================================================================

  describe('Singularity Detection', () => {
    it('should detect singular matrix (zero row)', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 0, 0, 0, 4, 5, 6],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(true);
    });

    it('should detect singular matrix (linearly dependent rows)', () => {
      const A = createSingularMatrix(3);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(true);
    });

    it('should detect singular matrix (zero column)', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [0, 2, 3, 0, 5, 6, 0, 8, 9],
      });
      const lu = luDecompose(A);

      // After pivoting column 0 has all zeros, singular
      expect(lu.singular).toBe(true);
    });

    it('should detect zero matrix as singular', () => {
      const A = createTestMatrix({ rows: 2, cols: 2 });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(true);
    });

    it('should respect custom pivot tolerance', () => {
      // Matrix with very small but non-zero pivot
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1e-14, 1, 1, 1],
      });

      // Default tolerance (1e-13): 1e-14 < 1e-13, would be singular after elimination
      // But pivoting swaps to put 1 on diagonal
      const lu1 = luDecompose(A);
      expect(lu1.singular).toBe(false);

      // With very large tolerance: everything below 1 is "singular"
      const lu2 = luDecompose(A, { pivotTolerance: 2 });
      expect(lu2.singular).toBe(true);
    });

    it('should detect zero pivot when pivotTolerance is 0', () => {
      // Zero matrix — all pivots are exactly 0
      const A = createTestMatrix({ rows: 2, cols: 2 });
      const lu = luDecompose(A, { pivotTolerance: 0 });

      expect(lu.singular).toBe(true);
    });

    it('should throw for invalid pivotTolerance', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 0, 0, 1] });

      expect(() => luDecompose(A, { pivotTolerance: -1 })).toThrow(
        'Pivot tolerance must be a finite non-negative number'
      );
      expect(() => luDecompose(A, { pivotTolerance: Infinity })).toThrow(
        'Pivot tolerance must be a finite non-negative number'
      );
      expect(() => luDecompose(A, { pivotTolerance: NaN })).toThrow(
        'Pivot tolerance must be a finite non-negative number'
      );
    });
  });

  // ============================================================================
  // Extract L and U
  // ============================================================================

  describe('extractL', () => {
    it('should throw for null input', () => {
      expect(() => extractL(null as unknown as LUResult)).toThrow(
        'LU result cannot be null or undefined'
      );
    });

    it('should have unit diagonal', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, 1, 4, 3, 3, 8, 7, 9],
      });
      const lu = luDecompose(A);
      const L = extractL(lu);

      for (let i = 0; i < 3; i++) {
        expect(L.data[i * 3 + i]).toBe(1);
      }
    });

    it('should be lower triangular', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, 1, 4, 3, 3, 8, 7, 9],
      });
      const lu = luDecompose(A);
      const L = extractL(lu);

      // Upper triangle (excluding diagonal) should be zero
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          expect(L.data[i * 3 + j]).toBe(0);
        }
      }
    });
  });

  describe('extractU', () => {
    it('should throw for null input', () => {
      expect(() => extractU(null as unknown as LUResult)).toThrow(
        'LU result cannot be null or undefined'
      );
    });

    it('should be upper triangular', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, 1, 4, 3, 3, 8, 7, 9],
      });
      const lu = luDecompose(A);
      const U = extractU(lu);

      // Lower triangle (excluding diagonal) should be zero
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < i; j++) {
          expect(U.data[i * 3 + j]).toBe(0);
        }
      }
    });

    it('should satisfy PA = LU reconstruction', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 10],
      });
      const lu = luDecompose(A);
      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data));
    });
  });

  // ============================================================================
  // luSolve
  // ============================================================================

  describe('luSolve', () => {
    it('should throw for null LU result', () => {
      const b = createTestVector({ length: 2, data: [1, 2] });
      expect(() => luSolve(null as unknown as LUResult, b)).toThrow(
        'LU result and vector cannot be null or undefined'
      );
    });

    it('should throw for null vector', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 0, 0, 1] });
      const lu = luDecompose(A);
      expect(() => luSolve(lu, null as unknown as Vector)).toThrow(
        'LU result and vector cannot be null or undefined'
      );
    });

    it('should throw for singular matrix', () => {
      const A = createSingularMatrix(3);
      const lu = luDecompose(A);
      const b = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => luSolve(lu, b)).toThrow(
        'Matrix is singular or near-singular'
      );
    });

    it('should throw for dimension mismatch', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 0, 0, 1] });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => luSolve(lu, b)).toThrow(
        'Vector length must match matrix size'
      );
    });

    it('should solve 1x1 system', () => {
      const A = createTestMatrix({ rows: 1, cols: 1, data: [5] });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 1, data: [10] });

      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(2);
    });

    it('should solve 2x2 system', () => {
      // 2x + y = 5, 4x + 3y = 11 → x = 2, y = 1
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 2, data: [5, 11] });

      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(2);
      expect(x.data[1]).toBeCloseTo(1);
    });

    it('should solve 3x3 system', () => {
      // A = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]]
      // b = [8, -11, -3]
      // x = [2, 3, -1]
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, -1, -3, -1, 2, -2, 1, 2],
      });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 3, data: [8, -11, -3] });

      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(2);
      expect(x.data[1]).toBeCloseTo(3);
      expect(x.data[2]).toBeCloseTo(-1);
    });

    it('should solve system with pivoting', () => {
      // A = [[0, 1], [1, 0]], b = [3, 7] → x = [7, 3]
      const A = createTestMatrix({ rows: 2, cols: 2, data: [0, 1, 1, 0] });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 2, data: [3, 7] });

      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(7);
      expect(x.data[1]).toBeCloseTo(3);
    });

    it('should produce small residual for well-conditioned system', () => {
      const A = createDiagonallyDominantMatrix(4);
      const lu = luDecompose(A);

      // Create known solution, compute b = A*x
      const xExpected = createTestVector({ length: 4, data: [1, -1, 2, -2] });
      const b = multiplyMatrixVector(A, xExpected);

      const x = luSolve(lu, b);
      const resNorm = residualNorm(A, x, b);

      expect(resNorm).toBeLessThan(1e-8);
    });

    it('should solve system with identity matrix', () => {
      const A = createIdentityMatrix(3);
      const lu = luDecompose(A);
      const b = createTestVector({ length: 3, data: [5, 10, 15] });

      const x = luSolve(lu, b);

      expectArrayClose(x.data, [5, 10, 15]);
    });

    it('should solve system with diagonal matrix', () => {
      const A = createDiagonalMatrix([2, 4, 5]);
      const lu = luDecompose(A);
      const b = createTestVector({ length: 3, data: [6, 12, 25] });

      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(3);
      expect(x.data[1]).toBeCloseTo(3);
      expect(x.data[2]).toBeCloseTo(5);
    });
  });

  // ============================================================================
  // luSolveMultiple
  // ============================================================================

  describe('luSolveMultiple', () => {
    it('should throw for null LU result', () => {
      const B = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      expect(() => luSolveMultiple(null as unknown as LUResult, B)).toThrow(
        'LU result and matrix cannot be null or undefined'
      );
    });

    it('should throw for dimension mismatch', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 0, 0, 1] });
      const lu = luDecompose(A);
      const B = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => luSolveMultiple(lu, B)).toThrow(
        'Matrix rows must match system size'
      );
    });

    it('should throw for singular matrix', () => {
      const A = createSingularMatrix(3);
      const lu = luDecompose(A);
      const B = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => luSolveMultiple(lu, B)).toThrow(
        'Matrix is singular or near-singular'
      );
    });

    it('should solve for multiple right-hand sides', () => {
      // A = [[2, 1], [4, 3]]
      // B = [[5, 1], [11, 3]]
      // Solutions: x1 = [2, 1], x2 = [0, 1]
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);
      const B = createTestMatrix({ rows: 2, cols: 2, data: [5, 1, 11, 3] });

      const X = luSolveMultiple(lu, B);

      expect(X.rows).toBe(2);
      expect(X.cols).toBe(2);
      expect(X.data[0 * 2 + 0]).toBeCloseTo(2); // x1[0]
      expect(X.data[1 * 2 + 0]).toBeCloseTo(1); // x1[1]
      expect(X.data[0 * 2 + 1]).toBeCloseTo(0); // x2[0]
      expect(X.data[1 * 2 + 1]).toBeCloseTo(1); // x2[1]
    });

    it('should handle single right-hand side', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);
      const B = createTestMatrix({ rows: 2, cols: 1, data: [5, 11] });

      const X = luSolveMultiple(lu, B);

      expect(X.rows).toBe(2);
      expect(X.cols).toBe(1);
      expect(X.data[0]).toBeCloseTo(2);
      expect(X.data[1]).toBeCloseTo(1);
    });
  });

  // ============================================================================
  // Determinant
  // ============================================================================

  describe('determinant', () => {
    it('should throw for null input', () => {
      expect(() => determinant(null as unknown as LUResult)).toThrow(
        'LU result cannot be null or undefined'
      );
    });

    it('should return 0 for singular matrix', () => {
      const A = createSingularMatrix(3);
      const lu = luDecompose(A);

      expect(determinant(lu)).toBe(0);
    });

    it('should compute determinant of 1x1 matrix', () => {
      const A = createTestMatrix({ rows: 1, cols: 1, data: [7] });
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(7);
    });

    it('should compute determinant of 2x2 matrix', () => {
      // det([[2, 1], [4, 3]]) = 2*3 - 1*4 = 2
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(2);
    });

    it('should compute determinant of 3x3 matrix', () => {
      // det([[1, 2, 3], [4, 5, 6], [7, 8, 10]]) = 1*(50-48) - 2*(40-42) + 3*(32-35) = 2+4-9 = -3
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 10],
      });
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(-3);
    });

    it('should compute determinant of identity matrix', () => {
      const A = createIdentityMatrix(4);
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(1);
    });

    it('should compute determinant of diagonal matrix', () => {
      // det(diag(2, 3, 5)) = 30
      const A = createDiagonalMatrix([2, 3, 5]);
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(30);
    });

    it('should handle negative determinant', () => {
      // det([[1, 2], [3, 4]]) = 1*4 - 2*3 = -2
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const lu = luDecompose(A);

      expect(determinant(lu)).toBeCloseTo(-2);
    });
  });

  // ============================================================================
  // luInverse
  // ============================================================================

  describe('luInverse', () => {
    it('should throw for null input', () => {
      expect(() => luInverse(null as unknown as LUResult)).toThrow(
        'LU result cannot be null or undefined'
      );
    });

    it('should throw for singular matrix', () => {
      const A = createSingularMatrix(3);
      const lu = luDecompose(A);

      expect(() => luInverse(lu)).toThrow(
        'Cannot compute inverse of singular matrix'
      );
    });

    it('should compute inverse of 2x2 matrix', () => {
      // A = [[2, 1], [4, 3]], det = 2
      // A^-1 = (1/2)[[3, -1], [-4, 2]] = [[1.5, -0.5], [-2, 1]]
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const lu = luDecompose(A);
      const inv = luInverse(lu);

      expect(inv.data[0]).toBeCloseTo(1.5);
      expect(inv.data[1]).toBeCloseTo(-0.5);
      expect(inv.data[2]).toBeCloseTo(-2);
      expect(inv.data[3]).toBeCloseTo(1);
    });

    it('should compute inverse of 3x3 matrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, 1, 4, 3, 3, 8, 7, 9],
      });
      const lu = luDecompose(A);
      const inv = luInverse(lu);

      // Verify A * A^-1 = I
      const product = multiplyMatrices(A, inv);
      const I = createIdentityMatrix(3);

      expectArrayClose(product.data, Array.from(I.data), 1e-10);
    });

    it('should satisfy A * A^-1 = I', () => {
      const A = createDiagonallyDominantMatrix(4);
      const lu = luDecompose(A);
      const inv = luInverse(lu);

      const product = multiplyMatrices(A, inv);
      const I = createIdentityMatrix(4);

      expectArrayClose(product.data, Array.from(I.data), 1e-6);
    });

    it('should return identity for identity input', () => {
      const A = createIdentityMatrix(3);
      const lu = luDecompose(A);
      const inv = luInverse(lu);

      const I = createIdentityMatrix(3);
      expectArrayClose(inv.data, Array.from(I.data));
    });
  });

  // ============================================================================
  // solveLinearSystem
  // ============================================================================

  describe('solveLinearSystem', () => {
    it('should solve in one call', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [2, 1, 4, 3] });
      const b = createTestVector({ length: 2, data: [5, 11] });

      const x = solveLinearSystem(A, b);

      expect(x.data[0]).toBeCloseTo(2);
      expect(x.data[1]).toBeCloseTo(1);
    });

    it('should throw for singular matrix', () => {
      const A = createSingularMatrix(3);
      const b = createTestVector({ length: 3, data: [1, 2, 3] });

      expect(() => solveLinearSystem(A, b)).toThrow(
        'Matrix is singular or near-singular'
      );
    });

    it('should accept custom solver options', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1e-14, 1, 1, 1],
      });
      const b = createTestVector({ length: 2, data: [1, 1] });

      // With very large tolerance, treated as singular
      expect(() => solveLinearSystem(A, b, { pivotTolerance: 2 })).toThrow(
        'Matrix is singular'
      );
    });

    it('should produce same result as luDecompose + luSolve', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [2, 1, -1, -3, -1, 2, -2, 1, 2],
      });
      const b = createTestVector({ length: 3, data: [8, -11, -3] });

      const x1 = solveLinearSystem(A, b);

      const lu = luDecompose(A);
      const x2 = luSolve(lu, b);

      expectArrayClose(x1.data, Array.from(x2.data));
    });
  });

  // ============================================================================
  // Numerical Stability
  // ============================================================================

  describe('Numerical Stability', () => {
    it('should handle Hilbert matrix (ill-conditioned)', () => {
      const n = 4;
      const A = createHilbertMatrix(n);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      // Create known solution and compute b
      const xData = new Float64Array(n);
      for (let i = 0; i < n; i++) xData[i] = 1;
      const xExpected: Vector = { length: n, data: xData };
      const b = multiplyMatrixVector(A, xExpected);

      const x = luSolve(lu, b);

      // Hilbert matrices are ill-conditioned, so tolerance is looser
      for (let i = 0; i < n; i++) {
        expect(x.data[i]).toBeCloseTo(1, 4);
      }
    });

    it('should handle matrix with large magnitude differences', () => {
      // Large and small entries but non-singular: det = 1e6*1 - 1*1 ≈ 1e6
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1e6, 1, 1, 1],
      });
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      // b = A * [1, 1] = [1e6+1, 2]
      const b = createTestVector({ length: 2, data: [1e6 + 1, 2] });
      const x = luSolve(lu, b);

      expect(x.data[0]).toBeCloseTo(1, 5);
      expect(x.data[1]).toBeCloseTo(1, 5);
    });

    it('should handle negative values', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [-3, 2, 1, -4],
      });
      const lu = luDecompose(A);
      const b = createTestVector({ length: 2, data: [-1, 6] });

      const x = luSolve(lu, b);
      const resNorm = residualNorm(A, x, b);

      expect(resNorm).toBeLessThan(1e-10);
    });

    it('should handle symmetric positive definite matrix', () => {
      const A = createDiagonallyDominantMatrix(5);
      const lu = luDecompose(A);

      // Create known solution
      const xData = new Float64Array(5);
      for (let i = 0; i < 5; i++) xData[i] = i + 1;
      const xExpected: Vector = { length: 5, data: xData };
      const b = multiplyMatrixVector(A, xExpected);

      const x = luSolve(lu, b);
      const resNorm = residualNorm(A, x, b);

      expect(resNorm).toBeLessThan(1e-6);
    });
  });

  // ============================================================================
  // SPICE Circuit Matrices
  // ============================================================================

  describe('SPICE Circuit Matrices', () => {
    it('should solve voltage divider (2 resistors)', () => {
      // Circuit: V1 = 12V, R1 = 1kΩ (node 1-2), R2 = 2kΩ (node 2-0)
      // MNA: [G + 1/R1, -1/R1, 1; -1/R1, 1/R1+1/R2, 0; 1, 0, 0]
      // G = conductance matrix augmented with voltage source
      const R1 = 1000;
      const R2 = 2000;
      const V1 = 12;

      // Node 1: V1 terminal, Node 2: junction
      // MNA matrix (2 nodes + 1 voltage source = 3x3)
      const G11 = 1 / R1;
      const G12 = -1 / R1;
      const G22 = 1 / R1 + 1 / R2;

      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [G11, G12, 1, G12, G22, 0, 1, 0, 0],
      });

      const b = createTestVector({ length: 3, data: [0, 0, V1] });
      const x = solveLinearSystem(A, b);

      // x[0] = V1 = 12V (node 1)
      // x[1] = V1 * R2/(R1+R2) = 12 * 2000/3000 = 8V (node 2)
      // x[2] = current through V1
      expect(x.data[0]).toBeCloseTo(12);
      expect(x.data[1]).toBeCloseTo(8);
      expect(x.data[2]).toBeCloseTo(-12 / 3000, 10); // Current = V/R_total
    });

    it('should solve series resistors', () => {
      // V1 = 10V, R1 = R2 = R3 = 100Ω in series
      // 3 nodes + 1 voltage source = 4x4 MNA
      const R = 100;
      const V = 10;

      const A = createTestMatrix({
        rows: 4,
        cols: 4,
        data: [
          1 / R,
          -1 / R,
          0,
          1,
          -1 / R,
          1 / R + 1 / R,
          -1 / R,
          0,
          0,
          -1 / R,
          1 / R + 1 / R,
          0,
          1,
          0,
          0,
          0,
        ],
      });

      const b = createTestVector({ length: 4, data: [0, 0, 0, V] });
      const x = solveLinearSystem(A, b);

      // V_node1 = 10V, V_node2 = 10*2/3, V_node3 = 10*1/3
      expect(x.data[0]).toBeCloseTo(10);
      expect(x.data[1]).toBeCloseTo(10 * (2 / 3), 10);
      expect(x.data[2]).toBeCloseTo(10 * (1 / 3), 10);
    });

    it('should solve parallel resistors', () => {
      // V1 = 5V, R1 = 100Ω, R2 = 200Ω in parallel
      // 1 node + 1 voltage source = 2x2 MNA
      const R1 = 100;
      const R2 = 200;
      const V = 5;

      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1 / R1 + 1 / R2, 1, 1, 0],
      });

      const b = createTestVector({ length: 2, data: [0, V] });
      const x = solveLinearSystem(A, b);

      expect(x.data[0]).toBeCloseTo(5); // Node voltage = 5V
      // Current = V * (1/R1 + 1/R2) = 5 * (1/100 + 1/200) = 5 * 0.015 = 0.075A
      expect(x.data[1]).toBeCloseTo(-V * (1 / R1 + 1 / R2), 10);
    });

    it('should handle MNA matrix with current source', () => {
      // R = 1kΩ, I = 10mA
      // Simple: one node, one resistor to ground, current source
      // MNA: [1/R] * [V] = [I]
      const R = 1000;
      const I = 0.01;

      const A = createTestMatrix({ rows: 1, cols: 1, data: [1 / R] });
      const b = createTestVector({ length: 1, data: [I] });
      const x = solveLinearSystem(A, b);

      // V = I * R = 0.01 * 1000 = 10V
      expect(x.data[0]).toBeCloseTo(10);
    });

    it('should solve Wheatstone bridge circuit', () => {
      // Wheatstone bridge: V=10V, R1=R2=R3=R4=100Ω
      // Balanced bridge → V_bridge = 0
      const R = 100;
      const V = 10;

      // Nodes: 1 (top), 2 (left), 3 (right), 0 (ground)
      // + voltage source node
      // 3 nodes + 1 voltage source = 4x4

      const A = createTestMatrix({
        rows: 4,
        cols: 4,
        data: [
          1 / R + 1 / R,
          -1 / R,
          -1 / R,
          1, // node 1
          -1 / R,
          1 / R + 1 / R,
          0,
          0, // node 2
          -1 / R,
          0,
          1 / R + 1 / R,
          0, // node 3
          1,
          0,
          0,
          0, // voltage source
        ],
      });

      const b = createTestVector({ length: 4, data: [0, 0, 0, V] });
      const x = solveLinearSystem(A, b);

      // Balanced bridge: V_node2 = V_node3 = V/2
      expect(x.data[0]).toBeCloseTo(10); // Node 1 = V
      expect(x.data[1]).toBeCloseTo(5); // Node 2 = V/2
      expect(x.data[2]).toBeCloseTo(5); // Node 3 = V/2
    });
  });

  // ============================================================================
  // Performance
  // ============================================================================

  describe('Performance', () => {
    it('should decompose 10x10 matrix', () => {
      const A = createDiagonallyDominantMatrix(10);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);

      const L = extractL(lu);
      const U = extractU(lu);
      const LU = multiplyMatrices(L, U);
      const PA = applyPermutation(lu.permutation, A);

      expectArrayClose(LU.data, Array.from(PA.data), 1e-6);
    });

    it('should solve 20x20 system with small residual', () => {
      const n = 20;
      const A = createDiagonallyDominantMatrix(n);
      const lu = luDecompose(A);

      const xData = new Float64Array(n);
      for (let i = 0; i < n; i++) xData[i] = (i % 2 === 0 ? 1 : -1) * (i + 1);
      const xExpected: Vector = { length: n, data: xData };
      const b = multiplyMatrixVector(A, xExpected);

      const x = luSolve(lu, b);
      const resNorm = residualNorm(A, x, b);

      expect(resNorm).toBeLessThan(1e-2);
    });

    it('should decompose 100x100 matrix', () => {
      const A = createDiagonallyDominantMatrix(100);
      const lu = luDecompose(A);

      expect(lu.singular).toBe(false);
    });
  });
});
