import type { Circuit } from '@/types/circuit';
import type {
  ACCurrentSource,
  ACVoltageSource,
  Capacitor,
  ComponentId,
  CurrentSource,
  Inductor,
  NodeId,
  Resistor,
  VoltageSource,
} from '@/types/component';
import type { Complex } from '@/types/component';
import {
  type NodeIndexMap,
  buildNodeIndexMap,
} from '@/engine/solver/mnaAssembler';
import { C_ONE, C_ZERO, cAdd, cMul, cNeg, cSub } from '@/engine/solver/complex';
import {
  type ComplexMatrix,
  type ComplexVector,
  createComplexMatrix,
  createComplexVector,
} from '@/engine/solver/complexMatrix';

export { buildNodeIndexMap, type NodeIndexMap };

const omegaByMap = new WeakMap<NodeIndexMap, number>();

export function buildACMNASystem(
  circuit: Circuit,
  map: NodeIndexMap,
  omega: number
): { A: ComplexMatrix; b: ComplexVector } {
  const A = createComplexMatrix(map.systemSize);
  const b = createComplexVector(map.systemSize);
  omegaByMap.set(map, omega);

  let vsIndex = 0;
  for (const component of circuit.components) {
    switch (component.type) {
      case 'resistor':
        stampAdmittance(A, component, map, {
          real: 1 / component.resistance,
          imag: 0,
        });
        break;
      case 'capacitor':
        stampAdmittance(A, component, map, {
          real: 0,
          imag: omega * component.capacitance,
        });
        break;
      case 'inductor':
        stampAdmittance(A, component, map, {
          real: 0,
          imag: -1 / (omega * component.inductance),
        });
        break;
      case 'voltage_source':
        stampVoltageSource(A, b, component, map, vsIndex);
        vsIndex++;
        break;
      case 'current_source':
        stampCurrentSource(b, component, map);
        break;
    }
  }

  return { A, b };
}

function stampAdmittance(
  A: ComplexMatrix,
  comp: Resistor | Capacitor | Inductor,
  map: NodeIndexMap,
  admittance: Complex
): void {
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);

  if (p !== undefined) {
    addAt(A, p, p, admittance);
    if (q !== undefined) addAt(A, p, q, cNeg(admittance));
  }
  if (q !== undefined) {
    addAt(A, q, q, admittance);
    if (p !== undefined) addAt(A, q, p, cNeg(admittance));
  }
}

function stampVoltageSource(
  A: ComplexMatrix,
  b: ComplexVector,
  comp: VoltageSource,
  map: NodeIndexMap,
  vsIndex: number
): void {
  const k = map.numNodes + vsIndex;
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);

  if (p !== undefined) {
    addAt(A, p, k, C_ONE);
    addAt(A, k, p, C_ONE);
  }
  if (q !== undefined) {
    addAt(A, q, k, cNeg(C_ONE));
    addAt(A, k, q, cNeg(C_ONE));
  }

  b.data[k] = comp.sourceType === 'ac' ? sourcePhasor(comp) : { ...C_ZERO };
}

function stampCurrentSource(
  b: ComplexVector,
  comp: CurrentSource,
  map: NodeIndexMap
): void {
  const p = map.nodeToIndex.get(comp.terminals[0].nodeId);
  const q = map.nodeToIndex.get(comp.terminals[1].nodeId);
  const phasor = comp.sourceType === 'ac' ? sourcePhasor(comp) : { ...C_ZERO };

  if (p !== undefined) b.data[p] = cSub(b.data[p], phasor);
  if (q !== undefined) b.data[q] = cAdd(b.data[q], phasor);
}

export function extractACResults(
  x: ComplexVector,
  circuit: Circuit,
  map: NodeIndexMap
): {
  nodeVoltages: Record<NodeId, Complex>;
  branchCurrents: Record<ComponentId, Complex>;
} {
  const nodeVoltages: Record<NodeId, Complex> = {};
  const branchCurrents: Record<ComponentId, Complex> = {};

  nodeVoltages[circuit.groundNodeId] = { ...C_ZERO };

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
        const voltage = voltageAcross(component, nodeVoltages);
        branchCurrents[component.id] = {
          real: voltage.real / component.resistance,
          imag: voltage.imag / component.resistance,
        };
        break;
      }
      case 'capacitor': {
        const voltage = voltageAcross(component, nodeVoltages);
        const omega = getResultOmega(map);
        branchCurrents[component.id] = cMul(
          { real: 0, imag: omega * component.capacitance },
          voltage
        );
        break;
      }
      case 'inductor': {
        const voltage = voltageAcross(component, nodeVoltages);
        const omega = getResultOmega(map);
        branchCurrents[component.id] = cMul(
          { real: 0, imag: -1 / (omega * component.inductance) },
          voltage
        );
        break;
      }
      case 'voltage_source': {
        const vsIdx = vsIndexMap.get(component.id);
        if (vsIdx !== undefined) {
          branchCurrents[component.id] = cNeg(x.data[map.numNodes + vsIdx]);
        }
        break;
      }
      case 'current_source':
        branchCurrents[component.id] =
          component.sourceType === 'ac'
            ? sourcePhasor(component)
            : { ...C_ZERO };
        break;
    }
  }

  return { nodeVoltages, branchCurrents };
}

function addAt(
  matrix: ComplexMatrix,
  row: number,
  col: number,
  value: Complex
): void {
  const index = row * matrix.cols + col;
  matrix.data[index] = cAdd(matrix.data[index], value);
}

function sourcePhasor(source: ACVoltageSource | ACCurrentSource): Complex {
  const phaseRad = ((source.phase ?? 0) * Math.PI) / 180;
  return {
    real: source.amplitude * Math.cos(phaseRad),
    imag: source.amplitude * Math.sin(phaseRad),
  };
}

function voltageAcross(
  component: Resistor | Capacitor | Inductor,
  nodeVoltages: Record<NodeId, Complex>
): Complex {
  const vp = nodeVoltages[component.terminals[0].nodeId] ?? C_ZERO;
  const vq = nodeVoltages[component.terminals[1].nodeId] ?? C_ZERO;
  return cSub(vp, vq);
}

function getResultOmega(map: NodeIndexMap): number {
  return omegaByMap.get(map) ?? 0;
}
