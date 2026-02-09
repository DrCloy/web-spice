import { describe, expect, it } from 'vitest';
import {
  cooToCSR,
  multiplyMatrices,
  multiplyMatrixVector,
  sparseMatrixVectorMultiply,
} from '@/engine/solver/matrix';
import type { Matrix, SparseMatrix } from '@/types/circuit';

/**
 * Performance benchmarks for matrix operations
 *
 * These tests verify that matrix operations meet minimum performance requirements
 * for practical circuit simulation use cases.
 *
 * Skipped by default to avoid flaky CI failures.
 * Run with: RUN_PERF_TESTS=1 npm run test
 */
const runPerf = !!process.env.RUN_PERF_TESTS;

describe.skipIf(!runPerf)('Performance Benchmarks', () => {
  // ============================================================================
  // Dense Matrix Performance
  // ============================================================================

  describe('Dense Matrix Operations', () => {
    it('should multiply 100x100 matrices in under 100ms', () => {
      const size = 100;

      // Create random 100x100 matrices
      const A = createRandomMatrix(size, size);
      const B = createRandomMatrix(size, size);

      const start = performance.now();
      const result = multiplyMatrices(A, B);
      const end = performance.now();

      const duration = end - start;

      expect(result.rows).toBe(size);
      expect(result.cols).toBe(size);
      expect(duration).toBeLessThan(100);
    });

    it('should multiply 50x50 matrices in under 20ms', () => {
      const size = 50;

      const A = createRandomMatrix(size, size);
      const B = createRandomMatrix(size, size);

      const start = performance.now();
      const result = multiplyMatrices(A, B);
      const end = performance.now();

      const duration = end - start;

      expect(result.rows).toBe(size);
      expect(result.cols).toBe(size);
      expect(duration).toBeLessThan(20);
    });

    it('should perform matrix-vector multiply for 1000x1000 in under 50ms', () => {
      const size = 1000;

      const A = createRandomMatrix(size, size);
      const v = createRandomVector(size);

      const start = performance.now();
      const result = multiplyMatrixVector(A, v);
      const end = performance.now();

      const duration = end - start;

      expect(result.length).toBe(size);
      expect(duration).toBeLessThan(50);
    });
  });

  // ============================================================================
  // Sparse Matrix Performance
  // ============================================================================

  describe('Sparse Matrix Operations', () => {
    it('should convert COO to CSR for 1000x1000 matrix with 5% density in under 50ms', () => {
      const size = 1000;
      const density = 0.05;

      const sparse = createRandomSparseMatrix(size, size, density);

      const start = performance.now();
      const csr = cooToCSR(sparse);
      const end = performance.now();

      const duration = end - start;

      expect(csr.rows).toBe(size);
      expect(csr.cols).toBe(size);
      expect(duration).toBeLessThan(50);
    });

    it('should perform sparse matrix-vector multiply faster than dense for very sparse matrices', () => {
      const size = 1000;
      const density = 0.01; // 1% density = 99% sparsity

      // Create sparse matrix
      const sparse = createRandomSparseMatrix(size, size, density);
      const v = createRandomVector(size);

      // Create equivalent dense matrix
      const dense = sparseToDenseForTest(sparse);

      // Warmup both functions to stabilize JIT and runtime environment
      sparseMatrixVectorMultiply(sparse, v);
      multiplyMatrixVector(dense, v);

      // Time sparse multiply (10 iterations)
      const sparseStart = performance.now();
      for (let i = 0; i < 10; i++) {
        sparseMatrixVectorMultiply(sparse, v);
      }
      const sparseEnd = performance.now();
      const sparseDuration = sparseEnd - sparseStart;

      // Time dense multiply (10 iterations)
      const denseStart = performance.now();
      for (let i = 0; i < 10; i++) {
        multiplyMatrixVector(dense, v);
      }
      const denseEnd = performance.now();
      const denseDuration = denseEnd - denseStart;

      // For 1% density, sparse COO should be significantly faster
      // At 1% density, sparse only processes 10,000 entries vs 1,000,000 for dense
      expect(sparseDuration).toBeLessThan(denseDuration);
    });
  });

  // ============================================================================
  // Repeated Operations (Memory Leak Check)
  // ============================================================================

  describe('Repeated Operations', () => {
    it('should handle 1000 repeated matrix-vector multiplications without issues', () => {
      const size = 100;
      const iterations = 1000;

      const A = createRandomMatrix(size, size);
      const v = createRandomVector(size);

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        multiplyMatrixVector(A, v);
      }
      const end = performance.now();

      const duration = end - start;
      const avgDuration = duration / iterations;

      // Average operation should be under 1ms
      expect(avgDuration).toBeLessThan(1);
    });

    it('should handle 1000 repeated sparse multiplications without issues', () => {
      const size = 100;
      const density = 0.1;
      const iterations = 1000;

      const sparse = createRandomSparseMatrix(size, size, density);
      const v = createRandomVector(size);

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        sparseMatrixVectorMultiply(sparse, v);
      }
      const end = performance.now();

      const duration = end - start;
      const avgDuration = duration / iterations;

      // Average operation should be under 0.5ms for sparse
      expect(avgDuration).toBeLessThan(0.5);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a random dense matrix
 */
function createRandomMatrix(rows: number, cols: number): Matrix {
  const data = new Float64Array(rows * cols);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 10 - 5;
  }
  return { rows, cols, data };
}

/**
 * Create a random vector
 */
function createRandomVector(length: number): {
  length: number;
  data: Float64Array;
} {
  const data = new Float64Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 10 - 5;
  }
  return { length, data };
}

/**
 * Create a random sparse matrix with given density
 */
function createRandomSparseMatrix(
  rows: number,
  cols: number,
  density: number
): SparseMatrix {
  const numEntries = Math.floor(rows * cols * density);
  const entries: Array<{ row: number; col: number; value: number }> = [];
  const seen = new Set<string>();

  while (entries.length < numEntries) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const key = `${row},${col}`;

    if (!seen.has(key)) {
      seen.add(key);
      entries.push({ row, col, value: Math.random() * 10 - 5 });
    }
  }

  return { rows, cols, entries };
}

/**
 * Convert sparse to dense for comparison
 */
function sparseToDenseForTest(sparse: SparseMatrix): Matrix {
  const data = new Float64Array(sparse.rows * sparse.cols);
  for (const entry of sparse.entries) {
    data[entry.row * sparse.cols + entry.col] = entry.value;
  }
  return { rows: sparse.rows, cols: sparse.cols, data };
}
