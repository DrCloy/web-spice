import { describe, expect, it } from 'vitest';
import {
  addMatrices,
  areMatricesEqual,
  clampMatrix,
  conditionNumber,
  estimateConditionNumber,
  frobeniusNorm,
  getColumn,
  getRow,
  hasNaNOrInfinity,
  isDiagonal,
  isIdentity,
  isSymmetric,
  isZeroMatrix,
  multiplyMatrices,
  multiplyMatrixVector,
  multiplyVectorMatrix,
  negateMatrix,
  rank,
  replaceNaN,
  scaleMatrix,
  setColumn,
  setRow,
  submatrix,
  subtractMatrices,
  trace,
  transpose,
} from '@/engine/solver/matrix';
import {
  createDiagonalMatrix,
  createIdentityMatrix,
  createSymmetricMatrix,
  createTestMatrix,
  createTestVector,
} from '../../factories/matrix';

describe('Matrix Operations', () => {
  // ============================================================================
  // Basic Arithmetic
  // ============================================================================

  describe('addMatrices', () => {
    it('should add two matrices of same dimensions', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({ rows: 2, cols: 2, data: [5, 6, 7, 8] });

      const result = addMatrices(A, B);

      expect(result.rows).toBe(2);
      expect(result.cols).toBe(2);
      expect(Array.from(result.data)).toEqual([6, 8, 10, 12]);
    });

    it('should throw error for mismatched dimensions', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => addMatrices(A, B)).toThrow('Matrix dimensions must match');
    });
  });

  describe('subtractMatrices', () => {
    it('should subtract two matrices of same dimensions', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [5, 6, 7, 8] });
      const B = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = subtractMatrices(A, B);

      expect(Array.from(result.data)).toEqual([4, 4, 4, 4]);
    });

    it('should throw error for mismatched dimensions', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => subtractMatrices(A, B)).toThrow(
        'Matrix dimensions must match'
      );
    });
  });

  describe('scaleMatrix', () => {
    it('should scale matrix by scalar', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = scaleMatrix(A, 2);

      expect(Array.from(result.data)).toEqual([2, 4, 6, 8]);
    });

    it('should handle zero scalar', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = scaleMatrix(A, 0);

      expect(Array.from(result.data)).toEqual([0, 0, 0, 0]);
    });
  });

  describe('negateMatrix', () => {
    it('should negate all elements', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, -2, 3, -4] });

      const result = negateMatrix(A);

      expect(Array.from(result.data)).toEqual([-1, 2, -3, 4]);
    });
  });

  describe('multiplyMatrices', () => {
    it('should multiply two compatible matrices', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const B = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [7, 8, 9, 10, 11, 12],
      });

      const result = multiplyMatrices(A, B);

      // Result should be 2x2
      // [[1*7+2*9+3*11, 1*8+2*10+3*12],
      //  [4*7+5*9+6*11, 4*8+5*10+6*12]]
      // = [[58, 64], [139, 154]]
      expect(result.rows).toBe(2);
      expect(result.cols).toBe(2);
      expect(Array.from(result.data)).toEqual([58, 64, 139, 154]);
    });

    it('should throw error for incompatible dimensions', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const B = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      expect(() => multiplyMatrices(A, B)).toThrow(
        'Matrix dimensions incompatible for multiplication'
      );
    });

    it('should work with identity matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const I = createIdentityMatrix(2);

      const result = multiplyMatrices(A, I);

      expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('multiplyMatrixVector', () => {
    it('should multiply matrix by vector', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const v = createTestVector({ length: 3, data: [7, 8, 9] });

      const result = multiplyMatrixVector(A, v);

      // [1*7+2*8+3*9, 4*7+5*8+6*9] = [50, 122]
      expect(result.length).toBe(2);
      expect(Array.from(result.data)).toEqual([50, 122]);
    });

    it('should throw error for incompatible dimensions', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const v = createTestVector({ length: 2, data: [1, 2] });

      expect(() => multiplyMatrixVector(A, v)).toThrow(
        'Matrix columns must match vector length'
      );
    });
  });

  describe('multiplyVectorMatrix', () => {
    it('should multiply vector by matrix (row vector)', () => {
      const v = createTestVector({ length: 2, data: [1, 2] });
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [3, 4, 5, 6, 7, 8],
      });

      const result = multiplyVectorMatrix(v, A);

      // [1*3+2*6, 1*4+2*7, 1*5+2*8] = [15, 18, 21]
      expect(result.length).toBe(3);
      expect(Array.from(result.data)).toEqual([15, 18, 21]);
    });

    it('should throw error for incompatible dimensions', () => {
      const v = createTestVector({ length: 3, data: [1, 2, 3] });
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => multiplyVectorMatrix(v, A)).toThrow(
        'Vector length must match matrix rows'
      );
    });
  });

  // ============================================================================
  // Structural Operations
  // ============================================================================

  describe('transpose', () => {
    it('should transpose a matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      const result = transpose(A);

      expect(result.rows).toBe(3);
      expect(result.cols).toBe(2);
      // [[1, 2, 3],   =>  [[1, 4],
      //  [4, 5, 6]]        [2, 5],
      //                    [3, 6]]
      expect(Array.from(result.data)).toEqual([1, 4, 2, 5, 3, 6]);
    });

    it('should handle square matrices', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = transpose(A);

      expect(Array.from(result.data)).toEqual([1, 3, 2, 4]);
    });
  });

  describe('getRow', () => {
    it('should extract a row from matrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });

      const row1 = getRow(A, 1);

      expect(row1.length).toBe(2);
      expect(Array.from(row1.data)).toEqual([3, 4]);
    });

    it('should throw error for invalid row index', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      expect(() => getRow(A, 3)).toThrow('Row index out of bounds');
    });
  });

  describe('getColumn', () => {
    it('should extract a column from matrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });

      const col1 = getColumn(A, 1);

      expect(col1.length).toBe(3);
      expect(Array.from(col1.data)).toEqual([2, 4, 6]);
    });

    it('should throw error for invalid column index', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      expect(() => getColumn(A, 3)).toThrow('Column index out of bounds');
    });
  });

  describe('setRow', () => {
    it('should set a row in matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const newRow = [7, 8, 9];

      const result = setRow(A, 1, newRow);

      expect(Array.from(result.data)).toEqual([1, 2, 3, 7, 8, 9]);
    });

    it('should throw error for mismatched length', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });
      const newRow = [7, 8];

      expect(() => setRow(A, 1, newRow)).toThrow(
        'Row length must match matrix columns'
      );
    });
  });

  describe('setColumn', () => {
    it('should set a column in matrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });
      const newCol = [7, 8, 9];

      const result = setColumn(A, 1, newCol);

      expect(Array.from(result.data)).toEqual([1, 7, 3, 8, 5, 9]);
    });

    it('should throw error for mismatched length', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 2,
        data: [1, 2, 3, 4, 5, 6],
      });
      const newCol = [7, 8];

      expect(() => setColumn(A, 1, newCol)).toThrow(
        'Column length must match matrix rows'
      );
    });
  });

  describe('submatrix', () => {
    it('should extract submatrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      });

      const result = submatrix(A, 0, 2, 1, 3);

      // Extract rows 0-1, cols 1-2
      expect(result.rows).toBe(2);
      expect(result.cols).toBe(2);
      expect(Array.from(result.data)).toEqual([2, 3, 5, 6]);
    });

    it('should throw error for invalid indices', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      expect(() => submatrix(A, 0, 3, 0, 2)).toThrow(
        'Invalid submatrix indices'
      );
    });
  });

  // ============================================================================
  // Properties and Analysis
  // ============================================================================

  describe('trace', () => {
    it('should compute trace of square matrix', () => {
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      });

      const result = trace(A);

      // trace = 1 + 5 + 9 = 15
      expect(result).toBe(15);
    });

    it('should throw error for non-square matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => trace(A)).toThrow('Matrix must be square');
    });
  });

  describe('frobeniusNorm', () => {
    it('should compute Frobenius norm', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 2, 3] });

      const result = frobeniusNorm(A);

      // sqrt(1^2 + 2^2 + 2^2 + 3^2) = sqrt(18) ≈ 4.24264
      expect(result).toBeCloseTo(4.24264, 4);
    });

    it('should return 0 for zero matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [0, 0, 0, 0] });

      const result = frobeniusNorm(A);

      expect(result).toBe(0);
    });
  });

  describe('isSymmetric', () => {
    it('should return true for symmetric matrix', () => {
      const A = createSymmetricMatrix([
        [1, 2, 3],
        [2, 4, 5],
        [3, 5, 6],
      ]);

      const result = isSymmetric(A);

      expect(result).toBe(true);
    });

    it('should return false for non-symmetric matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = isSymmetric(A);

      expect(result).toBe(false);
    });

    it('should return false for non-square matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      const result = isSymmetric(A);

      expect(result).toBe(false);
    });
  });

  describe('isDiagonal', () => {
    it('should return true for diagonal matrix', () => {
      const A = createDiagonalMatrix([1, 2, 3]);

      const result = isDiagonal(A);

      expect(result).toBe(true);
    });

    it('should return false for non-diagonal matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 0, 3] });

      const result = isDiagonal(A);

      expect(result).toBe(false);
    });
  });

  describe('isIdentity', () => {
    it('should return true for identity matrix', () => {
      const I = createIdentityMatrix(3);

      const result = isIdentity(I);

      expect(result).toBe(true);
    });

    it('should return false for non-identity matrix', () => {
      const A = createDiagonalMatrix([1, 2, 1]);

      const result = isIdentity(A);

      expect(result).toBe(false);
    });
  });

  describe('isZeroMatrix', () => {
    it('should return true for zero matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [0, 0, 0, 0, 0, 0],
      });

      const result = isZeroMatrix(A);

      expect(result).toBe(true);
    });

    it('should return false for non-zero matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [0, 0, 0, 1] });

      const result = isZeroMatrix(A);

      expect(result).toBe(false);
    });
  });

  describe('areMatricesEqual', () => {
    it('should return true for equal matrices', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = areMatricesEqual(A, B);

      expect(result).toBe(true);
    });

    it('should return false for different matrices', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 5] });

      const result = areMatricesEqual(A, B);

      expect(result).toBe(false);
    });

    it('should return false for different dimensions', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });
      const B = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      const result = areMatricesEqual(A, B);

      expect(result).toBe(false);
    });
  });

  describe('conditionNumber', () => {
    it('should compute condition number for well-conditioned matrix', () => {
      const I = createIdentityMatrix(3);

      const result = conditionNumber(I);

      // Identity matrix has condition number 1
      expect(result).toBeCloseTo(1, 1);
    });

    it('should throw error for non-square matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => conditionNumber(A)).toThrow('Matrix must be square');
    });
  });

  // ============================================================================
  // Numerical Stability
  // ============================================================================

  describe('hasNaNOrInfinity', () => {
    it('should return false for normal matrix', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = hasNaNOrInfinity(A);

      expect(result).toBe(false);
    });

    it('should return true for matrix with NaN', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, NaN, 3, 4] });

      const result = hasNaNOrInfinity(A);

      expect(result).toBe(true);
    });

    it('should return true for matrix with Infinity', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 2, Infinity, 4],
      });

      const result = hasNaNOrInfinity(A);

      expect(result).toBe(true);
    });
  });

  describe('clampMatrix', () => {
    it('should clamp matrix values', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 5, -2, 3] });

      const result = clampMatrix(A, 0, 4);

      expect(Array.from(result.data)).toEqual([1, 4, 0, 3]);
    });
  });

  describe('replaceNaN', () => {
    it('should replace NaN values', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, NaN, 3, NaN] });

      const result = replaceNaN(A, 0);

      expect(Array.from(result.data)).toEqual([1, 0, 3, 0]);
    });

    it('should not modify non-NaN values', () => {
      const A = createTestMatrix({ rows: 2, cols: 2, data: [1, 2, 3, 4] });

      const result = replaceNaN(A, 0);

      expect(Array.from(result.data)).toEqual([1, 2, 3, 4]);
    });
  });

  describe('estimateConditionNumber', () => {
    it('should estimate condition number', () => {
      const I = createIdentityMatrix(3);

      const result = estimateConditionNumber(I);

      // Identity matrix has condition number ~1
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(10);
    });

    it('should throw error for non-square matrix', () => {
      const A = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 2, 3, 4, 5, 6],
      });

      expect(() => estimateConditionNumber(A)).toThrow('Matrix must be square');
    });
  });

  describe('rank', () => {
    it('should compute rank of full-rank matrix', () => {
      const I = createIdentityMatrix(3);

      const result = rank(I);

      expect(result).toBe(3);
    });

    it('should compute rank of rank-deficient matrix', () => {
      // Matrix with one row being zero
      const A = createTestMatrix({
        rows: 3,
        cols: 3,
        data: [1, 0, 0, 0, 0, 0, 0, 0, 1],
      });

      const result = rank(A);

      expect(result).toBe(2);
    });
  });
});
