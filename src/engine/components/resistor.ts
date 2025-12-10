import type { Resistor, Terminal } from '@/types/component';
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
 * const r1 = new ResistorImpl('R1', 'node1', 'node2', 1000); // 1kΩ resistor
 * ```
 */
export class ResistorImpl implements Resistor {
  /** Minimum allowed resistance: 1 mΩ (milli-ohm) */
  private static readonly MIN_RESISTANCE = 1e-3;
  /** Maximum allowed resistance: 1 TΩ (tera-ohm) */
  private static readonly MAX_RESISTANCE = 1e12;
  private _id!: string;
  private _type = 'resistor' as const;
  private _name!: string;
  private _resistance!: number;
  private _terminals!: readonly [Terminal, Terminal];

  /**
   * Creates a new Resistor instance
   *
   * @param data - Resistor data object
   * @throws {WebSpiceError} If parameters are invalid
   *
   * @example
   * ```typescript
   * const resistor = new ResistorImpl({
   *   id: 'R1',
   *   type: 'resistor',
   *   name: 'R1',
   *   resistance: 1000,
   *   terminals: [
   *     { name: 'terminal1', nodeId: 'n1' },
   *     { name: 'terminal2', nodeId: 'n2' }
   *   ]
   * });
   * ```
   */
  constructor(data: Resistor) {
    this.initFromData(data);
  }

  /**
   * Initialize from data object
   */
  private initFromData(data: Resistor): void {
    // Validate component ID
    if (!data.id || data.id.trim().length === 0) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Component ID cannot be empty',
        { componentId: data.id }
      );
    }

    // Validate terminals
    if (!data.terminals || data.terminals.length !== 2) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Resistor must have exactly 2 terminals',
        { componentId: data.id }
      );
    }

    const [term1, term2] = data.terminals;

    if (!term1.nodeId || term1.nodeId.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: data.id,
      });
    }

    if (!term2.nodeId || term2.nodeId.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: data.id,
      });
    }

    if (term1.nodeId.trim() === term2.nodeId.trim()) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Terminals cannot be connected to the same node',
        { componentId: data.id }
      );
    }

    // Validate resistance
    // NOTE: Resistance must be positive due to physical constraints.
    // Unlike voltage/current sources which can have negative values (reversed polarity),
    // resistance is a physical property that cannot be negative or zero.
    if (!Number.isFinite(data.resistance)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Resistance must be a valid number',
        { componentId: data.id }
      );
    }

    if (data.resistance <= 0) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Resistance must be greater than 0',
        { componentId: data.id }
      );
    }

    if (
      data.resistance < ResistorImpl.MIN_RESISTANCE ||
      data.resistance > ResistorImpl.MAX_RESISTANCE
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        `Resistance must be between 1e-3 and 1e12 Ohms`,
        { componentId: data.id }
      );
    }

    // Initialize
    this._id = data.id.trim();
    this._name = data.name || data.id.trim();
    this._resistance = data.resistance;
    this._terminals = [
      { ...term1, nodeId: term1.nodeId.trim() },
      { ...term2, nodeId: term2.nodeId.trim() },
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
  toJSON(): Resistor {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      resistance: this._resistance,
      terminals: this.terminals,
    };
  }
}
