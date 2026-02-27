/**
 * Newton-Raphson Iterative Solver for WebSpice
 *
 * Solves nonlinear systems F(x) = 0 using Newton-Raphson iteration.
 * Each iteration linearizes the system and solves J(x)·Δx = -F(x)
 * using LU decomposition.
 *
 * @module engine/solver/newtonRaphson
 */

import type { Matrix, Vector } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import { solveLinearSystem } from '@/engine/solver/luDecomposition';
import { negateVector, normInfinity } from '@/engine/solver/matrix';

// ============================================================================
// Types
// ============================================================================

/** Defines a nonlinear system F(x) = 0 to be solved */
export interface NonlinearSystem {
  /** Evaluate residual vector F(x) */
  residual(x: Vector): Vector;
  /** Evaluate Jacobian matrix J(x) = dF/dx */
  jacobian(x: Vector): Matrix;
  /** System dimension */
  size: number;
}

/** Options for Newton-Raphson solver */
export interface NewtonRaphsonOptions {
  maxIterations: number;
  absoluteTolerance: number;
  relativeTolerance: number;
  dampingFactor: number;
}

/** Result of Newton-Raphson solve */
export interface NewtonRaphsonResult {
  solution: Vector;
  converged: boolean;
  iterations: number;
  finalResidualNorm: number;
  finalUpdateNorm: number;
}

/** Default Newton-Raphson options */
export const DEFAULT_NR_OPTIONS: NewtonRaphsonOptions = {
  maxIterations: 100,
  absoluteTolerance: 1e-12,
  relativeTolerance: 1e-3,
  dampingFactor: 1.0,
};

// ============================================================================
// Solver
// ============================================================================

/**
 * Solve a nonlinear system F(x) = 0 using Newton-Raphson iteration.
 *
 * Each iteration linearizes the system at the current estimate xₖ,
 * solves J(xₖ)·Δx = -F(xₖ) via LU decomposition, and updates
 * xₖ₊₁ = xₖ + α·Δx where α is the damping factor.
 *
 * Convergence requires both conditions to be met:
 * - Update: ∀i, |Δxᵢ| < absoluteTolerance + relativeTolerance × |xᵢ|
 * - Residual: ‖F(x)‖∞ < absoluteTolerance
 *
 * @param system - Nonlinear system providing residual and Jacobian evaluations.
 * @param initialGuess - Initial estimate of the solution vector x.
 * @param options - Optional solver configuration; unspecified fields
 *   fall back to {@link DEFAULT_NR_OPTIONS}.
 * @returns The {@link NewtonRaphsonResult} containing the solution,
 *   convergence status, iteration count, and residual/update norms.
 * @throws {WebSpiceError} `INVALID_PARAMETER` if system or initialGuess is
 *   null/undefined, dimensions mismatch, or options are out of range.
 * @throws {WebSpiceError} `CONVERGENCE_FAILED` if the solver does not converge
 *   within maxIterations or encounters a singular Jacobian.
 */
export function solveNewtonRaphson(
  system: NonlinearSystem,
  initialGuess: Vector,
  options?: Partial<NewtonRaphsonOptions>
): NewtonRaphsonResult {
  // --- Input validation ---
  if (!system) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'System cannot be null or undefined'
    );
  }
  if (!initialGuess) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Initial guess cannot be null or undefined'
    );
  }
  if (initialGuess.length !== system.size) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Initial guess dimension (${initialGuess.length}) must match system size (${system.size})`
    );
  }

  const opts = { ...DEFAULT_NR_OPTIONS, ...options };

  if (
    !Number.isFinite(opts.dampingFactor) ||
    opts.dampingFactor <= 0 ||
    opts.dampingFactor > 1
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'Damping factor must be a finite number in range (0, 1]'
    );
  }
  if (!Number.isFinite(opts.absoluteTolerance) || opts.absoluteTolerance < 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'absoluteTolerance must be a finite, non-negative number'
    );
  }
  if (!Number.isFinite(opts.relativeTolerance) || opts.relativeTolerance < 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'relativeTolerance must be a finite, non-negative number'
    );
  }
  if (
    !Number.isFinite(opts.maxIterations) ||
    !Number.isInteger(opts.maxIterations) ||
    opts.maxIterations <= 0
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      'maxIterations must be a finite, positive integer'
    );
  }

  // --- NR iteration ---
  const n = system.size;
  const x: Vector = { length: n, data: new Float64Array(initialGuess.data) };

  let F = system.residual(x);
  let residualNorm = normInfinity(F);

  // Already at solution before any iteration
  if (residualNorm < opts.absoluteTolerance) {
    return {
      solution: x,
      converged: true,
      iterations: 0,
      finalResidualNorm: residualNorm,
      finalUpdateNorm: 0,
    };
  }

  let finalUpdateNorm = 0;

  for (let iter = 0; iter < opts.maxIterations; iter++) {
    // Build and solve J·Δx = -F
    const J = system.jacobian(x);
    const negF = negateVector(F);

    let delta: Vector;
    try {
      delta = solveLinearSystem(J, negF);
    } catch (error) {
      if (error instanceof WebSpiceError && error.code === 'SINGULAR_MATRIX') {
        throw new WebSpiceError(
          'CONVERGENCE_FAILED',
          `Newton-Raphson failed: singular Jacobian at iteration ${iter + 1}`
        );
      }
      throw error;
    }

    // Apply damping: x += α·Δx
    // Check per-element update convergence: |Δxᵢ| < abstol + reltol × |xᵢ|
    finalUpdateNorm = 0;
    let updateConverged = true;
    for (let i = 0; i < n; i++) {
      const oldXi = x.data[i];
      const step = opts.dampingFactor * delta.data[i];
      x.data[i] = oldXi + step;
      const absStep = Math.abs(step);
      if (absStep > finalUpdateNorm) finalUpdateNorm = absStep;
      const threshold =
        opts.absoluteTolerance + opts.relativeTolerance * Math.abs(oldXi);
      if (absStep >= threshold) updateConverged = false;
    }

    // Recompute residual at updated x (carried forward to next iteration)
    F = system.residual(x);
    residualNorm = normInfinity(F);

    // Convergence: update within tolerance AND residual is small
    if (updateConverged && residualNorm < opts.absoluteTolerance) {
      return {
        solution: x,
        converged: true,
        iterations: iter + 1,
        finalResidualNorm: residualNorm,
        finalUpdateNorm,
      };
    }
  }

  throw new WebSpiceError(
    'CONVERGENCE_FAILED',
    `Newton-Raphson did not converge after ${opts.maxIterations} iterations (residual: ${residualNorm.toExponential(3)}, update: ${finalUpdateNorm.toExponential(3)})`
  );
}
