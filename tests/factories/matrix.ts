/**
 * Matrix factory functions for testing
 * These functions create test matrices for numerical algorithm testing
 */

import type { Matrix, Vector } from '@/types/circuit';

/**
 * Creates a test matrix with specified dimensions and optional data
 *
 * @example
 * const matrix = createTestMatrix({ rows: 3, cols: 3, data: [1,0,0, 0,1,0, 0,0,1] });
 */
export function createTestMatrix(params: {
  rows: number;
  cols: number;
  data?: number[];
}): Matrix {
  const { rows, cols, data } = params;

  // Use provided data or create zero matrix
  const matrixData = data
    ? new Float64Array(data)
    : new Float64Array(rows * cols);

  return {
    rows,
    cols,
    data: matrixData,
  };
}

/**
 * Creates an identity matrix of specified size
 *
 * @example
 * const identity = createIdentityMatrix(3);
 * // [[1, 0, 0],
 * //  [0, 1, 0],
 * //  [0, 0, 1]]
 */
export function createIdentityMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    data[i * size + i] = 1;
  }

  return {
    rows: size,
    cols: size,
    data,
  };
}

/**
 * Creates a diagonal matrix with specified values
 *
 * @example
 * const diagonal = createDiagonalMatrix([1, 2, 3]);
 * // [[1, 0, 0],
 * //  [0, 2, 0],
 * //  [0, 0, 3]]
 */
export function createDiagonalMatrix(values: number[]): Matrix {
  const size = values.length;
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    data[i * size + i] = values[i];
  }

  return {
    rows: size,
    cols: size,
    data,
  };
}

/**
 * Creates a symmetric matrix for testing
 *
 * @example
 * const symmetric = createSymmetricMatrix([
 *   [1, 2, 3],
 *   [2, 4, 5],
 *   [3, 5, 6]
 * ]);
 */
export function createSymmetricMatrix(values: number[][]): Matrix {
  const size = values.length;
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      data[i * size + j] = values[i][j];
    }
  }

  return {
    rows: size,
    cols: size,
    data,
  };
}

/**
 * Creates a test vector with specified length and optional data
 *
 * @example
 * const vector = createTestVector({ length: 3, data: [1, 2, 3] });
 */
export function createTestVector(params: {
  length: number;
  data?: number[];
}): Vector {
  const { length, data } = params;

  // Use provided data or create zero vector
  const vectorData = data ? new Float64Array(data) : new Float64Array(length);

  return {
    length,
    data: vectorData,
  };
}

/**
 * Creates a zero vector of specified length
 *
 * @example
 * const zeros = createZeroVector(5);
 */
export function createZeroVector(length: number): Vector {
  return {
    length,
    data: new Float64Array(length),
  };
}

/**
 * Creates a vector filled with ones
 *
 * @example
 * const ones = createOnesVector(5);
 */
export function createOnesVector(length: number): Vector {
  const data = new Float64Array(length);
  data.fill(1);

  return {
    length,
    data,
  };
}

/**
 * Creates a diagonally dominant (well-conditioned, non-singular) matrix.
 * A[i][i] = size + 1, A[i][j] = 1 for i != j.
 *
 * @example
 * const A = createDiagonallyDominantMatrix(3);
 * // [[4, 1, 1], [1, 4, 1], [1, 1, 4]]
 */
export function createDiagonallyDominantMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      data[i * size + j] = i === j ? size + 1 : 1;
    }
  }
  return { rows: size, cols: size, data };
}

/**
 * Creates a singular matrix (linearly dependent rows)
 *
 * @example
 * const singular = createSingularMatrix(3);
 * // Row 2 = Row 0 + Row 1
 */
export function createSingularMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      data[i * size + j] = i + j + 1;
    }
  }

  // Make last row = sum of all other rows (linearly dependent)
  for (let j = 0; j < size; j++) {
    let sum = 0;
    for (let i = 0; i < size - 1; i++) {
      sum += data[i * size + j];
    }
    data[(size - 1) * size + j] = sum;
  }

  return { rows: size, cols: size, data };
}

/**
 * Creates a Hilbert matrix (notoriously ill-conditioned)
 * H[i][j] = 1 / (i + j + 1)
 *
 * @example
 * const hilbert = createHilbertMatrix(3);
 * // [[1, 1/2, 1/3],
 * //  [1/2, 1/3, 1/4],
 * //  [1/3, 1/4, 1/5]]
 */
export function createHilbertMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      data[i * size + j] = 1 / (i + j + 1);
    }
  }

  return { rows: size, cols: size, data };
}

/**
 * Creates a well-conditioned matrix for testing numerical stability.
 * This creates a symmetric positive definite matrix using A = B^T * B.
 *
 * WARNING: This produces singular matrices for size >= 3 (rank-2).
 * Use createDiagonallyDominantMatrix instead for reliable non-singular matrices.
 *
 * @example
 * const wellConditioned = createWellConditionedMatrix(2);
 */
export function createWellConditionedMatrix(size: number): Matrix {
  const data = new Float64Array(size * size);

  // Create a symmetric positive definite matrix
  // A = B^T * B where B is random
  const temp = new Float64Array(size * size);

  // Fill with simple values that ensure positive definiteness
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      temp[i * size + j] = i + j + 1;
    }
  }

  // Multiply B^T * B
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      let sum = 0;
      for (let k = 0; k < size; k++) {
        sum += temp[k * size + i] * temp[k * size + j];
      }
      data[i * size + j] = sum;
    }
  }

  return {
    rows: size,
    cols: size,
    data,
  };
}
