import type { DCCurrentSource, NodeId, Terminal } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * DC Current Source component implementation
 *
 * Represents a DC current source in a SPICE circuit. The current source maintains
 * a constant current flowing between its positive and negative terminals.
 *
 * @example
 * ```typescript
 * // Create a 12A DC source
 * const currentSource = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);
 *
 * // Negative current (reversed polarity)
 * const reversed = new DCCurrentSourceImpl('I2', 'n1', 'n2', -5);
 *
 * // Zero current (open circuit)
 * const short = new DCCurrentSourceImpl('I3', 'n1', 'n2', 0);
 * ```
 */
export class DCCurrentSourceImpl implements DCCurrentSource {
  private readonly _id: string;
  private readonly _type = 'current_source' as const;
  private readonly _sourceType = 'dc' as const;
  private readonly _name: string;
  private readonly _current: number;
  private readonly _terminals: readonly [Terminal, Terminal];

  /**
   * Creates a new DC current source
   *
   * @param id - Unique component identifier
   * @param nodePos - Positive terminal node ID
   * @param nodeNeg - Negative terminal node ID
   * @param current - Current in Amperes (can be negative for reversed polarity)
   * @throws {WebSpiceError} If parameters are invalid
   */
  constructor(id: string, nodePos: NodeId, nodeNeg: NodeId, current: number) {
    // Validate component ID
    if (!id || id.trim().length === 0) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Component ID cannot be empty',
        { componentId: id }
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

    // Validate current
    if (!Number.isFinite(current)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Current must be a valid number',
        { componentId: id }
      );
    }

    this._id = id.trim();
    this._name = id.trim();
    this._current = current;
    this._terminals = [
      { name: 'pos', nodeId: nodePos.trim() },
      { name: 'neg', nodeId: nodeNeg.trim() },
    ];
  }

  get id(): string {
    return this._id;
  }

  get type(): 'current_source' {
    return this._type;
  }

  get sourceType(): 'dc' {
    return this._sourceType;
  }

  get name(): string {
    return this._name;
  }

  get current(): number {
    return this._current;
  }

  get terminals(): [Terminal, Terminal] {
    return [{ ...this._terminals[0] }, { ...this._terminals[1] }] as [
      Terminal,
      Terminal,
    ];
  }

  /**
   * Serializes the current source to a plain object
   *
   * @returns Plain object representation for debugging/logging
   */
  toJSON(): DCCurrentSource {
    return {
      id: this._id,
      type: this._type,
      sourceType: this._sourceType,
      name: this._name,
      current: this._current,
      terminals: this.terminals,
    };
  }
}
