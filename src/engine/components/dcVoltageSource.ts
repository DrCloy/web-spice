import type { DCVoltageSource, NodeId, Terminal } from '@/types/component';
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
  private readonly _id: string;
  private readonly _type = 'voltage_source' as const;
  private readonly _sourceType = 'dc' as const;
  private readonly _name: string;
  private readonly _voltage: number;
  private readonly _terminals: readonly [Terminal, Terminal];

  /**
   * Creates a new DC voltage source
   *
   * @param id - Unique component identifier
   * @param nodePos - Positive terminal node ID
   * @param nodeNeg - Negative terminal node ID
   * @param voltage - Voltage in Volts (can be negative for reversed polarity)
   * @throws {WebSpiceError} If parameters are invalid
   */
  constructor(id: string, nodePos: NodeId, nodeNeg: NodeId, voltage: number) {
    // Validate component ID
    if (!id || id.trim().length === 0) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Component ID cannot be empty'
      );
    }

    // Validate node IDs
    if (!nodePos || nodePos.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: id,
      });
    }

    if (!nodeNeg || nodeNeg.trim().length === 0) {
      throw new WebSpiceError('INVALID_COMPONENT', 'Node ID cannot be empty', {
        componentId: id,
      });
    }

    if (nodePos.trim() === nodeNeg.trim()) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Terminals cannot be connected to the same node',
        { componentId: id }
      );
    }

    // Validate voltage
    if (!Number.isFinite(voltage)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Voltage must be a valid number',
        { componentId: id }
      );
    }

    this._id = id.trim();
    this._name = id.trim();
    this._voltage = voltage;
    this._terminals = [
      { name: 'pos', nodeId: nodePos.trim() },
      { name: 'neg', nodeId: nodeNeg.trim() },
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
