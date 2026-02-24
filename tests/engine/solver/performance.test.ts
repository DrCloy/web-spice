import { describe, expect, it } from 'vitest';
import {
  luDecompose,
  luInverse,
  luSolve,
  solveLinearSystem,
} from '@/engine/solver/luDecomposition';
import {
  cooToCSR,
  multiplyMatrices,
  multiplyMatrixVector,
  sparseMatrixVectorMultiply,
} from '@/engine/solver/matrix';
import type { Matrix, SparseMatrix, Vector } from '@/types/circuit';

/**
 * Performance benchmarks for matrix operations
 *
 * These tests verify that matrix operations meet minimum performance requirements
 * for practical circuit simulation use cases.
 *
 * Skipped by default to avoid flaky CI failures.
 * Run with: npm run test:bench
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
  // LU Decomposition Performance
  // ============================================================================

  describe('LU Decomposition', () => {
    it('should decompose 100x100 matrix in under 50ms', () => {
      const A = createDiagonallyDominantMatrix(100);

      // Warmup
      luDecompose(A);

      const start = performance.now();
      const lu = luDecompose(A);
      const elapsed = performance.now() - start;

      expect(lu.singular).toBe(false);
      expect(elapsed).toBeLessThan(50);
    });

    it('should solve 100x100 system (decompose + solve) in under 50ms', () => {
      const n = 100;
      const A = createDiagonallyDominantMatrix(n);
      const b = createRandomVector(n);

      // Warmup
      solveLinearSystem(A, b);

      const start = performance.now();
      const x = solveLinearSystem(A, b);
      const elapsed = performance.now() - start;

      expect(x.length).toBe(n);
      expect(elapsed).toBeLessThan(50);
    });

    it('should reuse LU factorization for multiple RHS faster than re-decomposing', () => {
      const n = 50;
      const numRHS = 10;
      const A = createDiagonallyDominantMatrix(n);
      const vectors: Vector[] = [];
      for (let i = 0; i < numRHS; i++) {
        vectors.push(createRandomVector(n));
      }

      // Warmup
      const luWarmup = luDecompose(A);
      luSolve(luWarmup, vectors[0]);
      solveLinearSystem(A, vectors[0]);

      // Approach 1: decompose once, solve many
      const start1 = performance.now();
      const lu = luDecompose(A);
      for (const v of vectors) {
        luSolve(lu, v);
      }
      const elapsed1 = performance.now() - start1;

      // Approach 2: decompose each time
      const start2 = performance.now();
      for (const v of vectors) {
        solveLinearSystem(A, v);
      }
      const elapsed2 = performance.now() - start2;

      // Reuse should be faster
      expect(elapsed1).toBeLessThan(elapsed2);
    });

    it('should compute inverse of 50x50 matrix in under 50ms', () => {
      const A = createDiagonallyDominantMatrix(50);
      const lu = luDecompose(A);

      // Warmup
      luInverse(lu);

      const start = performance.now();
      const inv = luInverse(lu);
      const elapsed = performance.now() - start;

      expect(inv.rows).toBe(50);
      expect(elapsed).toBeLessThan(50);
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
 * Create a diagonally dominant (non-singular) matrix for LU benchmarks
 */
function createDiagonallyDominantMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      data[i * size + j] = i === j ? size + 1 : 1;
    }
  }
  return { rows: size, cols: size, data };
}

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
