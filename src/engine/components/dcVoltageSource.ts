import type { DCVoltageSource, Terminal } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * DC Voltage Source component implementation
 *
 * Represents a DC voltage source in a SPICE circuit. The voltage source maintains
 * a constant voltage difference between its positive and negative terminals.
 *
 * @example
 * ```typescript
 * // Create a 12V DC source
 * const battery = new DCVoltageSourceImpl('V1', 'vcc', 'gnd', 12);
 *
 * // Negative voltage (reversed polarity)
 * const reversed = new DCVoltageSourceImpl('V2', 'n1', 'n2', -5);
 *
 * // Zero voltage (short circuit)
 * const short = new DCVoltageSourceImpl('V3', 'n1', 'n2', 0);
 * ```
 */
export class DCVoltageSourceImpl implements DCVoltageSource {
  private readonly _id!: string;
  private readonly _type = 'voltage_source' as const;
  private readonly _sourceType = 'dc' as const;
  private readonly _name!: string;
  private readonly _voltage!: number;
  private readonly _terminals!: readonly [Terminal, Terminal];

  /**
   * Creates a new DC voltage source
   *
   * @param data - DC voltage source data object
   * @throws {WebSpiceError} If parameters are invalid
   *
   * @example
   * ```typescript
   * const battery = new DCVoltageSourceImpl({
   *   id: 'V1',
   *   type: 'voltage_source',
   *   sourceType: 'dc',
   *   name: 'V1',
   *   voltage: 12,
   *   terminals: [
   *     { name: 'pos', nodeId: 'vcc' },
   *     { name: 'neg', nodeId: 'gnd' }
   *   ]
   * });
   * ```
   */
  constructor(data: DCVoltageSource) {
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
        'DC voltage source must have exactly 2 terminals',
        { componentId: data.id }
      );
    }

    const [termPos, termNeg] = data.terminals;

    if (!termPos.nodeId || termPos.nodeId.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: data.id,
      });
    }

    if (!termNeg.nodeId || termNeg.nodeId.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: data.id,
      });
    }

    if (termPos.nodeId.trim() === termNeg.nodeId.trim()) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Terminals cannot be connected to the same node',
        { componentId: data.id }
      );
    }

    // Validate voltage
    // NOTE: Voltage can be negative (reversed polarity) or zero (inactive source).
    // This is intentionally different from resistors which must have positive resistance.
    // Only validates that the value is a finite number.
    if (!Number.isFinite(data.voltage)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Voltage must be a valid number',
        { componentId: data.id }
      );
    }

    // Initialize readonly fields
    this._id = data.id.trim();
    this._name = data.name || data.id.trim();
    this._voltage = data.voltage;
    this._terminals = [
      { ...termPos, nodeId: termPos.nodeId.trim() },
      { ...termNeg, nodeId: termNeg.nodeId.trim() },
    ];
  }

  get id(): string {
    return this._id;
  }

  get type(): 'voltage_source' {
    return this._type;
  }

  get sourceType(): 'dc' {
    return this._sourceType;
  }

  get name(): string {
    return this._name;
  }

  get voltage(): number {
    return this._voltage;
  }

  get terminals(): [Terminal, Terminal] {
    return [{ ...this._terminals[0] }, { ...this._terminals[1] }] as [
      Terminal,
      Terminal,
    ];
  }

  /**
   * Serializes the voltage source to a plain object
   *
   * @returns Plain object representation for debugging/logging
   */
  toJSON(): DCVoltageSource {
    return {
      id: this._id,
      type: this._type,
      sourceType: this._sourceType,
      name: this._name,
      voltage: this._voltage,
      terminals: this.terminals,
    };
  }
}
