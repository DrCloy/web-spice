import { WebSpiceError } from '@/types/circuit';
import type { Complex } from '@/types/component';
import { C_ZERO, cAbs, cDiv, cMul, cSub } from '@/engine/solver/complex';

export interface ComplexMatrix {
  rows: number;
  cols: number;
  data: Complex[];
}

export interface ComplexVector {
  length: number;
  data: Complex[];
}

export function createComplexMatrix(n: number): ComplexMatrix {
  return {
    rows: n,
    cols: n,
    data: Array.from({ length: n * n }, () => ({ ...C_ZERO })),
  };
}

export function createComplexVector(n: number): ComplexVector {
  return {
    length: n,
    data: Array.from({ length: n }, () => ({ ...C_ZERO })),
  };
}

export function solveComplexLinearSystem(
  A: ComplexMatrix,
  b: ComplexVector
): ComplexVector {
  if (A.rows !== A.cols || A.rows !== b.length) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Matrix dimensions must match vector length'
    );
  }

  const n = A.rows;
  const data = A.data.map(value => ({ ...value }));
  const rhs = b.data.map(value => ({ ...value }));
  const pivotTolerance = 1e-12;

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotMagnitude = cAbs(data[col * n + col]);

    for (let row = col + 1; row < n; row++) {
      const magnitude = cAbs(data[row * n + col]);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }

    if (pivotMagnitude < pivotTolerance) {
      throw new WebSpiceError(
        'SINGULAR_MATRIX',
        'Complex matrix is singular or near-singular'
      );
    }

    if (pivotRow !== col) {
      for (let j = col; j < n; j++) {
        const tmp = data[col * n + j];
        data[col * n + j] = data[pivotRow * n + j];
        data[pivotRow * n + j] = tmp;
      }
      const rhsTmp = rhs[col];
      rhs[col] = rhs[pivotRow];
      rhs[pivotRow] = rhsTmp;
    }

    const pivot = data[col * n + col];
    for (let row = col + 1; row < n; row++) {
      const factor = cDiv(data[row * n + col], pivot);
      data[row * n + col] = { ...C_ZERO };

      for (let j = col + 1; j < n; j++) {
        data[row * n + j] = cSub(
          data[row * n + j],
          cMul(factor, data[col * n + j])
        );
      }
      rhs[row] = cSub(rhs[row], cMul(factor, rhs[col]));
    }
  }

  const x = createComplexVector(n);
  for (let row = n - 1; row >= 0; row--) {
    let sum = { ...rhs[row] };
    for (let col = row + 1; col < n; col++) {
      sum = cSub(sum, cMul(data[row * n + col], x.data[col]));
    }
    x.data[row] = cDiv(sum, data[row * n + row]);
  }

  return x;
}
