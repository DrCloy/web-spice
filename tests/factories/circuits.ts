/**
 * Circuit factory functions for testing
 * These functions create complete test circuits
 */

import type { Circuit } from '@/types/circuit';
import type { Component, NodeId } from '@/types/component';
import { CircuitImpl } from '@/engine/circuit';

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

  const circuit = new CircuitImpl({
    id,
    name,
    description,
    groundNodeId,
  });

  for (const component of components) {
    circuit.addComponent(component);
  }

  return circuit.toJSON();
}
