/**
 * Error case fixtures for testing error handling
 * These fixtures represent invalid circuits that should trigger errors
 */

import type { Circuit } from '../../src/types/circuit';
import {
  createTestGround,
  createTestResistor,
  createTestVoltageSource,
} from '../factories/components';
import { createTestCircuit } from '../factories/circuits';

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
 * Circuit with a floating node (disconnected component)
 *
 * Circuit:
 *   V1(12V) -- R1 -- GND
 *   R2 (not connected to anything)
 *
 * Expected error: FLOATING_NODE
 */
export const FLOATING_NODE_ERROR: ErrorCaseFixture = {
  circuit: {
    id: 'error-floating-node',
    name: 'Floating Node Error',
    description: 'Circuit with disconnected component',
    components: [
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createTestResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
      // R2 has nodes that don't connect to the main circuit
      createTestResistor({ id: 'R2', resistance: 1000, nodes: ['99', '98'] }),
      createTestGround({ id: 'GND', nodeId: '0' }),
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
        name: 'Floating Node A',
        isGround: false,
        connectedComponents: ['R2'],
      },
      {
        id: '98',
        name: 'Floating Node B',
        isGround: false,
        connectedComponents: ['R2'],
      },
    ],
    groundNodeId: '0',
  },
  description:
    'Circuit with floating nodes that are not connected to the main circuit',
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
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '2'] }),
      createTestResistor({ id: 'R1', resistance: 1000, nodes: ['1', '2'] }),
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
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createTestResistor({ id: 'R1', resistance: 0, nodes: ['1', '0'] }), // Invalid!
      createTestGround({ id: 'GND', nodeId: '0' }),
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
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createTestResistor({ id: 'R1', resistance: -1000, nodes: ['1', '0'] }), // Invalid!
      createTestGround({ id: 'GND', nodeId: '0' }),
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
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createTestVoltageSource({ id: 'V2', voltage: 10, nodes: ['1', '0'] }),
      createTestGround({ id: 'GND', nodeId: '0' }),
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
      createTestVoltageSource({ id: 'V1', voltage: 12, nodes: ['1', '0'] }),
      createTestResistor({ id: 'R1', resistance: 1000, nodes: ['1', '0'] }),
      createTestResistor({ id: 'R1', resistance: 2000, nodes: ['1', '0'] }), // Duplicate ID!
      createTestGround({ id: 'GND', nodeId: '0' }),
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
  NO_GROUND_ERROR,
  ZERO_RESISTANCE_ERROR,
  NEGATIVE_RESISTANCE_ERROR,
  SINGULAR_MATRIX_ERROR,
  EMPTY_CIRCUIT_ERROR,
  DUPLICATE_COMPONENT_ID_ERROR,
];
