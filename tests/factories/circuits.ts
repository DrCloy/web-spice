/**
 * Circuit factory functions for testing
 * These functions create complete test circuits
 */

import type { Circuit, Node } from '@/types/circuit';
import type { Component, ComponentId, NodeId } from '@/types/component';

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
