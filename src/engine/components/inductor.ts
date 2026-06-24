import type { Inductor, Terminal } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * Inductor component implementation.
 *
 * Inductance must be positive, finite, and within a practical range.
 * DC validation currently rejects inductors before MNA assembly, so this model
 * only stores validated component data for parsers and future analysis modes.
 */
export class InductorImpl implements Inductor {
  /** Minimum allowed inductance: 1 nH */
  private static readonly MIN_INDUCTANCE = 1e-9;
  /** Maximum allowed inductance: 1 kH */
  private static readonly MAX_INDUCTANCE = 1e3;
  private readonly _id!: string;
  private readonly _type = 'inductor' as const;
  private readonly _name!: string;
  private readonly _inductance!: number;
  private readonly _initialCurrent?: number;
  private readonly _terminals!: readonly [Terminal, Terminal];

  /**
   * Creates a new Inductor instance.
   *
   * @param data - Inductor data object
   * @throws {WebSpiceError} If parameters are invalid
   */
  constructor(data: Inductor) {
    if (!data.id || data.id.trim().length === 0) {
      throw new WebSpiceError(
        'INVALID_COMPONENT',
        'Component ID cannot be empty',
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

    if (!Number.isFinite(data.inductance)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Inductance must be a finite number',
        { componentId: data.id }
      );
    }

    if (data.inductance <= 0) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Inductance must be greater than 0',
        { componentId: data.id }
      );
    }

    if (
      data.inductance < InductorImpl.MIN_INDUCTANCE ||
      data.inductance > InductorImpl.MAX_INDUCTANCE
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Inductance must be between 1e-9 and 1e3 Henrys',
        { componentId: data.id }
      );
    }

    if (
      data.initialCurrent !== undefined &&
      !Number.isFinite(data.initialCurrent)
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Initial current must be a finite number',
        { componentId: data.id }
      );
    }

    this._id = data.id.trim();
    this._name = (data.name && data.name.trim()) || this._id;
    this._inductance = data.inductance;
    this._initialCurrent = data.initialCurrent;
    this._terminals = [
      { ...term1, nodeId: term1.nodeId.trim() },
      { ...term2, nodeId: term2.nodeId.trim() },
    ];
  }

  get id(): string {
    return this._id;
  }

  get type(): 'inductor' {
    return this._type;
  }

  get name(): string {
    return this._name;
  }

  get inductance(): number {
    return this._inductance;
  }

  get initialCurrent(): number | undefined {
    return this._initialCurrent;
  }

  get terminals(): [Terminal, Terminal] {
    return [{ ...this._terminals[0] }, { ...this._terminals[1] }];
  }

  toJSON(): Inductor {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      inductance: this._inductance,
      ...(this._initialCurrent !== undefined
        ? { initialCurrent: this._initialCurrent }
        : {}),
      terminals: this.terminals,
    };
  }
}
