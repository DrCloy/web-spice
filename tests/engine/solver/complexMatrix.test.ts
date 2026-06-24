import { describe, expect, it } from 'vitest';
import {
  createComplexMatrix,
  createComplexVector,
  solveComplexLinearSystem,
} from '@/engine/solver/complexMatrix';

describe('solveComplexLinearSystem', () => {
  it('solves a known 2x2 complex system', () => {
    const A = createComplexMatrix(2);
    A.data = [
      { real: 2, imag: 1 },
      { real: 1, imag: 0 },
      { real: 1, imag: 0 },
      { real: 1, imag: -1 },
    ];

    const b = createComplexVector(2);
    b.data = [
      { real: 5, imag: 0 },
      { real: 3, imag: 0 },
    ];

    const x = solveComplexLinearSystem(A, b);

    expect(x.data[0].real).toBeCloseTo(1.8, 10);
    expect(x.data[0].imag).toBeCloseTo(-1.6, 10);
    expect(x.data[1].real).toBeCloseTo(-0.2, 10);
    expect(x.data[1].imag).toBeCloseTo(1.4, 10);
  });

  it('throws for a singular matrix', () => {
    const A = createComplexMatrix(2);
    A.data = [
      { real: 1, imag: 0 },
      { real: 2, imag: 0 },
      { real: 2, imag: 0 },
      { real: 4, imag: 0 },
    ];

    const b = createComplexVector(2);
    b.data = [
      { real: 1, imag: 0 },
      { real: 2, imag: 0 },
    ];

    expect(() => solveComplexLinearSystem(A, b)).toThrowWebSpiceError(
      'SINGULAR_MATRIX'
    );
  });

  it('solves a 1x1 system', () => {
    const A = createComplexMatrix(1);
    A.data[0] = { real: 3, imag: 0 };

    const b = createComplexVector(1);
    b.data[0] = { real: 6, imag: 0 };

    const x = solveComplexLinearSystem(A, b);

    expect(x.data[0].real).toBeCloseTo(2);
    expect(x.data[0].imag).toBeCloseTo(0);
  });
});
