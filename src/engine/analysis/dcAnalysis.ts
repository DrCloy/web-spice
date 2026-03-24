/**
 * DC Analysis Engine for WebSpice
 *
 * Implements Modified Nodal Analysis (MNA) to compute DC operating points.
 *
 * @module engine/analysis/dcAnalysis
 */

import type { Circuit, Vector } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type { ComponentId, NodeId } from '@/types/component';
import type {
  DCAnalysisConfig,
  DCAnalysisResult,
  SolverOptions,
} from '@/types/simulation';
import { solveLinearSystem } from '@/engine/solver/luDecomposition';
import { validateCircuitStructure } from '@/engine/circuit';
import {
  buildMNASystem,
  buildNodeIndexMap,
  extractResults,
} from '@/engine/analysis/mnaAssembler';

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

  // If no sweep config, return single operating point
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

  // DC sweep: vary source value and solve at each step
  const sweep = config.sweep;
  const sweepSource = circuit.components.find(c => c.id === sweep.sourceId);

  if (!sweepSource) {
    throw new WebSpiceError(
      'COMPONENT_NOT_FOUND',
      `DC sweep source '${sweep.sourceId}' not found in circuit`
    );
  }
  if (
    sweepSource.type !== 'voltage_source' &&
    sweepSource.type !== 'current_source'
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `DC sweep source '${sweep.sourceId}' must be a voltage or current source, got '${sweepSource.type}'`
    );
  }
  const sourceType: 'voltage_source' | 'current_source' = sweepSource.type;
  const sweepValues = generateSweepValues(
    sweep.startValue,
    sweep.endValue,
    sweep.stepValue
  );
  const operatingPoints = sweepValues.map(value => {
    const modifiedCircuit = applySourceValue(circuit, sweep.sourceId, value);
    return solveOperatingPoint(modifiedCircuit, options);
  });

  return {
    type: 'dc',
    operatingPoint,
    sweep: { sourceType, sweepValues, operatingPoints },
    convergenceInfo: {
      converged: true,
      iterations: 1,
      maxIterations: 1,
      tolerance: 0,
      finalError: 0,
    },
  };
}

// ============================================================================
// Operating Point & Sweep Helpers
// ============================================================================

/**
 * Solve for a single DC operating point.
 * Extracted from analyzeDC to allow reuse in sweep mode.
 */
function solveOperatingPoint(
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

/**
 * Generate an array of sweep values from start to end with given step.
 * Always includes startValue; includes endValue if the range is evenly divisible.
 */
function generateSweepValues(
  start: number,
  end: number,
  step: number
): number[] {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Sweep startValue and endValue must be finite numbers`
    );
  }
  if (!Number.isFinite(step) || step <= 0) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Sweep stepValue must be a positive finite number, got ${step}`
    );
  }

  const values: number[] = [];
  const direction = start <= end ? 1 : -1;
  const signedStep = step * direction;
  const count = Math.floor(Math.abs(end - start) / step + 1 + 1e-12);

  for (let i = 0; i < count; i++) {
    values.push(start + i * signedStep);
  }
  return values;
}

/**
 * Create a shallow copy of the circuit with one source's value changed.
 * Used by DC sweep to vary the sweep source at each step.
 *
 * @throws {WebSpiceError} INVALID_PARAMETER if sourceId does not match a voltage or current source
 */
function applySourceValue(
  circuit: Circuit,
  sourceId: ComponentId,
  value: number
): Circuit {
  const target = circuit.components.find(c => c.id === sourceId);

  if (
    !target ||
    (target.type !== 'voltage_source' && target.type !== 'current_source')
  ) {
    throw new WebSpiceError(
      'INVALID_PARAMETER',
      `Sweep sourceId '${sourceId}' does not match any voltage or current source in the circuit`
    );
  }

  // Explicitly enumerate Circuit interface properties instead of using spread,
  // because circuit may be a CircuitImpl class instance whose prototype getters
  // (id, name, groundNodeId, etc.) are not copied by object spread.
  return {
    id: circuit.id,
    name: circuit.name,
    description: circuit.description,
    groundNodeId: circuit.groundNodeId,
    nodes: circuit.nodes,
    components: circuit.components.map(comp => {
      if (comp.id !== sourceId) return comp;
      // Explicitly enumerate interface properties instead of spreading, because
      // comp may be a class instance whose prototype getters are not own properties.
      if (comp.type === 'voltage_source' && comp.sourceType === 'dc') {
        return {
          id: comp.id,
          type: comp.type,
          sourceType: comp.sourceType,
          name: comp.name,
          terminals: comp.terminals,
          voltage: value,
        };
      }
      if (comp.type === 'current_source' && comp.sourceType === 'dc') {
        return {
          id: comp.id,
          type: comp.type,
          sourceType: comp.sourceType,
          name: comp.name,
          terminals: comp.terminals,
          current: value,
        };
      }
      return comp; // non-source components (resistor, ground, etc.) are returned as-is
    }),
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a circuit is suitable for DC analysis.
 * Checks: empty circuit, missing ground, floating nodes,
 * and unsupported component types (capacitor, inductor, etc.).
 */
function validateCircuitForDC(circuit: Circuit): void {
  const structuralErrors = validateCircuitStructure(circuit);
  if (structuralErrors.length > 0) {
    throw structuralErrors[0];
  }

  for (const component of circuit.components) {
    switch (component.type) {
      case 'resistor':
      case 'ground':
        break;
      case 'voltage_source':
      case 'current_source':
        if ('sourceType' in component && component.sourceType !== 'dc') {
          throw new WebSpiceError(
            'UNSUPPORTED_ANALYSIS',
            `AC ${component.type} '${component.id}' is not supported in DC analysis`
          );
        }
        break;
      default:
        throw new WebSpiceError(
          'UNSUPPORTED_ANALYSIS',
          `Component type '${component.type}' is not supported in DC analysis`
        );
    }
  }
}
