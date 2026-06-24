import type { Capacitor, Terminal } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * Capacitor component implementation.
 *
 * Capacitance must be positive, finite, and within a practical range.
 * DC analysis treats capacitors as open circuits, so this model only stores
 * validated component data for parsers and future analysis modes.
 */
export class CapacitorImpl implements Capacitor {
  /** Minimum allowed capacitance: 1 pF */
  private static readonly MIN_CAPACITANCE = 1e-12;
  /** Maximum allowed capacitance: 1 F */
  private static readonly MAX_CAPACITANCE = 1.0;
  private readonly _id!: string;
  private readonly _type = 'capacitor' as const;
  private readonly _name!: string;
  private readonly _capacitance!: number;
  private readonly _initialVoltage?: number;
  private readonly _terminals!: readonly [Terminal, Terminal];

  /**
   * Creates a new Capacitor instance.
   *
   * @param data - Capacitor data object
   * @throws {WebSpiceError} If parameters are invalid
   */
  constructor(data: Capacitor) {
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

    if (!Number.isFinite(data.capacitance)) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Capacitance must be a finite number',
        { componentId: data.id }
      );
    }

    if (data.capacitance <= 0) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Capacitance must be greater than 0',
        { componentId: data.id }
      );
    }

    if (
      data.capacitance < CapacitorImpl.MIN_CAPACITANCE ||
      data.capacitance > CapacitorImpl.MAX_CAPACITANCE
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Capacitance must be between 1e-12 and 1 Farads',
        { componentId: data.id }
      );
    }

    if (
      data.initialVoltage !== undefined &&
      !Number.isFinite(data.initialVoltage)
    ) {
      throw new WebSpiceError(
        'INVALID_PARAMETER',
        'Initial voltage must be a finite number',
        { componentId: data.id }
      );
    }

    this._id = data.id.trim();
    this._name = (data.name && data.name.trim()) || this._id;
    this._capacitance = data.capacitance;
    this._initialVoltage = data.initialVoltage;
    this._terminals = [
      { ...term1, nodeId: term1.nodeId.trim() },
      { ...term2, nodeId: term2.nodeId.trim() },
    ];
  }

  get id(): string {
    return this._id;
  }

  get type(): 'capacitor' {
    return this._type;
  }

  get name(): string {
    return this._name;
  }

  get capacitance(): number {
    return this._capacitance;
  }

  get initialVoltage(): number | undefined {
    return this._initialVoltage;
  }

  get terminals(): [Terminal, Terminal] {
    return [{ ...this._terminals[0] }, { ...this._terminals[1] }];
  }

  toJSON(): Capacitor {
    return {
      id: this._id,
      type: this._type,
      name: this._name,
      capacitance: this._capacitance,
      ...(this._initialVoltage !== undefined
        ? { initialVoltage: this._initialVoltage }
        : {}),
      terminals: this.terminals,
    };
  }
}
