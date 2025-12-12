/**
 * Error case fixtures for testing error handling
 * These fixtures represent invalid circuits that should trigger errors
 */

import type { Circuit } from '@/types/circuit';
import { createTestCircuit } from '../factories/circuits';
import {
  createDCVoltageSource,
  createGround,
  createResistor,
} from '../factories/components';

/**
 * Error case fixture with expected error information
 */
export interface ErrorCaseFixture {
  circuit: Circuit | Partial<Circuit>;
  description: string;
  expectedErrorCode?: string;
  expectedErrorMessage?: string;
}

/**
 * Circuit with a disconnected subgraph (isolated from main circuit)
 *
 * Circuit:
 *   V1(12V) -- R1 -- GND
 *   R2 (forms isolated subgraph, not connected to main circuit)
 *     Node 99 -- R2 -- Node 98
 *
 * Expected error: DISCONNECTED_SUBGRAPH or FLOATING_COMPONENT
 */
export const DISCONNECTED_SUBGRAPH_ERROR: ErrorCaseFixture = {
  circuit: {
    id: 'error-disconnected-subgraph',
    name: 'Disconnected Subgraph Error',
    description:
      'Circuit with disconnected component forming isolated subgraph',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
      // R2 forms an isolated subgraph not connected to main circuit
      createResistor({ id: 'R2', resistance: 1000, nodes: ['99', '98'] }),
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    nodes: [
      {
        id: '0',
        name: 'Ground',
        isGround: true,
        connectedComponents: ['V1', 'R1', 'GND'],
      },
      {
        id: '1',
        name: 'Node 1',
        isGround: false,
        connectedComponents: ['V1', 'R1'],
      },
      {
        id: '99',
        name: 'Isolated Node A',
        isGround: false,
        connectedComponents: ['R2'],
      },
      {
        id: '98',
        name: 'Isolated Node B',
        isGround: false,
        connectedComponents: ['R2'],
      },
    ],
    groundNodeId: '0',
  },
  description:
    'Circuit with disconnected subgraph that is isolated from the main circuit',
  expectedErrorCode: 'DISCONNECTED_SUBGRAPH',
  expectedErrorMessage: 'Circuit contains disconnected components',
};

/**
 * Circuit with a truly floating node (no connections at all)
 *
 * Circuit:
 *   V1(12V) -- R1 -- GND
 *   Node 99 (not connected to any component)
 *
 * Expected error: FLOATING_NODE
 */
export const FLOATING_NODE_ERROR: ErrorCaseFixture = {
  circuit: {
    id: 'error-floating-node',
    name: 'Floating Node Error',
    description: 'Circuit with a node that has no component connections',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    nodes: [
      {
        id: '0',
        name: 'Ground',
        isGround: true,
        connectedComponents: ['V1', 'R1', 'GND'],
      },
      {
        id: '1',
        name: 'Node 1',
        isGround: false,
        connectedComponents: ['V1', 'R1'],
      },
      {
        id: '99',
        name: 'Floating Node',
        isGround: false,
        connectedComponents: [], // No connections - truly floating
      },
    ],
    groundNodeId: '0',
  },
  description: 'Circuit with a floating node that has no component connections',
  expectedErrorCode: 'FLOATING_NODE',
  expectedErrorMessage: 'Circuit contains floating nodes',
};

/**
 * Circuit without a ground node
 *
 * Circuit:
 *   V1(12V) -- R1 -- (no ground)
 *
 * Expected error: NO_GROUND
 */
export const NO_GROUND_ERROR: ErrorCaseFixture = {
  circuit: {
    id: 'error-no-ground',
    name: 'No Ground Error',
    description: 'Circuit without ground reference',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '2'] }),
      createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
    ],
    nodes: [
      {
        id: '1',
        name: 'Node 1',
        isGround: false,
        connectedComponents: ['V1', 'R1'],
      },
      {
        id: '2',
        name: 'Node 2',
        isGround: false,
        connectedComponents: ['V1', 'R1'],
      },
    ],
    groundNodeId: '0', // References non-existent ground
  },
  description: 'Circuit without a proper ground node',
  expectedErrorCode: 'NO_GROUND',
  expectedErrorMessage: 'Circuit must have a ground node',
};

/**
 * Circuit with zero resistance (short circuit)
 * This can cause numerical instability or division by zero
 *
 * Circuit:
 *   V1(12V) -- R1(0Ω) -- GND
 *
 * Expected error: INVALID_PARAMETER
 */
export const ZERO_RESISTANCE_ERROR: ErrorCaseFixture = {
  circuit: createTestCircuit({
    id: 'error-zero-resistance',
    name: 'Zero Resistance Error',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: 0, nodes: ['1', '0'] }), // Invalid!
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    groundNodeId: '0',
  }),
  description: 'Circuit with zero resistance (invalid parameter)',
  expectedErrorCode: 'INVALID_PARAMETER',
  expectedErrorMessage: 'Resistance must be greater than zero',
};

/**
 * Circuit with negative resistance (invalid component)
 *
 * Circuit:
 *   V1(12V) -- R1(-1000Ω) -- GND
 *
 * Expected error: INVALID_PARAMETER
 */
export const NEGATIVE_RESISTANCE_ERROR: ErrorCaseFixture = {
  circuit: createTestCircuit({
    id: 'error-negative-resistance',
    name: 'Negative Resistance Error',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: -1000, nodes: ['1', '0'] }), // Invalid!
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    groundNodeId: '0',
  }),
  description: 'Circuit with negative resistance (invalid parameter)',
  expectedErrorCode: 'INVALID_PARAMETER',
  expectedErrorMessage: 'Resistance must be positive',
};

/**
 * Circuit that will produce a singular matrix
 * (Two voltage sources in parallel with no resistance)
 *
 * Circuit:
 *   V1(12V) --- GND
 *       |       |
 *   V2(10V) ----+
 *
 * Expected error: SINGULAR_MATRIX
 */
export const SINGULAR_MATRIX_ERROR: ErrorCaseFixture = {
  circuit: createTestCircuit({
    id: 'error-singular-matrix',
    name: 'Singular Matrix Error',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createDCVoltageSource({ id: 'V2', voltage: 10, nodes: ['1', '0'] }),
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    groundNodeId: '0',
  }),
  description: 'Two voltage sources in parallel (creates singular matrix)',
  expectedErrorCode: 'SINGULAR_MATRIX',
  expectedErrorMessage: 'Circuit produces singular matrix',
};

/**
 * Empty circuit (no components)
 *
 * Expected error: INVALID_CIRCUIT
 */
export const EMPTY_CIRCUIT_ERROR: ErrorCaseFixture = {
  circuit: {
    id: 'error-empty',
    name: 'Empty Circuit Error',
    description: 'Circuit with no components',
    components: [],
    nodes: [],
    groundNodeId: '0',
  },
  description: 'Circuit with no components',
  expectedErrorCode: 'INVALID_CIRCUIT',
  expectedErrorMessage: 'Circuit must have at least one component',
};

/**
 * Circuit with duplicate component IDs
 *
 * Expected error: INVALID_COMPONENT
 */
export const DUPLICATE_COMPONENT_ID_ERROR: ErrorCaseFixture = {
  circuit: createTestCircuit({
    id: 'error-duplicate-id',
    name: 'Duplicate ID Error',
    components: [
      createDCVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
      createResistor({ id: 'R1', resistance: 2000, nodes: ['1', '0'] }), // Duplicate ID!
      createGround({ id: 'GND', nodeId: '0' }),
    ],
    groundNodeId: '0',
  }),
  description: 'Circuit with duplicate component IDs',
  expectedErrorCode: 'INVALID_COMPONENT',
  expectedErrorMessage: 'Duplicate component ID',
};

/**
 * All error case fixtures for iteration in tests
 */
export const ALL_ERROR_FIXTURES: ErrorCaseFixture[] = [
  FLOATING_NODE_ERROR,
  DISCONNECTED_SUBGRAPH_ERROR,
  NO_GROUND_ERROR,
  ZERO_RESISTANCE_ERROR,
  NEGATIVE_RESISTANCE_ERROR,
  SINGULAR_MATRIX_ERROR,
  EMPTY_CIRCUIT_ERROR,
  DUPLICATE_COMPONENT_ID_ERROR,
];
