/**
 * MNA (Modified Nodal Analysis) Matrix Assembler
 *
 * Builds and solves the MNA system for DC operating point analysis.
 * Handles node index mapping, matrix stamping, and result extraction.
 *
 * @module engine/analysis/mnaAssembler
 * @internal
 *
 * All exported symbols are internal helpers consumed exclusively by dcAnalysis.ts.
 * They are not part of the public engine API and rely on the following preconditions
 * being satisfied by the caller (enforced by validateCircuitForDC in analyzeDC):
 *   - Circuit has passed structural validation (validateCircuitStructure)
 *   - All components are DC-compatible (no AC sources, no capacitors/inductors)
 *   - At least one component is present and a ground node exists
 * Calling these functions directly without prior validation produces undefined behavior.
 */

import type { Circuit, Matrix, Vector } from '@/types/circuit';
import type {
  ComponentId,
  DCCurrentSource,
  DCVoltageSource,
  NodeId,
  Resistor,
} from '@/types/component';

// ============================================================================
// Types
// ============================================================================

/**
 * Maps node IDs to matrix indices and tracks system dimensions.
 * @internal
 */
export interface NodeIndexMap {
  nodeToIndex: Map<NodeId, number>;
  indexToNode: NodeId[];
  numNodes: number;
  numVoltageSources: number;
  systemSize: number;
  voltageSourceIds: ComponentId[];
}

// ============================================================================
// Node Index Mapping
// ============================================================================

/**
 * Build a mapping from node IDs to matrix indices.
 * Ground node is excluded (implicit V=0).
 * Voltage sources get additional indices after nodes.
 * @internal Precondition: circuit has passed validateCircuitForDC.
 */
export function buildNodeIndexMap(circuit: Circuit): NodeIndexMap {
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

// ============================================================================
// MNA System Construction
// ============================================================================

/**
 * Build the MNA matrix A and RHS vector b from circuit components.
 * @internal Precondition: circuit has passed validateCircuitForDC.
 */
export function buildMNASystem(
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
        stampResistor(A, component, map);
        break;
      case 'voltage_source':
        if (component.sourceType === 'dc') {
          stampVoltageSource(A, b, component, map, vsIndex);
          vsIndex++;
        }
        break;
      case 'current_source':
        if (component.sourceType === 'dc') {
          stampCurrentSource(b, component, map);
        }
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
    if (q !== undefined) A.data[p * n + q] -= G;
  }
  if (q !== undefined) {
    A.data[q * n + q] += G;
    if (p !== undefined) A.data[q * n + p] -= G;
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

  if (p !== undefined) b.data[p] -= comp.current;
  if (q !== undefined) b.data[q] += comp.current;
}

// ============================================================================
// Result Extraction
// ============================================================================

/**
 * Extract DC operating point results from the MNA solution vector.
 * @internal Precondition: circuit has passed validateCircuitForDC.
 */
export function extractResults(
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

  const GROUND_VOLTAGE = 0;
  nodeVoltages[circuit.groundNodeId] = GROUND_VOLTAGE;

  for (let i = 0; i < map.numNodes; i++) {
    nodeVoltages[map.indexToNode[i]] = x.data[i];
  }

  const vsIndexMap = new Map<ComponentId, number>(
    map.voltageSourceIds.map((id, i) => [id, i])
  );

  for (const component of circuit.components) {
    if (component.type === 'ground') continue;

    switch (component.type) {
      case 'resistor': {
        const vp =
          nodeVoltages[component.terminals[0].nodeId] ?? GROUND_VOLTAGE;
        const vq =
          nodeVoltages[component.terminals[1].nodeId] ?? GROUND_VOLTAGE;
        const current = (vp - vq) / component.resistance;
        branchCurrents[component.id] = current;
        componentPowers[component.id] = (vp - vq) * current;
        break;
      }
      case 'voltage_source': {
        if (component.sourceType !== 'dc') break;
        const vsIdx = vsIndexMap.get(component.id);
        if (vsIdx === undefined) break;
        // MNA variable j_k is defined as current from N+ through source to N-.
        // Negate to get the conventional direction (current out of N+ into external circuit).
        const current = -x.data[map.numNodes + vsIdx];
        branchCurrents[component.id] = current;
        componentPowers[component.id] = -component.voltage * current;
        break;
      }
      case 'current_source': {
        if (component.sourceType !== 'dc') break;
        const vp =
          nodeVoltages[component.terminals[0].nodeId] ?? GROUND_VOLTAGE;
        const vq =
          nodeVoltages[component.terminals[1].nodeId] ?? GROUND_VOLTAGE;
        branchCurrents[component.id] = component.current;
        // (vp - vq) * I is power absorbed by the source; negative means
        // the current source is delivering power to the circuit
        componentPowers[component.id] = (vp - vq) * component.current;
        break;
      }
    }
  }

  return { nodeVoltages, branchCurrents, componentPowers };
}
