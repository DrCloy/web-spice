import type { Circuit } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type { ComponentId } from '@/types/component';
import type { DCSweepConfig, SolverOptions } from '@/types/simulation';
import { solveOperatingPoint } from '@/engine/analysis/dcSolver';

/**
 * Run a DC sweep by varying a source value across a range and solving
 * the operating point at each step.
 */
export function runDCSweep(
  circuit: Circuit,
  sweep: DCSweepConfig,
  options?: Partial<SolverOptions>
): {
  sourceType: 'voltage_source' | 'current_source';
  sweepValues: number[];
  operatingPoints: ReturnType<typeof solveOperatingPoint>[];
} {
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
  if ('sourceType' in sweepSource && sweepSource.sourceType !== 'dc') {
    throw new WebSpiceError(
      'UNSUPPORTED_ANALYSIS',
      `DC sweep source '${sweep.sourceId}' must be a DC source, got '${sweepSource.sourceType}'`
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

  return { sourceType, sweepValues, operatingPoints };
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
      return comp;
    }),
  };
}
