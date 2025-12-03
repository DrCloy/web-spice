/**
 * Circuit factory functions for testing
 * These functions create complete test circuits with known configurations
 */

import type { Circuit, Node } from '@/types/circuit';
import type { Component, ComponentId, NodeId } from '@/types/component';
import {
  createTestGround,
  createTestResistor,
  createTestVoltageSource,
} from './components';

/**
 * Creates a basic circuit structure with specified components
 *
 * @example
 * const circuit = createTestCircuit({
 *   id: 'test-circuit',
 *   name: 'Test Circuit',
 *   components: [v1, r1, r2],
 *   groundNodeId: '0'
 * });
 */
export function createTestCircuit(params: {
  id?: string;
  name?: string;
  description?: string;
  components: Component[];
  groundNodeId?: NodeId;
}): Circuit {
  const {
    id = 'test-circuit',
    name = 'Test Circuit',
    description,
    components,
    groundNodeId = '0',
  } = params;

  // Extract all unique nodes from components
  const nodeSet = new Set<NodeId>();
  const nodeConnections = new Map<NodeId, ComponentId[]>();

  for (const component of components) {
    if (component.type === 'ground') {
      nodeSet.add(component.nodeId);
      const connections = nodeConnections.get(component.nodeId) || [];
      connections.push(component.id);
      nodeConnections.set(component.nodeId, connections);
    } else if ('terminals' in component) {
      for (const terminal of component.terminals) {
        nodeSet.add(terminal.nodeId);
        const connections = nodeConnections.get(terminal.nodeId) || [];
        connections.push(component.id);
        nodeConnections.set(terminal.nodeId, connections);
      }
    }
  }

  // Create node objects
  const nodes: Node[] = Array.from(nodeSet).map(nodeId => ({
    id: nodeId,
    name: nodeId === groundNodeId ? 'Ground' : `Node ${nodeId}`,
    isGround: nodeId === groundNodeId,
    connectedComponents: nodeConnections.get(nodeId) || [],
  }));

  return {
    id,
    name,
    description,
    components,
    nodes,
    groundNodeId,
  };
}

/**
 * Creates a simple voltage divider circuit
 *
 * Circuit:
 *   V1(+) -- R1 -- Node1 -- R2 -- GND
 *
 * @example
 * const circuit = createVoltageDivider({
 *   inputVoltage: 12,
 *   r1: 1000,
 *   r2: 2000
 * });
 */
export function createVoltageDivider(params?: {
  inputVoltage?: number;
  r1?: number;
  r2?: number;
}): Circuit {
  const { inputVoltage = 12, r1 = 1000, r2 = 2000 } = params || {};

  const v1 = createTestVoltageSource({
    id: 'V1',
    name: 'Input Voltage',
    voltage: inputVoltage,
    nodes: ['1', '0'],
  });

  const resistor1 = createTestResistor({
    id: 'R1',
    name: 'R1',
    resistance: r1,
    nodes: ['1', '2'],
  });

  const resistor2 = createTestResistor({
    id: 'R2',
    name: 'R2',
    resistance: r2,
    nodes: ['2', '0'],
  });

  const ground = createTestGround({
    id: 'GND',
    nodeId: '0',
  });

  return createTestCircuit({
    id: 'voltage-divider',
    name: 'Voltage Divider',
    description: `Voltage divider with V=${inputVoltage}V, R1=${r1}Ω, R2=${r2}Ω`,
    components: [v1, resistor1, resistor2, ground],
    groundNodeId: '0',
  });
}

/**
 * Creates a simple series resistor circuit
 *
 * Circuit:
 *   V1(+) -- R1 -- R2 -- R3 -- GND
 *
 * @example
 * const circuit = createSeriesResistors({
 *   voltage: 12,
 *   resistances: [100, 200, 300]
 * });
 */
export function createSeriesResistors(params?: {
  voltage?: number;
  resistances?: number[];
}): Circuit {
  const { voltage = 12, resistances = [100, 200, 300] } = params || {};

  const components: Component[] = [];

  // Create voltage source
  components.push(
    createTestVoltageSource({
      id: 'V1',
      name: 'Input Voltage',
      voltage,
      nodes: ['1', '0'],
    })
  );

  // Create series resistors
  resistances.forEach((resistance, index) => {
    const nodeA = (index + 1).toString();
    const nodeB = (index + 2).toString();
    components.push(
      createTestResistor({
        id: `R${index + 1}`,
        name: `R${index + 1}`,
        resistance,
        nodes: [nodeA, nodeB] as [NodeId, NodeId],
      })
    );
  });

  // Create ground
  components.push(
    createTestGround({
      id: 'GND',
      nodeId: '0',
    })
  );

  return createTestCircuit({
    id: 'series-resistors',
    name: 'Series Resistors',
    description: `Series resistors with V=${voltage}V, R=[${resistances.join(', ')}]Ω`,
    components,
    groundNodeId: '0',
  });
}

/**
 * Creates a parallel resistor circuit
 *
 * Circuit:
 *        +-- R1 --+
 *   V1 -+-- R2 --+-- GND
 *        +-- R3 --+
 *
 * @example
 * const circuit = createParallelResistors({
 *   voltage: 12,
 *   resistances: [100, 200, 300]
 * });
 */
export function createParallelResistors(params?: {
  voltage?: number;
  resistances?: number[];
}): Circuit {
  const { voltage = 12, resistances = [100, 200, 300] } = params || {};

  const components: Component[] = [];

  // Create voltage source
  components.push(
    createTestVoltageSource({
      id: 'V1',
      name: 'Input Voltage',
      voltage,
      nodes: ['1', '0'],
    })
  );

  // Create parallel resistors (all connected between node 1 and ground)
  resistances.forEach((resistance, index) => {
    components.push(
      createTestResistor({
        id: `R${index + 1}`,
        name: `R${index + 1}`,
        resistance,
        nodes: ['1', '0'],
      })
    );
  });

  // Create ground
  components.push(
    createTestGround({
      id: 'GND',
      nodeId: '0',
    })
  );

  return createTestCircuit({
    id: 'parallel-resistors',
    name: 'Parallel Resistors',
    description: `Parallel resistors with V=${voltage}V, R=[${resistances.join(', ')}]Ω`,
    components,
    groundNodeId: '0',
  });
}
