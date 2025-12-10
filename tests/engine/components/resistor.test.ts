import { describe, expect, it } from 'vitest';
import { ResistorImpl } from '@/engine/components/resistor';
import type { Resistor } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

/**
 * Helper function to create resistor test data with optional overrides
 */
function makeResistorData(overrides?: Partial<Resistor>): Resistor {
  return {
    id: 'R1',
    type: 'resistor',
    name: 'R1',
    resistance: 1000,
    terminals: [
      { name: 'terminal1', nodeId: 'n1' },
      { name: 'terminal2', nodeId: 'n2' },
    ],
    ...overrides,
  };
}

describe('Resistor', () => {
  describe('constructor (new API: data object)', () => {
    it('should create a resistor with valid data object', () => {
      const resistor = new ResistorImpl(makeResistorData());

      expect(resistor.id).toBe('R1');
      expect(resistor.type).toBe('resistor');
      expect(resistor.name).toBe('R1');
      expect(resistor.resistance).toBe(1000);
      expect(resistor.terminals).toHaveLength(2);
      expect(resistor.terminals[0]).toEqual({
        name: 'terminal1',
        nodeId: 'n1',
      });
      expect(resistor.terminals[1]).toEqual({
        name: 'terminal2',
        nodeId: 'n2',
      });
    });

    it('should use id as name when name is not provided', () => {
      const resistor = new ResistorImpl(makeResistorData({ name: '' }));

      expect(resistor.name).toBe('R1');
    });

    it('should throw error for zero resistance', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: 0 }))
      ).toThrow('Resistance must be greater than 0');
    });

    it('should throw error for negative resistance', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: -100 }))
      ).toThrow('Resistance must be greater than 0');
    });

    it('should throw error for invalid resistance (NaN)', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: NaN }))
      ).toThrow('Resistance must be a valid number');
    });

    it('should throw error for invalid resistance (Infinity)', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: Infinity }))
      ).toThrow('Resistance must be a valid number');
    });

    it('should throw error for empty component ID', () => {
      expect(() => new ResistorImpl(makeResistorData({ id: '' }))).toThrow(
        'Component ID cannot be empty'
      );
    });

    it('should throw error for empty node IDs', () => {
      expect(
        () =>
          new ResistorImpl(
            makeResistorData({
              terminals: [
                { name: 'terminal1', nodeId: '' },
                { name: 'terminal2', nodeId: 'n2' },
              ],
            })
          )
      ).toThrow(WebSpiceError);

      expect(
        () =>
          new ResistorImpl(
            makeResistorData({
              terminals: [
                { name: 'terminal1', nodeId: 'n1' },
                { name: 'terminal2', nodeId: '' },
              ],
            })
          )
      ).toThrow(WebSpiceError);
    });

    it('should throw error for identical node IDs', () => {
      expect(
        () =>
          new ResistorImpl(
            makeResistorData({
              terminals: [
                { name: 'terminal1', nodeId: 'n1' },
                { name: 'terminal2', nodeId: 'n1' },
              ],
            })
          )
      ).toThrow('Terminals cannot be connected to the same node');
    });

    it('should throw error for node IDs that are identical after trimming', () => {
      expect(
        () =>
          new ResistorImpl(
            makeResistorData({
              terminals: [
                { name: 'terminal1', nodeId: ' n1 ' },
                { name: 'terminal2', nodeId: 'n1' },
              ],
            })
          )
      ).toThrow('Terminals cannot be connected to the same node');
    });

    it('should throw error for invalid terminals (not exactly 2)', () => {
      expect(
        () =>
          new ResistorImpl(
            makeResistorData({
              terminals: [{ name: 'terminal1', nodeId: 'n1' }] as any,
            })
          )
      ).toThrow('Resistor must have exactly 2 terminals');
    });
  });

  describe('boundary values', () => {
    it('should accept minimum resistance (1 mΩ)', () => {
      const resistor = new ResistorImpl(makeResistorData({ resistance: 1e-3 }));
      expect(resistor.resistance).toBe(1e-3);
    });

    it('should accept maximum resistance (1 TΩ)', () => {
      const resistor = new ResistorImpl(makeResistorData({ resistance: 1e12 }));
      expect(resistor.resistance).toBe(1e12);
    });

    it('should throw error for resistance below minimum (< 1 mΩ)', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: 1e-4 }))
      ).toThrow('Resistance must be between 1e-3 and 1e12 Ohms');
    });

    it('should throw error for resistance above maximum (> 1 TΩ)', () => {
      expect(
        () => new ResistorImpl(makeResistorData({ resistance: 1e13 }))
      ).toThrow('Resistance must be between 1e-3 and 1e12 Ohms');
    });

    it('should accept typical resistor values', () => {
      const values = [1, 10, 100, 1000, 10000, 100000, 1000000];
      values.forEach(value => {
        const resistor = new ResistorImpl(
          makeResistorData({
            id: `R${value}`,
            name: `R${value}`,
            resistance: value,
          })
        );
        expect(resistor.resistance).toBe(value);
      });
    });
  });

  describe('type compliance', () => {
    it('should match ResistorType interface', () => {
      const resistor = new ResistorImpl(makeResistorData());
      const typed: Resistor = resistor;

      expect(typed.id).toBe('R1');
      expect(typed.type).toBe('resistor');
      expect(typed.resistance).toBe(1000);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const resistor = new ResistorImpl(makeResistorData());
      const json = JSON.stringify(resistor);
      const parsed = JSON.parse(json);

      // Verify serialization to plain object (for debugging/logging purposes)
      expect(parsed).toEqual({
        id: 'R1',
        type: 'resistor',
        name: 'R1',
        resistance: 1000,
        terminals: [
          { name: 'terminal1', nodeId: 'n1' },
          { name: 'terminal2', nodeId: 'n2' },
        ],
      });
    });
  });

  describe('immutability', () => {
    it('should have immutable resistance value', () => {
      const resistor = new ResistorImpl(makeResistorData());

      // Attempt modification (may throw in strict mode or silently fail)
      try {
        (resistor as any).resistance = 2000;
      } catch {
        // Expected in strict mode - setter-only property assignment throws TypeError
      }

      // Value must remain unchanged regardless of environment
      expect(resistor.resistance).toBe(1000);
    });

    it('should not allow modification of terminals array', () => {
      const resistor = new ResistorImpl(makeResistorData());
      const originalTerminals = resistor.terminals;
      // Attempt to modify should not affect internal state
      originalTerminals[0] = { name: 'modified', nodeId: 'n99' };
      expect(resistor.terminals[0].nodeId).toBe('n1');
    });
  });
});
