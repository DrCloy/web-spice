/**
 * DC Analysis Engine for WebSpice
 *
 * Implements Modified Nodal Analysis (MNA) to compute DC operating points.
 *
 * @module engine/analysis/dcAnalysis
 */

import type { Circuit, Matrix, Vector } from '@/types/circuit';
import { WebSpiceError } from '@/types/circuit';
import type {
  ComponentId,
  DCCurrentSource,
  DCVoltageSource,
  NodeId,
  Resistor,
} from '@/types/component';
import type {
  DCAnalysisConfig,
  DCAnalysisResult,
  SolverOptions,
} from '@/types/simulation';
import { solveLinearSystem } from '@/engine/solver/luDecomposition';

// ============================================================================
// Types
// ============================================================================

/** Maps node IDs to matrix indices and tracks system dimensions */
interface NodeIndexMap {
  nodeToIndex: Map<NodeId, number>;
  indexToNode: NodeId[];
  numNodes: number;
  numVoltageSources: number;
  systemSize: number;
  voltageSourceIds: ComponentId[];
}

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
      'INVALID_PARAMETER',
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
        'Circuit produces a singular matrix. Check for parallel voltage sources, loops with only voltage sources, or disconnected subcircuits.'
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
      if (comp.type === 'voltage_source') {
        const vs = comp as DCVoltageSource;
        return {
          id: vs.id,
          type: vs.type,
          sourceType: vs.sourceType,
          name: vs.name,
          terminals: vs.terminals,
          voltage: value,
        } as DCVoltageSource;
      }
      const cs = comp as DCCurrentSource;
      return {
        id: cs.id,
        type: cs.type,
        sourceType: cs.sourceType,
        name: cs.name,
        terminals: cs.terminals,
        current: value,
      } as DCCurrentSource;
    }),
  };
}

// ============================================================================
// MNA System Construction
// ============================================================================

/**
 * Build the MNA matrix A and RHS vector b from circuit components.
 */
function buildMNASystem(
  circuit: Circuit,
  map: NodeIndexMap
): { A: Matrix; b: Vector } {
  const n = map.systemSize;
  const A: Matrix = { rows: n, cols: n, data: new Float64Array(n * n) };
  const b: Vector = { length: n, data: new Float64Array(n) };

  let vsIndex = 0;
  for (const component of circuit.components) {
    switch (component.type) {
      case 'resistor':
        stampResistor(A, component as Resistor, map);
        break;
      case 'voltage_source':
        stampVoltageSource(A, b, component as DCVoltageSource, map, vsIndex);
        vsIndex++;
        break;
      case 'current_source':
        stampCurrentSource(b, component as DCCurrentSource, map);
        break;
    }
  }

  return { A, b };
}

/**
 * Stamp a resistor into the conductance matrix.
 * For resistor between nodes p and q with conductance G = 1/R:
 *   G[p,p] += G, G[q,q] += G, G[p,q] -= G, G[q,p] -= G
 * Ground node entries are skipped (no row/column in matrix).
 */
function stampResistor(A: Matrix, comp: Resistor, map: NodeIndexMap): void {
  const n = A.cols;
  const G = 1 / comp.resistance;
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);

  if (p !== undefined) {
    A.data[p * n + p] += G;
    if (q !== undefined) {
      A.data[p * n + q] -= G;
    }
  }
  if (q !== undefined) {
    A.data[q * n + q] += G;
    if (p !== undefined) {
      A.data[q * n + p] -= G;
    }
  }
}

/**
 * Stamp a DC voltage source into the MNA system.
 * For voltage source with positive terminal p, negative terminal q, index k:
 *   B[p,k] += 1, B[q,k] -= 1  (node rows, VS column)
 *   C[k,p] += 1, C[k,q] -= 1  (VS row, node columns)
 *   e[k] = V
 */
function stampVoltageSource(
  A: Matrix,
  b: Vector,
  comp: DCVoltageSource,
  map: NodeIndexMap,
  vsIndex: number
): void {
  const n = A.cols;
  const k = map.numNodes + vsIndex;
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);

  if (p !== undefined) {
    A.data[p * n + k] += 1;
    A.data[k * n + p] += 1;
  }
  if (q !== undefined) {
    A.data[q * n + k] -= 1;
    A.data[k * n + q] -= 1;
  }

  b.data[k] = comp.voltage;
}

/**
 * Stamp a DC current source into the RHS vector.
 * SPICE convention: positive current I flows from the positive terminal (N+)
 * through the source to the negative terminal (N-).
 *   b[N+] -= I  (current drawn from N+ into source)
 *   b[N-] += I  (current injected from source into N-)
 */
function stampCurrentSource(
  b: Vector,
  comp: DCCurrentSource,
  map: NodeIndexMap
): void {
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);

  if (p !== undefined) {
    b.data[p] -= comp.current;
  }
  if (q !== undefined) {
    b.data[q] += comp.current;
  }
}

// ============================================================================
// Result Extraction
// ============================================================================

/**
 * Extract DC operating point results from the MNA solution vector.
 */
function extractResults(
  x: Vector,
  circuit: Circuit,
  map: NodeIndexMap
): {
  nodeVoltages: Record<NodeId, number>;
  branchCurrents: Record<ComponentId, number>;
  componentPowers: Record<ComponentId, number>;
} {
  const nodeVoltages: Record<NodeId, number> = {};
  const branchCurrents: Record<ComponentId, number> = {};
  const componentPowers: Record<ComponentId, number> = {};

  nodeVoltages[circuit.groundNodeId] = 0;

  for (let i = 0; i < map.numNodes; i++) {
    nodeVoltages[map.indexToNode[i]] = x.data[i];
  }

  for (const component of circuit.components) {
    if (component.type === 'ground') continue;

    switch (component.type) {
      case 'resistor': {
        const r = component as Resistor;
        const vp = nodeVoltages[r.terminals[0].nodeId] ?? 0;
        const vq = nodeVoltages[r.terminals[1].nodeId] ?? 0;
        const current = (vp - vq) / r.resistance;
        branchCurrents[r.id] = current;
        componentPowers[r.id] = (vp - vq) * current;
        break;
      }
      case 'voltage_source': {
        const vs = component as DCVoltageSource;
        const vsIdx = map.voltageSourceIds.indexOf(vs.id);
        // MNA variable j_k is defined as current from N+ through source to N-.
        // Negate to get the conventional direction (current out of N+ into external circuit).
        const current = -x.data[map.numNodes + vsIdx];
        branchCurrents[vs.id] = current;
        componentPowers[vs.id] = -vs.voltage * current;
        break;
      }
      case 'current_source': {
        const cs = component as DCCurrentSource;
        const vp = nodeVoltages[cs.terminals[0].nodeId] ?? 0;
        const vq = nodeVoltages[cs.terminals[1].nodeId] ?? 0;
        branchCurrents[cs.id] = cs.current;
        // (vp - vq) * I is power absorbed by the source; negative means
        // the current source is delivering power to the circuit
        componentPowers[cs.id] = (vp - vq) * cs.current;
        break;
      }
    }
  }

  return { nodeVoltages, branchCurrents, componentPowers };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate that a circuit is suitable for DC analysis.
 * Checks: null input, empty circuit, missing ground, floating nodes,
 * and unsupported component types (capacitor, inductor, etc.).
 */
function validateCircuitForDC(circuit: Circuit): void {
  if (!circuit) {
    throw new WebSpiceError(
      'INVALID_CIRCUIT',
      'Circuit cannot be null or undefined'
    );
  }

  if (!circuit.components || circuit.components.length === 0) {
    throw new WebSpiceError(
      'INVALID_CIRCUIT',
      'Circuit must have at least one component'
    );
  }

  const groundNodeId = circuit.groundNodeId;
  const allNodeIds = new Set<NodeId>();
  const nodeConnections = new Map<NodeId, number>();

  for (const component of circuit.components) {
    if (component.type === 'ground') {
      allNodeIds.add(component.nodeId);
      nodeConnections.set(
        component.nodeId,
        (nodeConnections.get(component.nodeId) ?? 0) + 1
      );
    } else if ('terminals' in component) {
      for (const terminal of component.terminals) {
        allNodeIds.add(terminal.nodeId);
        nodeConnections.set(
          terminal.nodeId,
          (nodeConnections.get(terminal.nodeId) ?? 0) + 1
        );
      }
    }
  }

  if (!allNodeIds.has(groundNodeId)) {
    throw new WebSpiceError(
      'NO_GROUND',
      `Ground node '${groundNodeId}' not found in circuit`
    );
  }

  for (const [nodeId, count] of nodeConnections) {
    if (nodeId !== groundNodeId && count < 2) {
      throw new WebSpiceError(
        'FLOATING_NODE',
        `Node '${nodeId}' is connected to only one component`,
        { nodeId }
      );
    }
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

// ============================================================================
// Node Index Mapping
// ============================================================================

/**
 * Build a mapping from node IDs to matrix indices.
 * Ground node is excluded (implicit V=0).
 * Voltage sources get additional indices after nodes.
 */
function buildNodeIndexMap(circuit: Circuit): NodeIndexMap {
  const groundNodeId = circuit.groundNodeId;
  const nodeIds = new Set<NodeId>();
  const voltageSourceIds: ComponentId[] = [];

  for (const component of circuit.components) {
    if (component.type === 'ground') continue;

    if ('terminals' in component) {
      for (const terminal of component.terminals) {
        if (terminal.nodeId !== groundNodeId) {
          nodeIds.add(terminal.nodeId);
        }
      }
    }

    if (component.type === 'voltage_source') {
      voltageSourceIds.push(component.id);
    }
  }

  const sortedNodes = Array.from(nodeIds).sort();
  const nodeToIndex = new Map<NodeId, number>();
  for (let i = 0; i < sortedNodes.length; i++) {
    nodeToIndex.set(sortedNodes[i], i);
  }

  const numNodes = sortedNodes.length;
  const numVoltageSources = voltageSourceIds.length;

  return {
    nodeToIndex,
    indexToNode: sortedNodes,
    numNodes,
    numVoltageSources,
    systemSize: numNodes + numVoltageSources,
    voltageSourceIds,
  };
}
