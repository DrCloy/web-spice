import { describe, expect, it } from 'vitest';
import { InductorImpl } from '@/engine/components/inductor';
import type { Inductor } from '@/types/component';

/**
 * Helper function to create inductor test data with optional overrides
 */
function makeInductorData(overrides?: Partial<Inductor>): Inductor {
  return {
    id: 'L1',
    type: 'inductor',
    name: 'L1',
    inductance: 1e-3,
    terminals: [
      { name: 'terminal1', nodeId: 'n1' },
      { name: 'terminal2', nodeId: 'n2' },
    ],
    ...overrides,
  };
}

describe('Inductor', () => {
  describe('constructor (data object)', () => {
    it('should create an inductor with valid data object', () => {
      const inductor = new InductorImpl(makeInductorData());

      expect(inductor.id).toBe('L1');
      expect(inductor.type).toBe('inductor');
      expect(inductor.name).toBe('L1');
      expect(inductor.inductance).toBe(1e-3);
      expect(inductor.initialCurrent).toBeUndefined();
      expect(inductor.terminals).toHaveLength(2);
      expect(inductor.terminals[0]).toEqual({
        name: 'terminal1',
        nodeId: 'n1',
      });
      expect(inductor.terminals[1]).toEqual({
        name: 'terminal2',
        nodeId: 'n2',
      });
    });

    it('should use id as name when name is not provided', () => {
      const inductor = new InductorImpl(makeInductorData({ name: '' }));

      expect(inductor.name).toBe('L1');
    });

    it('should throw error for zero inductance', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: 0 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for negative inductance', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: -1e-3 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for invalid inductance (NaN)', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: NaN }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for invalid inductance (Infinity)', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: Infinity }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for inductance below minimum (< 1 nH)', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: 1e-10 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for inductance above maximum (> 1 kH)', () => {
      expect(
        () => new InductorImpl(makeInductorData({ inductance: 1e4 }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should throw error for empty component ID', () => {
      expect(
        () => new InductorImpl(makeInductorData({ id: '' }))
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for empty node IDs', () => {
      expect(
        () =>
          new InductorImpl(
            makeInductorData({
              terminals: [
                { name: 'terminal1', nodeId: '' },
                { name: 'terminal2', nodeId: 'n2' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');

      expect(
        () =>
          new InductorImpl(
            makeInductorData({
              terminals: [
                { name: 'terminal1', nodeId: 'n1' },
                { name: 'terminal2', nodeId: '' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for identical node IDs', () => {
      expect(
        () =>
          new InductorImpl(
            makeInductorData({
              terminals: [
                { name: 'terminal1', nodeId: 'n1' },
                { name: 'terminal2', nodeId: 'n1' },
              ],
            })
          )
      ).toThrowWebSpiceError('INVALID_COMPONENT');
    });

    it('should throw error for invalid initial current (NaN)', () => {
      expect(
        () => new InductorImpl(makeInductorData({ initialCurrent: NaN }))
      ).toThrowWebSpiceError('INVALID_PARAMETER');
    });

    it('should allow omitted initial current', () => {
      const inductor = new InductorImpl(makeInductorData());

      expect(inductor.initialCurrent).toBeUndefined();
    });

    it('should allow negative initial current', () => {
      const inductor = new InductorImpl(
        makeInductorData({ initialCurrent: -0.5 })
      );

      expect(inductor.initialCurrent).toBe(-0.5);
    });
  });

  describe('boundary values', () => {
    it('should accept minimum inductance (1 nH)', () => {
      const inductor = new InductorImpl(makeInductorData({ inductance: 1e-9 }));

      expect(inductor.inductance).toBe(1e-9);
    });

    it('should accept maximum inductance (1 kH)', () => {
      const inductor = new InductorImpl(makeInductorData({ inductance: 1e3 }));

      expect(inductor.inductance).toBe(1e3);
    });
  });

  describe('type compliance', () => {
    it('should match Inductor interface', () => {
      const inductor = new InductorImpl(makeInductorData());
      const typed: Inductor = inductor;

      expect(typed.id).toBe('L1');
      expect(typed.type).toBe('inductor');
      expect(typed.inductance).toBe(1e-3);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const inductor = new InductorImpl(
        makeInductorData({ initialCurrent: -0.5 })
      );
      const json = JSON.stringify(inductor);
      const parsed = JSON.parse(json);

      expect(parsed).toEqual({
        id: 'L1',
        type: 'inductor',
        name: 'L1',
        inductance: 1e-3,
        initialCurrent: -0.5,
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      });
    });
  });

  describe('immutability', () => {
    it('should not allow modification of terminals array', () => {
      const inductor = new InductorImpl(makeInductorData());
      const originalTerminals = inductor.terminals;

      originalTerminals[0] = { name: 'terminal2', nodeId: 'n99' };

      expect(inductor.terminals[0].nodeId).toBe('n1');
    });
  });
});
