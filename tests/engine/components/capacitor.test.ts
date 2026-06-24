import { describe, expect, it } from 'vitest';
import { CapacitorImpl } from '@/engine/components/capacitor';
import type { Capacitor } from '@/types/component';

/**
 * Helper function to create capacitor test data with optional overrides
 */
function makeCapacitorData(overrides?: Partial<Capacitor>): Capacitor {
  return {
    id: 'C1',
    type: 'capacitor',
    name: 'C1',
    capacitance: 1e-6,
    terminals: [
      { name: 'pos', nodeId: 'n1' },
      { name: 'neg', nodeId: 'n2' },
    ],
    ...overrides,
  };
}

describe('Capacitor', () => {
  describe('constructor (data object)', () => {
    it('should create a capacitor with valid data object', () => {
      const capacitor = new CapacitorImpl(makeCapacitorData());

      expect(capacitor.id).toBe('C1');
      expect(capacitor.type).toBe('capacitor');
      expect(capacitor.name).toBe('C1');
      expect(capacitor.capacitance).toBe(1e-6);
      expect(capacitor.initialVoltage).toBeUndefined();
      expect(capacitor.terminals).toHaveLength(2);
      expect(capacitor.terminals[0]).toEqual({
        name: 'pos',
        nodeId: 'n1',
      });
      expect(capacitor.terminals[1]).toEqual({
        name: 'neg',
        nodeId: 'n2',
      });
    });

    it('should use id as name when name is not provided', () => {
      const capacitor = new CapacitorImpl(makeCapacitorData({ name: '' }));

      expect(capacitor.name).toBe('C1');
    });

    it('should throw error for zero capacitance', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: 0 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for negative capacitance', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: -1e-6 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for invalid capacitance (NaN)', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: NaN }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for invalid capacitance (Infinity)', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: Infinity }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for capacitance below minimum (< 1 pF)', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: 1e-13 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for capacitance above maximum (> 1 F)', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ capacitance: 2 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for empty component ID', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ id: '' }))
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for empty node IDs', () => {
      expect(
        () =>
          new CapacitorImpl(
            makeCapacitorData({
              terminals: [
                { name: 'pos', nodeId: '' },
                { name: 'neg', nodeId: 'n2' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');

      expect(
        () =>
          new CapacitorImpl(
            makeCapacitorData({
              terminals: [
                { name: 'pos', nodeId: 'n1' },
                { name: 'neg', nodeId: '' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for identical node IDs', () => {
      expect(
        () =>
          new CapacitorImpl(
            makeCapacitorData({
              terminals: [
                { name: 'pos', nodeId: 'n1' },
                { name: 'neg', nodeId: 'n1' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for invalid initial voltage (NaN)', () => {
      expect(
        () => new CapacitorImpl(makeCapacitorData({ initialVoltage: NaN }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should allow omitted initial voltage', () => {
      const capacitor = new CapacitorImpl(makeCapacitorData());

      expect(capacitor.initialVoltage).toBeUndefined();
    });

    it('should allow negative initial voltage', () => {
      const capacitor = new CapacitorImpl(
        makeCapacitorData({ initialVoltage: -5 })
      );

      expect(capacitor.initialVoltage).toBe(-5);
    });
  });

  describe('boundary values', () => {
    it('should accept minimum capacitance (1 pF)', () => {
      const capacitor = new CapacitorImpl(
        makeCapacitorData({ capacitance: 1e-12 })
      );

      expect(capacitor.capacitance).toBe(1e-12);
    });

    it('should accept maximum capacitance (1 F)', () => {
      const capacitor = new CapacitorImpl(
        makeCapacitorData({ capacitance: 1 })
      );

      expect(capacitor.capacitance).toBe(1);
    });
  });

  describe('type compliance', () => {
    it('should match Capacitor interface', () => {
      const capacitor = new CapacitorImpl(makeCapacitorData());
      const typed: Capacitor = capacitor;

      expect(typed.id).toBe('C1');
      expect(typed.type).toBe('capacitor');
      expect(typed.capacitance).toBe(1e-6);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const capacitor = new CapacitorImpl(
        makeCapacitorData({ initialVoltage: -5 })
      );
      const json = JSON.stringify(capacitor);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({
        id: 'C1',
        type: 'capacitor',
        name: 'C1',
        capacitance: 1e-6,
        initialVoltage: -5,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      });
    });
  });

  describe('immutability', () => {
    it('should not allow modification of terminals array', () => {
      const capacitor = new CapacitorImpl(makeCapacitorData());
      const originalTerminals = capacitor.terminals;

      originalTerminals[0] = { name: 'neg', nodeId: 'n99' };

      expect(capacitor.terminals[0].nodeId).toBe('n1');
    });
  });
});
