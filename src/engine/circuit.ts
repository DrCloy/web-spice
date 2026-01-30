import type { Circuit, Node } from '@/types/circuit';
import type { Component, ComponentId, NodeId } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * Circuit implementation
 *
 * Manages a collection of components and provides circuit validation.
 * Nodes are derived dynamically from component terminals.
 *
 * @example
 * ```typescript
 * const circuit = new CircuitImpl({
 *   id: 'my-circuit',
 *   name: 'My Circuit',
 *   components: [resistor, voltageSource],
 *   groundNodeId: '0'
 * });
 *
 * circuit.addComponent(capacitor);
 * const validation = circuit.validate();
 * ```
 */
export class CircuitImpl implements Circuit {
  private readonly _id!: string;
  private readonly _name!: string;
  private readonly _description?: string;
  private readonly _components: Map<ComponentId, Component>;
  private readonly _groundNodeId!: NodeId;

  /**
   * Creates a new Circuit instance
   *
   * @param data - Circuit data object
   * @throws {WebSpiceError} If ID or name is empty
   *
   * @example
   * ```typescript
   * const circuit = new CircuitImpl({
   *   id: 'circuit1',
   *   name: 'Test Circuit',
   *   description: 'A test circuit',
   *   components: [r1, v1],
   *   groundNodeId: '0'
   * });
   * ```
   */
  constructor(data: {
    id: string;
    name: string;
    description?: string;
    components?: Component[];
    groundNodeId?: NodeId;
  }) {
    // Validate circuit ID
    if (!data.id || data.id.trim().length === 0) {
      throw new WebSpiceError('INVALID_CIRCUIT', 'Circuit ID cannot be empty');
    }

    // Validate circuit name
    if (!data.name || data.name.trim().length === 0) {
      throw new WebSpiceError(
        'INVALID_CIRCUIT',
        'Circuit name cannot be empty'
      );
    }

    // Initialize readonly fields
    this._id = data.id.trim();
    this._name = data.name.trim();
    this._description = data.description?.trim();
    this._groundNodeId = data.groundNodeId || '0';
    this._components = new Map<ComponentId, Component>();

    // Add initial components if provided
    if (data.components) {
      for (const component of data.components) {
        this.addComponent(component);
      }
    }
  }

  /**
   * Get the circuit ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the circuit name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the circuit description
   */
  get description(): string | undefined {
    return this._description;
  }

  /**
   * Get the ground node ID
   */
  get groundNodeId(): NodeId {
    return this._groundNodeId;
  }

  /**
   * Get all components in the circuit
   * Returns a defensive copy to prevent external modification
   */
  getComponents(): Component[] {
    return Array.from(this._components.values());
  }

  /**
   * Get all components (alias for getComponents)
   * Implements Circuit interface requirement
   */
  get components(): Component[] {
    return this.getComponents();
  }

  /**
   * Get all nodes in the circuit (placeholder)
   * Implements Circuit interface requirement
   */
  get nodes(): Node[] {
    return this.getNodes();
  }

  /**
   * Add a component to the circuit
   *
   * @param component - Component to add
   * @throws {WebSpiceError} If component ID already exists
   */
  addComponent(component: Component): void {
    if (this._components.has(component.id)) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        `Component with ID '${component.id}' already exists in circuit`,
        { componentId: component.id }
      );
    }

    this._components.set(component.id, component);
  }

  /**
   * Remove a component from the circuit
   *
   * @param id - Component ID to remove
   * @throws {WebSpiceError} If component not found
   */
  removeComponent(id: ComponentId): void {
    if (!this._components.has(id)) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        `Component with ID '${id}' not found in circuit`,
        { componentId: id }
      );
    }

    this._components.delete(id);
  }

  /**
   * Get a component by ID
   *
   * @param id - Component ID
   * @returns Component if found, undefined otherwise
   */
  getComponentById(id: ComponentId): Component | undefined {
    return this._components.get(id);
  }

  /**
   * Get all nodes derived from components
   * Nodes are computed dynamically from component terminals
   *
   * @returns Array of nodes with connection information
   */
  getNodes(): Node[] {
    const nodeSet = new Set<NodeId>();
    const nodeConnections = new Map<NodeId, ComponentId[]>();

    // Extract all unique nodes from components
    for (const component of this._components.values()) {
      if (component.type === 'ground') {
        // Ground component has a nodeId field
        nodeSet.add(component.nodeId);
        const connections = nodeConnections.get(component.nodeId) || [];
        connections.push(component.id);
        nodeConnections.set(component.nodeId, connections);
      } else if ('terminals' in component) {
        // Regular components have terminals array
        for (const terminal of component.terminals) {
          nodeSet.add(terminal.nodeId);
          const connections = nodeConnections.get(terminal.nodeId) || [];
          connections.push(component.id);
          nodeConnections.set(terminal.nodeId, connections);
        }
      }
    }

    // Create node objects
    const nodes: Node[] = Array.from(nodeSet)
      .sort() // Sort for deterministic ordering
      .map(nodeId => ({
        id: nodeId,
        name: nodeId === this._groundNodeId ? 'Ground' : `Node ${nodeId}`,
        isGround: nodeId === this._groundNodeId,
        connectedComponents: nodeConnections.get(nodeId) || [],
      }));

    return nodes;
  }

  /**
   * Validate circuit topology and structure
   *
   * Checks for:
   * - Empty circuit (no components)
   * - Missing ground node
   * - Floating nodes (nodes with 0 or 1 connection, except ground)
   *
   * @returns Validation result with errors if any
   */
  validate(): { valid: boolean; errors: WebSpiceError[] } {
    const errors: WebSpiceError[] = [];

    // 1. Check for empty circuit
    if (this._components.size === 0) {
      errors.push(
        new WebSpiceError(
          'INVALID_CIRCUIT',
          'Circuit must have at least one component'
        )
      );
      return { valid: false, errors };
    }

    // Get all nodes from components
    const nodes = this.getNodes();

    // 2. Check for ground node existence
    const groundNode = nodes.find(n => n.id === this._groundNodeId);
    if (!groundNode) {
      errors.push(
        new WebSpiceError(
          'NO_GROUND',
          `Ground node '${this._groundNodeId}' not found in circuit`
        )
      );
    }

    // 3. Check for floating nodes
    for (const node of nodes) {
      if (node.connectedComponents.length === 0) {
        // Node with no connections
        errors.push(
          new WebSpiceError(
            'FLOATING_NODE',
            `Node '${node.id}' has no connections`,
            { nodeId: node.id }
          )
        );
      } else if (node.connectedComponents.length === 1 && !node.isGround) {
        // Non-ground node with only one connection
        errors.push(
          new WebSpiceError(
            'FLOATING_NODE',
            `Node '${node.id}' is connected to only one component`,
            { nodeId: node.id }
          )
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Serialize to JSON
   * Required for JSON.stringify() since getters are not enumerable
   */
  toJSON(): Circuit {
    // TODO: Implement in Phase 5
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      components: this.getComponents(),
      nodes: this.getNodes(),
      groundNodeId: this._groundNodeId,
    };
  }

  /**
   * Deserialize from JSON
   *
   * @param data - Circuit data object
   * @returns New CircuitImpl instance
   */
  static fromJSON(data: Circuit): CircuitImpl {
    // TODO: Implement in Phase 5
    return new CircuitImpl({
      id: data.id,
      name: data.name,
      description: data.description,
      groundNodeId: data.groundNodeId,
      components: data.components,
    });
  }
}
