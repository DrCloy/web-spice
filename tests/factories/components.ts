/**
 * Component factory functions for testing
 * These functions create test instances of circuit components
 */

import type {
  ACCurrentSource,
  ACVoltageSource,
  Capacitor,
  DCCurrentSource,
  DCVoltageSource,
  Ground,
  Inductor,
  NodeId,
  Resistor,
  Terminal,
} from '@/types/component';

/**
 * Creates a terminal object
 */
function createTerminal(name: string, nodeId: NodeId): Terminal {
  return { name, nodeId };
}

/**
 * Creates ground component data
 *
 * @example
 * const gnd = createGround({ id: 'GND', nodeId: '0' });
 */
export function createGround(params: {
  id: string;
  nodeId: string;
  name?: string;
}): Ground {
  return {
    id: params.id,
    type: 'ground',
    name: params.name || params.id,
    nodeId: params.nodeId,
  };
}

/**
 * Creates resistor component data
 *
 * @example
 * const r1 = createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] });
 */
export function createResistor(params: {
  id: string;
  resistance: number;
  nodes: [string, string];
  name?: string;
}): Resistor {
  return {
    id: params.id,
    type: 'resistor',
    name: params.name || params.id,
    resistance: params.resistance,
    terminals: [
      createTerminal('terminal1', params.nodes[0]),
      createTerminal('terminal2', params.nodes[1]),
    ],
  };
}

/**
 * Creates DC voltage source component data
 *
 * @example
 * const v1 = createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] });
 */
export function createDCVoltageSource(params: {
  id: string;
  voltage: number;
  nodes: [string, string];
  name?: string;
}): DCVoltageSource {
  return {
    id: params.id,
    type: 'voltage_source',
    sourceType: 'dc',
    name: params.name || params.id,
    voltage: params.voltage,
    terminals: [
      createTerminal('pos', params.nodes[0]),
      createTerminal('neg', params.nodes[1]),
    ],
  };
}

/**
 * Creates DC current source component data
 *
 * @example
 * const i1 = createDCCurrentSource({ id: 'I1', current: 0.001, nodes: ['1', '0'] });
 */
export function createDCCurrentSource(params: {
  id: string;
  current: number;
  nodes: [string, string];
  name?: string;
}): DCCurrentSource {
  return {
    id: params.id,
    type: 'current_source',
    sourceType: 'dc',
    name: params.name || params.id,
    current: params.current,
    terminals: [
      createTerminal('pos', params.nodes[0]),
      createTerminal('neg', params.nodes[1]),
    ],
  };
}

/**
 * Creates capacitor component data
 *
 * @example
 * const c1 = createCapacitor({ id: 'C1', capacitance: 1e-6, nodes: ['1', '0'] });
 */
export function createCapacitor(params: {
  id: string;
  capacitance: number;
  nodes: [string, string];
  name?: string;
  initialVoltage?: number;
}): Capacitor {
  return {
    id: params.id,
    type: 'capacitor',
    name: params.name || params.id,
    capacitance: params.capacitance,
    initialVoltage: params.initialVoltage,
    terminals: [
      createTerminal('pos', params.nodes[0]),
      createTerminal('neg', params.nodes[1]),
    ],
  };
}

/**
 * Creates inductor component data
 *
 * @example
 * const l1 = createInductor({ id: 'L1', inductance: 1e-3, nodes: ['1', '0'] });
 */
export function createInductor(params: {
  id: string;
  inductance: number;
  nodes: [string, string];
  name?: string;
  initialCurrent?: number;
}): Inductor {
  return {
    id: params.id,
    type: 'inductor',
    name: params.name || params.id,
    inductance: params.inductance,
    initialCurrent: params.initialCurrent,
    terminals: [
      createTerminal('terminal1', params.nodes[0]),
      createTerminal('terminal2', params.nodes[1]),
    ],
  };
}

/**
 * Creates AC voltage source component data
 *
 * @example
 * const v1 = createACVoltageSource({ id: 'V1', amplitude: 10, frequency: 60, nodes: ['1', '0'] });
 */
export function createACVoltageSource(params: {
  id: string;
  amplitude: number;
  frequency: number;
  nodes: [string, string];
  name?: string;
  phase?: number;
  dcOffset?: number;
}): ACVoltageSource {
  return {
    id: params.id,
    type: 'voltage_source',
    sourceType: 'ac',
    name: params.name || params.id,
    amplitude: params.amplitude,
    frequency: params.frequency,
    phase: params.phase ?? 0,
    dcOffset: params.dcOffset,
    terminals: [
      createTerminal('pos', params.nodes[0]),
      createTerminal('neg', params.nodes[1]),
    ],
  };
}

/**
 * Creates AC current source component data
 *
 * @example
 * const i1 = createACCurrentSource({ id: 'I1', amplitude: 0.001, frequency: 60, nodes: ['1', '0'] });
 */
export function createACCurrentSource(params: {
  id: string;
  amplitude: number;
  frequency: number;
  nodes: [string, string];
  name?: string;
  phase?: number;
  dcOffset?: number;
}): ACCurrentSource {
  return {
    id: params.id,
    type: 'current_source',
    sourceType: 'ac',
    name: params.name || params.id,
    amplitude: params.amplitude,
    frequency: params.frequency,
    phase: params.phase ?? 0,
    dcOffset: params.dcOffset,
    terminals: [
      createTerminal('pos', params.nodes[0]),
      createTerminal('neg', params.nodes[1]),
    ],
  };
}
