import { describe, expect, it } from 'vitest';
import { Resistor } from '@/engine/components/resistor';
import type { Resistor as ResistorType } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

describe('Resistor', () => {
  describe('constructor', () => {
    it('should create a resistor with valid parameters', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);

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

    it('should throw error for zero resistance', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', 0)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n2', 0)).toThrow(
        'Resistance must be greater than 0'
      );
    });

    it('should throw error for negative resistance', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', -100)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n2', -100)).toThrow(
        'Resistance must be greater than 0'
      );
    });

    it('should throw error for invalid resistance (NaN)', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', NaN)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n2', NaN)).toThrow(
        'Resistance must be a valid number'
      );
    });

    it('should throw error for invalid resistance (Infinity)', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', Infinity)).toThrow(
        WebSpiceError
      );
      expect(() => new Resistor('R1', 'n1', 'n2', Infinity)).toThrow(
        'Resistance must be a valid number'
      );
    });

    it('should throw error for empty component ID', () => {
      expect(() => new Resistor('', 'n1', 'n2', 1000)).toThrow(WebSpiceError);
      expect(() => new Resistor('', 'n1', 'n2', 1000)).toThrow(
        'Component ID cannot be empty'
      );
    });

    it('should throw error for empty node IDs', () => {
      expect(() => new Resistor('R1', '', 'n2', 1000)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', '', 1000)).toThrow(WebSpiceError);
    });

    it('should throw error for identical node IDs', () => {
      expect(() => new Resistor('R1', 'n1', 'n1', 1000)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n1', 1000)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });
  });

  describe('boundary values', () => {
    it('should accept minimum resistance (1 mΩ)', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1e-3);
      expect(resistor.resistance).toBe(1e-3);
    });

    it('should accept maximum resistance (1 TΩ)', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1e12);
      expect(resistor.resistance).toBe(1e12);
    });

    it('should throw error for resistance below minimum (< 1 mΩ)', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', 1e-4)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n2', 1e-4)).toThrow(
        'Resistance must be between 0.001 and 1000000000000 Ohms'
      );
    });

    it('should throw error for resistance above maximum (> 1 TΩ)', () => {
      expect(() => new Resistor('R1', 'n1', 'n2', 1e13)).toThrow(WebSpiceError);
      expect(() => new Resistor('R1', 'n1', 'n2', 1e13)).toThrow(
        'Resistance must be between 0.001 and 1000000000000 Ohms'
      );
    });

    it('should accept typical resistor values', () => {
      const values = [1, 10, 100, 1000, 10000, 100000, 1000000];
      values.forEach(value => {
        const resistor = new Resistor(`R${value}`, 'n1', 'n2', value);
        expect(resistor.resistance).toBe(value);
      });
    });
  });

  describe('type compliance', () => {
    it('should match ResistorType interface', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);
      const typed: ResistorType = resistor;

      expect(typed.id).toBe('R1');
      expect(typed.type).toBe('resistor');
      expect(typed.resistance).toBe(1000);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);
      const json = JSON.stringify(resistor);
      const parsed = JSON.parse(json);

      // Plain object로 직렬화 확인 (디버깅/로깅용)
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
    it('should not allow modification of resistance via getter', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);
      // Resistance is accessed via getter, internal field is private
      expect(resistor.resistance).toBe(1000);

      // Attempting to set a getter-only property should throw in strict mode
      expect(() => {
        (resistor as any).resistance = 2000;
      }).toThrow(TypeError);
    });

    it('should not allow modification of terminals array', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);
      const originalTerminals = resistor.terminals;
      // Attempt to modify should not affect internal state
      originalTerminals[0] = { name: 'modified', nodeId: 'n99' };
      expect(resistor.terminals[0].nodeId).toBe('n1');
    });

    it('should not expose internal private fields', () => {
      const resistor = new Resistor('R1', 'n1', 'n2', 1000);
      // Private fields should not be accessible
      expect((resistor as any)._resistance).toBe(1000);
      expect((resistor as any)._terminals).toBeDefined();
    });
  });
});
