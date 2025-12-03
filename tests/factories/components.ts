/**
 * Component factory functions for testing
 * These functions create test instances of circuit components with sensible defaults
 */

import type {
  ACCurrentSource,
  ACVoltageSource,
  Capacitor,
  ComponentId,
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
 * Creates a test resistor with specified or default parameters
 *
 * @example
 * const r1 = createTestResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] });
 */
export function createTestResistor(params?: {
  id?: ComponentId;
  name?: string;
  resistance?: number;
  nodes?: [NodeId, NodeId];
}): Resistor {
  const {
    id = 'R1',
    name = 'Test Resistor',
    resistance = 1000,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'resistor',
    name,
    resistance,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test capacitor with specified or default parameters
 *
 * @example
 * const c1 = createTestCapacitor({ id: 'C1', capacitance: 1e-6, nodes: ['1', '0'] });
 */
export function createTestCapacitor(params?: {
  id?: ComponentId;
  name?: string;
  capacitance?: number;
  initialVoltage?: number;
  nodes?: [NodeId, NodeId];
}): Capacitor {
  const {
    id = 'C1',
    name = 'Test Capacitor',
    capacitance = 1e-6,
    initialVoltage,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'capacitor',
    name,
    capacitance,
    initialVoltage,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test inductor with specified or default parameters
 *
 * @example
 * const l1 = createTestInductor({ id: 'L1', inductance: 1e-3, nodes: ['1', '0'] });
 */
export function createTestInductor(params?: {
  id?: ComponentId;
  name?: string;
  inductance?: number;
  initialCurrent?: number;
  nodes?: [NodeId, NodeId];
}): Inductor {
  const {
    id = 'L1',
    name = 'Test Inductor',
    inductance = 1e-3,
    initialCurrent,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'inductor',
    name,
    inductance,
    initialCurrent,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test DC voltage source with specified or default parameters
 *
 * @example
 * const v1 = createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] });
 */
export function createTestVoltageSource(params?: {
  id?: ComponentId;
  name?: string;
  voltage?: number;
  nodes?: [NodeId, NodeId];
}): DCVoltageSource {
  const {
    id = 'V1',
    name = 'Test Voltage Source',
    voltage = 12,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'voltage_source',
    sourceType: 'dc',
    name,
    voltage,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test AC voltage source with specified or default parameters
 *
 * @example
 * const v1 = createTestACVoltageSource({ id: 'V1', amplitude: 10, frequency: 60 });
 */
export function createTestACVoltageSource(params?: {
  id?: ComponentId;
  name?: string;
  amplitude?: number;
  frequency?: number;
  phase?: number;
  dcOffset?: number;
  nodes?: [NodeId, NodeId];
}): ACVoltageSource {
  const {
    id = 'V1',
    name = 'Test AC Voltage Source',
    amplitude = 10,
    frequency = 60,
    phase = 0,
    dcOffset,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'voltage_source',
    sourceType: 'ac',
    name,
    amplitude,
    frequency,
    phase,
    dcOffset,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test DC current source with specified or default parameters
 *
 * @example
 * const i1 = createTestCurrentSource({ id: 'I1', current: 0.001, nodes: ['1', '0'] });
 */
export function createTestCurrentSource(params?: {
  id?: ComponentId;
  name?: string;
  current?: number;
  nodes?: [NodeId, NodeId];
}): DCCurrentSource {
  const {
    id = 'I1',
    name = 'Test Current Source',
    current = 0.001,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'current_source',
    sourceType: 'dc',
    name,
    current,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test AC current source with specified or default parameters
 *
 * @example
 * const i1 = createTestACCurrentSource({ id: 'I1', amplitude: 0.001, frequency: 60 });
 */
export function createTestACCurrentSource(params?: {
  id?: ComponentId;
  name?: string;
  amplitude?: number;
  frequency?: number;
  phase?: number;
  dcOffset?: number;
  nodes?: [NodeId, NodeId];
}): ACCurrentSource {
  const {
    id = 'I1',
    name = 'Test AC Current Source',
    amplitude = 0.001,
    frequency = 60,
    phase = 0,
    dcOffset,
    nodes = ['1', '0'],
  } = params || {};

  return {
    id,
    type: 'current_source',
    sourceType: 'ac',
    name,
    amplitude,
    frequency,
    phase,
    dcOffset,
    terminals: [
      createTerminal('pos', nodes[0]),
      createTerminal('neg', nodes[1]),
    ],
  };
}

/**
 * Creates a test ground reference node
 *
 * @example
 * const gnd = createTestGround({ id: 'GND', nodeId: '0' });
 */
export function createTestGround(params?: {
  id?: ComponentId;
  name?: string;
  nodeId?: NodeId;
}): Ground {
  const { id = 'GND', name = 'Ground', nodeId = '0' } = params || {};

  return {
    id,
    type: 'ground',
    name,
    nodeId,
  };
}
