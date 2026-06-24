import { describe, expect, it } from 'vitest';
import { cAbs, cAdd, cConj, cDiv, cMul, cPhase } from '@/engine/solver/complex';

describe('complex arithmetic', () => {
  it('adds complex numbers', () => {
    expect(cAdd({ real: 1, imag: 2 }, { real: 3, imag: 4 })).toEqual({
      real: 4,
      imag: 6,
    });
  });

  it('multiplies complex numbers', () => {
    expect(cMul({ real: 1, imag: 2 }, { real: 3, imag: 4 })).toEqual({
      real: -5,
      imag: 10,
    });
  });

  it('throws for division by zero', () => {
    expect(() =>
      cDiv({ real: 1, imag: 0 }, { real: 0, imag: 0 })
    ).toThrowWebSpiceError('INVALID_PARAMETER');
  });

  it('computes magnitude and phase', () => {
    expect(cAbs({ real: 3, imag: 4 })).toBe(5);
    expect(cPhase({ real: 0, imag: 1 })).toBeCloseTo(Math.PI / 2);
  });

  it('computes conjugate', () => {
    expect(cConj({ real: 1, imag: -2 })).toEqual({ real: 1, imag: 2 });
  });
});
