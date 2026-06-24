import { WebSpiceError } from '@/types/circuit';
import type { Complex } from '@/types/component';

export const C_ZERO: Complex = { real: 0, imag: 0 };
export const C_ONE: Complex = { real: 1, imag: 0 };

export function cAdd(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

export function cSub(a: Complex, b: Complex): Complex {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}

export function cMul(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

export function cDiv(a: Complex, b: Complex): Complex {
  const denominator = b.real * b.real + b.imag * b.imag;
  if (denominator === 0) {
    throw new WebSpiceError('INVALID_PARAMETER', 'Division by zero');
  }

  return {
    real: (a.real * b.real + a.imag * b.imag) / denominator,
    imag: (a.imag * b.real - a.real * b.imag) / denominator,
  };
}

export function cAbs(a: Complex): number {
  return Math.hypot(a.real, a.imag);
}

export function cPhase(a: Complex): number {
  return Math.atan2(a.imag, a.real);
}

export function cConj(a: Complex): Complex {
  return { real: a.real, imag: -a.imag };
}

export function cNeg(a: Complex): Complex {
  return { real: -a.real, imag: -a.imag };
}
