/**
 * DC Analysis Engine for WebSpice
 *
 * Implements Modified Nodal Analysis (MNA) to compute DC operating points.
 *
 * @module engine/analysis/dcAnalysis
 */

import type { Circuit } from '@/types/circuit';
import type {
  DCAnalysisConfig,
  DCAnalysisResult,
  SolverOptions,
} from '@/types/simulation';
import { validateCircuitForDC } from '@/engine/analysis/dcValidation';
import { solveOperatingPoint } from '@/engine/analysis/dcSolver';
import { runDCSweep } from '@/engine/analysis/dcSweep';

/**
 * Perform DC operating point analysis on a circuit.
 */
export function analyzeDC(
  circuit: Circuit,
  config?: DCAnalysisConfig,
  options?: Partial<SolverOptions>
): DCAnalysisResult {
  validateCircuitForDC(circuit);

  const operatingPoint = solveOperatingPoint(circuit, options);

  if (!config?.sweep) {
    return {
      type: 'dc',
      operatingPoint,
      convergenceInfo: {
        converged: true,
        iterations: 1,
        maxIterations: 1,
        tolerance: 0,
        finalError: 0,
      },
    };
  }

  const sweep = runDCSweep(circuit, config.sweep, options);

  return {
    type: 'dc',
    operatingPoint,
    sweep,
    convergenceInfo: {
      converged: true,
      iterations: 1,
      maxIterations: 1,
      tolerance: 0,
      finalError: 0,
    },
  };
}
