import type {
  NodeId,
  Resistor as ResistorType,
  Terminal,
} from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * Resistor component implementation
 *
 * Implements a linear resistor following Ohm's law: V = I × R
 * Resistance must be positive, finite, and within the valid range.
 *
 * Valid resistance range: 1mΩ (0.001Ω) to 1TΩ (1e12Ω)
 *
 * @example
 * ```typescript
 * const r1 = new Resistor('R1', 'node1', 'node2', 1000); // 1kΩ resistor
 * ```
 */
export class Resistor implements ResistorType {
  /** Minimum allowed resistance: 1 mΩ (milli-ohm) */
  private static readonly MIN_RESISTANCE = 1e-3;
  /** Maximum allowed resistance: 1 TΩ (tera-ohm) */
  private static readonly MAX_RESISTANCE = 1e12;
  private readonly _id: string;
  private readonly _type = 'resistor' as const;
  private readonly _name: string;
  private readonly _resistance: number;
  private readonly _terminals: readonly [Terminal, Terminal];

  /**
   * Creates a new Resistor instance
   *
   * @param id - Unique component identifier
   * @param node1 - First terminal node ID
   * @param node2 - Second terminal node ID
   * @param resistance - Resistance value in Ohms (must be between 1mΩ and 1TΩ)
   * @throws {WebSpiceError} If parameters are invalid
   */
  constructor(id: string, node1: NodeId, node2: NodeId, resistance: number) {
    // Validate component ID
    if (!id || id.trim() === '') {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Component ID cannot be empty',
        { componentId: id }
      );
    }

    // Validate node IDs
    if (!node1 || node1.trim() === '') {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: id,
      });
    }

    if (!node2 || node2.trim() === '') {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: id,
      });
    }

    if (node1 === node2) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Terminals cannot be connected to the same node',
        { componentId: id }
      );
    }

    // Validate resistance
    if (!Number.isFinite(resistance)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Resistance must be a valid number',
        { componentId: id }
      );
    }

    if (resistance <= 0) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Resistance must be greater than 0',
        { componentId: id }
      );
    }

    if (
      resistance < Resistor.MIN_RESISTANCE ||
      resistance > Resistor.MAX_RESISTANCE
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        `Resistance must be between 1e-3 and 1e12 Ohms`,
        { componentId: id }
      );
    }

    this._id = id.trim();
    this._name = id.trim();
    this._resistance = resistance;
    this._terminals = [
      { name: 'terminal1', nodeId: node1.trim() },
      { name: 'terminal2', nodeId: node2.trim() },
    ];
  }

  /**
   * Get the component ID
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the component type
   */
  get type(): 'resistor' {
    return this._type;
  }

  /**
   * Get the component name
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the resistance value
   */
  get resistance(): number {
    return this._resistance;
  }

  /**
   * Get the terminals of the resistor
   * Returns a copy to prevent external modification
   */
  get terminals(): [Terminal, Terminal] {
    return [{ ...this._terminals[0] }, { ...this._terminals[1] }] as [
      Terminal,
      Terminal,
    ];
  }

  /**
   * Serialize to JSON
   * Required for JSON.stringify() since getters are not enumerable
   */
  toJSON(): ResistorType {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      resistance: this._resistance,
      terminals: this.terminals,
    };
  }
}
