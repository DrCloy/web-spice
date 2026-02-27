import { describe, expect, it } from 'vitest';
import type { Matrix, Vector } from '@/types/circuit';
import {
  type NonlinearSystem,
  solveNewtonRaphson,
} from '@/engine/solver/newtonRaphson';

// ============================================================================
// Helper: create a simple 1D nonlinear system for testing
// ============================================================================

/** Creates a 1D system for f(x) = x² - target = 0 */
function createSquareSystem(target: number): NonlinearSystem {
  return {
    size: 1,
    residual(x: Vector): Vector {
      return { length: 1, data: new Float64Array([x.data[0] ** 2 - target]) };
    },
    jacobian(x: Vector): Matrix {
      return {
        rows: 1,
        cols: 1,
        data: new Float64Array([2 * x.data[0]]),
      };
    },
  };
}

// ============================================================================
// Input Validation
// ============================================================================

describe('solveNewtonRaphson', () => {
  describe('Input Validation', () => {
    it('should throw for null system', () => {
      const guess: Vector = { length: 1, data: new Float64Array([1]) };
      expect(() =>
        solveNewtonRaphson(null as unknown as NonlinearSystem, guess)
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'System cannot be null');
    });

    it('should throw for null initial guess', () => {
      const system = createSquareSystem(2);
      expect(() =>
        solveNewtonRaphson(system, null as unknown as Vector)
      ).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'Initial guess cannot be null'
      );
    });

    it('should throw for dimension mismatch', () => {
      const system = createSquareSystem(2); // size = 1
      const guess: Vector = { length: 2, data: new Float64Array([1, 2]) };
      expect(() => solveNewtonRaphson(system, guess)).toThrowWebSpiceError(
        'INVALID_PARAMETER',
        'dimension'
      );
    });

    it('should throw for invalid damping factor', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };
      expect(() =>
        solveNewtonRaphson(system, guess, { dampingFactor: 0 })
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'Damping factor');
      expect(() =>
        solveNewtonRaphson(system, guess, { dampingFactor: 1.5 })
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'Damping factor');
    });

    it('should throw for invalid maxIterations', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };
      expect(() =>
        solveNewtonRaphson(system, guess, { maxIterations: 0 })
      ).toThrowWebSpiceError('INVALID_PARAMETER', 'maxIterations');
    });
  });

  // ============================================================================
  // Scalar Nonlinear Equations
  // ============================================================================

  describe('Scalar Nonlinear Equations', () => {
    it('should solve x² = 2 (square root of 2)', () => {
      // f(x) = x² - 2 = 0 → x = √2
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(Math.SQRT2, 10);
      expect(result.iterations).toBeGreaterThan(0);
      expect(result.iterations).toBeLessThan(20);
    });

    it('should solve x³ - x = 0 from initial guess 0.5', () => {
      // f(x) = x³ - x = 0, roots at x = 0, ±1
      // From x₀ = 0.5, NR converges to x = -1 (large step due to f'(0.5) = -0.25)
      const system: NonlinearSystem = {
        size: 1,
        residual(x: Vector): Vector {
          const v = x.data[0];
          return { length: 1, data: new Float64Array([v ** 3 - v]) };
        },
        jacobian(x: Vector): Matrix {
          const v = x.data[0];
          return {
            rows: 1,
            cols: 1,
            data: new Float64Array([3 * v ** 2 - 1]),
          };
        },
      };
      const guess: Vector = { length: 1, data: new Float64Array([0.5]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(-1, 10);
    });

    it('should solve eˣ - 2 = 0 (natural log of 2)', () => {
      // f(x) = eˣ - 2 = 0 → x = ln(2)
      const system: NonlinearSystem = {
        size: 1,
        residual(x: Vector): Vector {
          return {
            length: 1,
            data: new Float64Array([Math.exp(x.data[0]) - 2]),
          };
        },
        jacobian(x: Vector): Matrix {
          return {
            rows: 1,
            cols: 1,
            data: new Float64Array([Math.exp(x.data[0])]),
          };
        },
      };
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(Math.LN2, 10);
    });
  });

  // ============================================================================
  // 2D Nonlinear Systems
  // ============================================================================

  describe('2D Nonlinear Systems', () => {
    it('should solve circle-line intersection (x²+y²=1, y=x)', () => {
      // F(x,y) = [x²+y²-1, y-x] = 0
      // Solution: (√2/2, √2/2)
      const system: NonlinearSystem = {
        size: 2,
        residual(x: Vector): Vector {
          const [a, b] = [x.data[0], x.data[1]];
          return {
            length: 2,
            data: new Float64Array([a ** 2 + b ** 2 - 1, b - a]),
          };
        },
        jacobian(x: Vector): Matrix {
          const [a, b] = [x.data[0], x.data[1]];
          // J = [[2x, 2y], [-1, 1]]
          return {
            rows: 2,
            cols: 2,
            data: new Float64Array([2 * a, 2 * b, -1, 1]),
          };
        },
      };
      const guess: Vector = { length: 2, data: new Float64Array([1, 1]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(Math.SQRT1_2, 10);
      expect(result.solution.data[1]).toBeCloseTo(Math.SQRT1_2, 10);
    });

    it('should solve coupled nonlinear system (x²+y=1, x+y²=1)', () => {
      // F(x,y) = [x²+y-1, x+y²-1] = 0
      // Solutions: (0,1), (1,0)
      // Note: (0.5,0.5) makes J singular (det=0), so use asymmetric guess
      const system: NonlinearSystem = {
        size: 2,
        residual(x: Vector): Vector {
          const [a, b] = [x.data[0], x.data[1]];
          return {
            length: 2,
            data: new Float64Array([a ** 2 + b - 1, a + b ** 2 - 1]),
          };
        },
        jacobian(x: Vector): Matrix {
          const [a, b] = [x.data[0], x.data[1]];
          // J = [[2x, 1], [1, 2y]]
          return {
            rows: 2,
            cols: 2,
            data: new Float64Array([2 * a, 1, 1, 2 * b]),
          };
        },
      };
      const guess: Vector = { length: 2, data: new Float64Array([0.25, 0.75]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      // By symmetry from (0.5, 0.5), could converge to either (0,1) or (1,0)
      // Both satisfy x²+y=1 and x+y²=1
      const x = result.solution.data[0];
      const y = result.solution.data[1];
      expect(x ** 2 + y).toBeCloseTo(1, 10);
      expect(x + y ** 2).toBeCloseTo(1, 10);
    });
  });

  // ============================================================================
  // Convergence Behavior
  // ============================================================================

  describe('Convergence Behavior', () => {
    it('should exhibit quadratic convergence (few iterations)', () => {
      // x² - 2 = 0 from x₀ = 1 should converge in under 10 iterations
      // due to NR's quadratic convergence rate
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.iterations).toBeLessThanOrEqual(10);
      expect(result.finalResidualNorm).toBeLessThan(1e-12);
    });

    it('should return immediately when initial guess is already a solution', () => {
      const system = createSquareSystem(4); // x² - 4 = 0
      // x = 2 is exact solution
      const guess: Vector = { length: 1, data: new Float64Array([2]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.iterations).toBe(0);
      expect(result.solution.data[0]).toBeCloseTo(2, 10);
    });
  });

  // ============================================================================
  // Damping
  // ============================================================================

  describe('Damping', () => {
    it('should converge with damping factor applied', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess, {
        dampingFactor: 0.5,
      });

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(Math.SQRT2, 10);
    });

    it('should take more iterations with damping than without', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const fullStep = solveNewtonRaphson(system, guess, {
        dampingFactor: 1.0,
      });
      const halfStep = solveNewtonRaphson(system, guess, {
        dampingFactor: 0.5,
      });

      expect(halfStep.iterations).toBeGreaterThan(fullStep.iterations);
    });
  });

  // ============================================================================
  // Non-convergence and Error Cases
  // ============================================================================

  describe('Non-convergence and Error Cases', () => {
    it('should throw CONVERGENCE_FAILED when maxIterations exceeded', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      // 2 iterations is not enough to converge to 1e-12 tolerance
      expect(() =>
        solveNewtonRaphson(system, guess, { maxIterations: 2 })
      ).toThrowWebSpiceError('CONVERGENCE_FAILED', 'did not converge');
    });

    it('should throw CONVERGENCE_FAILED when Jacobian is singular', () => {
      // f(x) = x² at x = 0: Jacobian = 2x = 0 → singular
      // LU decomposition fails → caught and re-thrown as CONVERGENCE_FAILED
      const system: NonlinearSystem = {
        size: 1,
        residual(x: Vector): Vector {
          return { length: 1, data: new Float64Array([x.data[0] ** 2]) };
        },
        jacobian(): Matrix {
          // Always returns 0, making it singular
          return { rows: 1, cols: 1, data: new Float64Array([0]) };
        },
      };
      const guess: Vector = { length: 1, data: new Float64Array([0.5]) };

      expect(() => solveNewtonRaphson(system, guess)).toThrowWebSpiceError(
        'CONVERGENCE_FAILED',
        'singular Jacobian'
      );
    });

    it('should throw CONVERGENCE_FAILED for system with no real solution', () => {
      // f(x) = x² + 1 = 0 has no real roots
      // NR: x₀=1 → x₁=0 → J(0)=0 → singular Jacobian
      const system: NonlinearSystem = {
        size: 1,
        residual(x: Vector): Vector {
          return {
            length: 1,
            data: new Float64Array([x.data[0] ** 2 + 1]),
          };
        },
        jacobian(x: Vector): Matrix {
          return {
            rows: 1,
            cols: 1,
            data: new Float64Array([2 * x.data[0]]),
          };
        },
      };
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      expect(() =>
        solveNewtonRaphson(system, guess, { maxIterations: 50 })
      ).toThrowWebSpiceError('CONVERGENCE_FAILED', 'singular Jacobian');
    });
  });

  // ============================================================================
  // Boundary Values
  // ============================================================================

  describe('Relative Tolerance', () => {
    it('should use per-element relative tolerance for update convergence', () => {
      // x² = 1e12, solution x = 1e6
      // With reltol=1e-3, update threshold near solution ≈ 1e-3 × 1e6 = 1000
      // This is much more lenient than abstol alone (1e-12)
      const system = createSquareSystem(1e12);
      const guess: Vector = { length: 1, data: new Float64Array([1e5]) };

      const withReltol = solveNewtonRaphson(system, guess, {
        relativeTolerance: 1e-3,
      });
      const withoutReltol = solveNewtonRaphson(system, guess, {
        relativeTolerance: 0,
      });

      expect(withReltol.converged).toBe(true);
      expect(withoutReltol.converged).toBe(true);
      // Both converge, but the final update norm can differ
      // because reltol relaxes the per-element update check
      expect(withReltol.solution.data[0]).toBeCloseTo(1e6, 0);
      expect(withoutReltol.solution.data[0]).toBeCloseTo(1e6, 0);
    });

    it('should converge with reltol=0 (absolute tolerance only)', () => {
      const system = createSquareSystem(2);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess, {
        relativeTolerance: 0,
      });

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(Math.SQRT2, 10);
    });
  });

  describe('Boundary Values', () => {
    it('should solve for very small solution (x² = 1e-20)', () => {
      const system = createSquareSystem(1e-20);
      const guess: Vector = { length: 1, data: new Float64Array([1]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(1e-10, 15);
    });

    it('should solve for very large solution (x² = 1e12)', () => {
      const system = createSquareSystem(1e12);
      const guess: Vector = { length: 1, data: new Float64Array([1e5]) };

      const result = solveNewtonRaphson(system, guess);

      expect(result.converged).toBe(true);
      expect(result.solution.data[0]).toBeCloseTo(1e6, 0);
    });
  });
});
