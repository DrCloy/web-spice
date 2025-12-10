import type { DCCurrentSource, Terminal } from '@/types/component';
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
  private _id!: string;
  private _type = 'current_source' as const;
  private _sourceType = 'dc' as const;
  private _name!: string;
  private _current!: number;
  private _terminals!: readonly [Terminal, Terminal];

  /**
   * Creates a new DC current source
   *
   * @param data - DC current source data object
   * @throws {WebSpiceError} If parameters are invalid
   *
   * @example
   * ```typescript
   * const currentSource = new DCCurrentSourceImpl({
   *   id: 'I1',
   *   type: 'current_source',
   *   sourceType: 'dc',
   *   name: 'I1',
   *   current: 12,
   *   terminals: [
   *     { name: 'pos', nodeId: 'n1' },
   *     { name: 'neg', nodeId: 'n2' }
   *   ]
   * });
   * ```
   */
  constructor(data: DCCurrentSource) {
    this.initFromData(data);
  }

  /**
   * Initialize from data object
   */
  private initFromData(data: DCCurrentSource): void {
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
        'DC current source must have exactly 2 terminals',
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

    // Validate current
    // NOTE: Current can be negative (reversed direction) or zero (inactive source).
    // This is intentionally different from resistors which must have positive resistance.
    // Only validates that the value is a finite number.
    if (!Number.isFinite(data.current)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Current must be a valid number',
        { componentId: data.id }
      );
    }

    // Initialize
    this._id = data.id.trim();
    this._name = data.name || data.id.trim();
    this._current = data.current;
    this._terminals = [
      { ...termPos, nodeId: termPos.nodeId.trim() },
      { ...termNeg, nodeId: termNeg.nodeId.trim() },
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
