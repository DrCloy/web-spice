import { describe, expect, it } from 'vitest';
import type { CSRMatrix, SparseMatrix } from '@/types/circuit';
import {
  cooToCSR,
  countNonZeros,
  denseToSparse,
  estimateSparsity,
  getSparseRow,
  isValidCOO,
  isValidCSR,
  sparseMatrixVectorMultiply,
  sparseToDense,
  sparseTranspose,
} from '@/engine/solver/matrix';
import { createTestMatrix, createTestVector } from '../../factories/matrix';

describe('Sparse Matrix Operations', () => {
  // ============================================================================
  // Format Conversion
  // ============================================================================

  describe('cooToCSR', () => {
    it('should convert COO to CSR format', () => {
      const coo: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 0, col: 2, value: 2 },
          { row: 1, col: 1, value: 3 },
          { row: 2, col: 0, value: 4 },
          { row: 2, col: 2, value: 5 },
        ],
      };

      const csr = cooToCSR(coo);

      expect(csr.rows).toBe(3);
      expect(csr.cols).toBe(3);
      expect(Array.from(csr.values)).toEqual([1, 2, 3, 4, 5]);
      expect(Array.from(csr.columnIndices)).toEqual([0, 2, 1, 0, 2]);
      expect(Array.from(csr.rowPointers)).toEqual([0, 2, 3, 5]);
    });

    it('should handle empty sparse matrix', () => {
      const coo: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [],
      };

      const csr = cooToCSR(coo);

      expect(csr.values.length).toBe(0);
      expect(Array.from(csr.rowPointers)).toEqual([0, 0, 0]);
    });

    it('should handle unsorted entries', () => {
      const coo: SparseMatrix = {
        rows: 2,
        cols: 3,
        entries: [
          { row: 1, col: 2, value: 4 },
          { row: 0, col: 0, value: 1 },
          { row: 1, col: 0, value: 3 },
          { row: 0, col: 1, value: 2 },
        ],
      };

      const csr = cooToCSR(coo);

      // Row 0: [1, 2, 0], Row 1: [3, 0, 4]
      expect(Array.from(csr.rowPointers)).toEqual([0, 2, 4]);
    });
  });

  describe('denseToSparse', () => {
    it('should convert dense matrix to sparse COO format', () => {
      const dense = createTestMatrix({
        rows: 2,
        cols: 3,
        data: [1, 0, 2, 0, 0, 3],
      });

      const sparse = denseToSparse(dense);

      expect(sparse.rows).toBe(2);
      expect(sparse.cols).toBe(3);
      expect(sparse.entries).toHaveLength(3);
      expect(sparse.entries).toContainEqual({ row: 0, col: 0, value: 1 });
      expect(sparse.entries).toContainEqual({ row: 0, col: 2, value: 2 });
      expect(sparse.entries).toContainEqual({ row: 1, col: 2, value: 3 });
    });

    it('should handle zero matrix', () => {
      const dense = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [0, 0, 0, 0],
      });

      const sparse = denseToSparse(dense);

      expect(sparse.entries).toHaveLength(0);
    });

    it('should respect tolerance parameter', () => {
      const dense = createTestMatrix({
        rows: 2,
        cols: 2,
        data: [1, 1e-12, 0, 2],
      });

      const sparse = denseToSparse(dense, 1e-10);

      expect(sparse.entries).toHaveLength(2); // 1e-12 treated as zero
    });
  });

  describe('sparseToDense', () => {
    it('should convert sparse COO to dense matrix', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 0, col: 1, value: 2 },
          { row: 1, col: 1, value: 4 },
        ],
      };

      const dense = sparseToDense(sparse);

      expect(dense.rows).toBe(2);
      expect(dense.cols).toBe(2);
      expect(Array.from(dense.data)).toEqual([1, 2, 0, 4]);
    });

    it('should handle empty sparse matrix', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [],
      };

      const dense = sparseToDense(sparse);

      expect(Array.from(dense.data)).toEqual([0, 0, 0, 0]);
    });
  });

  // ============================================================================
  // Sparse Operations
  // ============================================================================

  describe('sparseMatrixVectorMultiply', () => {
    it('should multiply sparse matrix by vector', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 3,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 0, col: 2, value: 2 },
          { row: 1, col: 1, value: 3 },
        ],
      };
      const v = createTestVector({ length: 3, data: [1, 2, 3] });

      const result = sparseMatrixVectorMultiply(sparse, v);

      // [1*1 + 0*2 + 2*3, 0*1 + 3*2 + 0*3] = [7, 6]
      expect(result.length).toBe(2);
      expect(Array.from(result.data)).toEqual([7, 6]);
    });

    it('should throw error for dimension mismatch', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 3,
        entries: [],
      };
      const v = createTestVector({ length: 2, data: [1, 2] });

      expect(() => sparseMatrixVectorMultiply(sparse, v)).toThrow(
        'Matrix columns must match vector length'
      );
    });
  });

  describe('sparseTranspose', () => {
    it('should transpose sparse matrix', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 3,
        entries: [
          { row: 0, col: 1, value: 5 },
          { row: 1, col: 2, value: 10 },
        ],
      };

      const result = sparseTranspose(sparse);

      expect(result.rows).toBe(3);
      expect(result.cols).toBe(2);
      expect(result.entries).toContainEqual({ row: 1, col: 0, value: 5 });
      expect(result.entries).toContainEqual({ row: 2, col: 1, value: 10 });
    });
  });

  describe('getSparseRow', () => {
    it('should extract a row from sparse matrix', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 1, col: 1, value: 5 },
          { row: 1, col: 2, value: 6 },
          { row: 2, col: 0, value: 7 },
        ],
      };

      const row1 = getSparseRow(sparse, 1);

      expect(row1.length).toBe(3);
      expect(Array.from(row1.data)).toEqual([0, 5, 6]);
    });

    it('should return zero vector for empty row', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 2,
        entries: [{ row: 0, col: 0, value: 1 }],
      };

      const row1 = getSparseRow(sparse, 1);

      expect(Array.from(row1.data)).toEqual([0, 0]);
    });

    it('should throw error for invalid row index', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [],
      };

      expect(() => getSparseRow(sparse, 3)).toThrow('Row index out of bounds');
    });
  });

  // ============================================================================
  // Utility Functions
  // ============================================================================

  describe('countNonZeros', () => {
    it('should count non-zero entries in COO', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 1, col: 1, value: 2 },
          { row: 2, col: 2, value: 3 },
        ],
      };

      const count = countNonZeros(sparse);

      expect(count).toBe(3);
    });

    it('should return 0 for empty matrix', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [],
      };

      const count = countNonZeros(sparse);

      expect(count).toBe(0);
    });
  });

  describe('isValidCOO', () => {
    it('should return true for valid COO matrix', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 2, col: 2, value: 2 },
        ],
      };

      expect(isValidCOO(sparse)).toBe(true);
    });

    it('should return false for out-of-bounds row index', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [{ row: 3, col: 0, value: 1 }],
      };

      expect(isValidCOO(sparse)).toBe(false);
    });

    it('should return false for out-of-bounds column index', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [{ row: 0, col: 5, value: 1 }],
      };

      expect(isValidCOO(sparse)).toBe(false);
    });

    it('should return false for negative indices', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [{ row: -1, col: 0, value: 1 }],
      };

      expect(isValidCOO(sparse)).toBe(false);
    });

    it('should return false for duplicate entries', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 0, col: 0, value: 2 },
        ],
      };

      expect(isValidCOO(sparse)).toBe(false);
    });
  });

  describe('isValidCSR', () => {
    it('should return true for valid CSR matrix', () => {
      const csr: CSRMatrix = {
        rows: 3,
        cols: 3,
        values: Float64Array.from([1, 2, 3]),
        columnIndices: Int32Array.from([0, 1, 2]),
        rowPointers: Int32Array.from([0, 1, 2, 3]),
      };

      expect(isValidCSR(csr)).toBe(true);
    });

    it('should return false for invalid rowPointers length', () => {
      const csr: CSRMatrix = {
        rows: 3,
        cols: 3,
        values: Float64Array.from([1, 2]),
        columnIndices: Int32Array.from([0, 1]),
        rowPointers: Int32Array.from([0, 1]), // Should be length 4
      };

      expect(isValidCSR(csr)).toBe(false);
    });

    it('should return false for mismatched values and columnIndices', () => {
      const csr: CSRMatrix = {
        rows: 2,
        cols: 2,
        values: Float64Array.from([1, 2, 3]),
        columnIndices: Int32Array.from([0, 1]), // Length mismatch
        rowPointers: Int32Array.from([0, 1, 3]),
      };

      expect(isValidCSR(csr)).toBe(false);
    });

    it('should return false for out-of-bounds column index', () => {
      const csr: CSRMatrix = {
        rows: 2,
        cols: 2,
        values: Float64Array.from([1]),
        columnIndices: Int32Array.from([5]), // Out of bounds
        rowPointers: Int32Array.from([0, 1, 1]),
      };

      expect(isValidCSR(csr)).toBe(false);
    });
  });

  describe('estimateSparsity', () => {
    it('should compute sparsity ratio', () => {
      const sparse: SparseMatrix = {
        rows: 4,
        cols: 4,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 1, col: 1, value: 2 },
          { row: 2, col: 2, value: 3 },
          { row: 3, col: 3, value: 4 },
        ],
      };

      const sparsity = estimateSparsity(sparse);

      // 4 non-zeros out of 16 total = 0.25 density
      // sparsity = 1 - density = 0.75
      expect(sparsity).toBeCloseTo(0.75, 5);
    });

    it('should return 1 for empty matrix (fully sparse)', () => {
      const sparse: SparseMatrix = {
        rows: 3,
        cols: 3,
        entries: [],
      };

      const sparsity = estimateSparsity(sparse);

      expect(sparsity).toBe(1);
    });

    it('should return 0 for fully dense matrix', () => {
      const sparse: SparseMatrix = {
        rows: 2,
        cols: 2,
        entries: [
          { row: 0, col: 0, value: 1 },
          { row: 0, col: 1, value: 2 },
          { row: 1, col: 0, value: 3 },
          { row: 1, col: 1, value: 4 },
        ],
      };

      const sparsity = estimateSparsity(sparse);

      expect(sparsity).toBe(0);
    });
  });

  // ============================================================================
  // Invalid COO Validation
  // ============================================================================

  describe('Invalid COO Input Validation', () => {
    const outOfBoundsCOO: SparseMatrix = {
      rows: 2,
      cols: 2,
      entries: [{ row: 5, col: 0, value: 1 }],
    };

    const duplicateEntriesCOO: SparseMatrix = {
      rows: 2,
      cols: 2,
      entries: [
        { row: 0, col: 0, value: 1 },
        { row: 0, col: 0, value: 2 },
      ],
    };

    it('should throw on invalid COO in cooToCSR', () => {
      expect(() => cooToCSR(outOfBoundsCOO)).toThrow('Invalid COO matrix');
      expect(() => cooToCSR(duplicateEntriesCOO)).toThrow('Invalid COO matrix');
    });

    it('should throw on invalid COO in sparseToDense', () => {
      expect(() => sparseToDense(outOfBoundsCOO)).toThrow('Invalid COO matrix');
      expect(() => sparseToDense(duplicateEntriesCOO)).toThrow(
        'Invalid COO matrix'
      );
    });

    it('should throw on invalid COO in sparseMatrixVectorMultiply', () => {
      const v = createTestVector({ length: 2, data: [1, 2] });
      expect(() => sparseMatrixVectorMultiply(outOfBoundsCOO, v)).toThrow(
        'Invalid COO matrix'
      );
      expect(() => sparseMatrixVectorMultiply(duplicateEntriesCOO, v)).toThrow(
        'Invalid COO matrix'
      );
    });

    it('should throw on invalid COO in sparseTranspose', () => {
      expect(() => sparseTranspose(outOfBoundsCOO)).toThrow(
        'Invalid COO matrix'
      );
      expect(() => sparseTranspose(duplicateEntriesCOO)).toThrow(
        'Invalid COO matrix'
      );
    });

    it('should throw on invalid COO in getSparseRow', () => {
      expect(() => getSparseRow(outOfBoundsCOO, 0)).toThrow(
        'Invalid COO matrix'
      );
      expect(() => getSparseRow(duplicateEntriesCOO, 0)).toThrow(
        'Invalid COO matrix'
      );
    });

    it('should throw on invalid COO in estimateSparsity', () => {
      expect(() => estimateSparsity(outOfBoundsCOO)).toThrow(
        'Invalid COO matrix'
      );
      expect(() => estimateSparsity(duplicateEntriesCOO)).toThrow(
        'Invalid COO matrix'
      );
    });
  });
});
