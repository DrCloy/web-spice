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
import type { DCAnalysisResult, SolverOptions } from '@/types/simulation';
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
  options?: Partial<SolverOptions>
): DCAnalysisResult {
  validateCircuitForDC(circuit);

  const map = buildNodeIndexMap(circuit);

  // Trivial circuit (ground only, no solvable nodes)
  if (map.systemSize === 0) {
    return {
      type: 'dc',
      operatingPoint: {
        nodeVoltages: { [circuit.groundNodeId]: 0 },
        branchCurrents: {},
        componentPowers: {},
      },
      convergenceInfo: {
        converged: true,
        iterations: 1,
        maxIterations: 1,
        tolerance: 0,
        finalError: 0,
      },
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

  const operatingPoint = extractResults(solution, circuit, map);

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
 * SPICE convention: current I flows out of positive terminal (terminals[0])
 * through external circuit into negative terminal (terminals[1]).
 *   i[p] -= I  (current leaves positive terminal node)
 *   i[q] += I  (current enters negative terminal node)
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
        // MNA j is current into positive terminal; negate to get
        // conventional "current supplied to circuit" direction
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
      case 'voltage_source':
      case 'current_source':
      case 'ground':
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
