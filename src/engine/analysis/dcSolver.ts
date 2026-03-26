import type { Circuit, Vector } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type { ComponentId, NodeId } from '@/types/component';
import type { SolverOptions } from '@/types/simulation';
import { solveLinearSystem } from '@/engine/solver/luDecomposition';
import {
  buildMNASystem,
  buildNodeIndexMap,
  extractResults,
} from '@/engine/solver/mnaAssembler';

/**
 * Solve for a single DC operating point.
 */
export function solveOperatingPoint(
  circuit: Circuit,
  options?: Partial<SolverOptions>
): {
  nodeVoltages: Record<NodeId, number>;
  branchCurrents: Record<ComponentId, number>;
  componentPowers: Record<ComponentId, number>;
} {
  const map = buildNodeIndexMap(circuit);

  if (map.systemSize === 0) {
    return {
      nodeVoltages: { [circuit.groundNodeId]: 0 },
      branchCurrents: {},
      componentPowers: {},
    };
  }

  const { A, b } = buildMNASystem(circuit, map);

  let solution: Vector;
  try {
    solution = solveLinearSystem(A, b, options);
  } catch (error) {
    if (error instanceof WebSpiceError && error.code === 'SINGULAR_MATRIX') {
      throw new WebSpiceError(
        'SINGULAR_MATRIX',
        'Circuit produces a singular matrix. Check for parallel voltage sources, loops with only voltage sources, or disconnected sub-circuits.'
      );
    }
    throw error;
  }

  return extractResults(solution, circuit, map);
}
