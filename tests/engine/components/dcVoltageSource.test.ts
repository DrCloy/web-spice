import { describe, expect, it } from 'vitest';
import { DCVoltageSourceImpl } from '@/engine/components/dcVoltageSource';
import type { DCVoltageSource } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

describe('DCVoltageSourceImpl', () => {
  describe('constructor', () => {
    it('should create a DC voltage source with valid parameters', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);

      expect(source.id).toBe('V1');
      expect(source.type).toBe('voltage_source');
      expect(source.sourceType).toBe('dc');
      expect(source.name).toBe('V1');
      expect(source.voltage).toBe(12);
      expect(source.terminals).toHaveLength(2);
      expect(source.terminals[0]).toEqual({
        name: 'pos',
        nodeId: 'n1',
      });
      expect(source.terminals[1]).toEqual({
        name: 'neg',
        nodeId: 'n2',
      });
    });

    it('should throw error for empty component ID', () => {
      expect(() => new DCVoltageSourceImpl('', 'n1', 'n2', 12)).toThrow(
        'Component ID cannot be empty'
      );
    });

    it('should throw error for empty positive node ID', () => {
      expect(() => new DCVoltageSourceImpl('V1', '', 'n2', 12)).toThrow(
        WebSpiceError
      );
    });

    it('should throw error for empty negative node ID', () => {
      expect(() => new DCVoltageSourceImpl('V1', 'n1', '', 12)).toThrow(
        WebSpiceError
      );
    });

    it('should throw error for identical node IDs', () => {
      expect(() => new DCVoltageSourceImpl('V1', 'n1', 'n1', 12)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for node IDs that are identical after trimming', () => {
      expect(() => new DCVoltageSourceImpl('V1', ' n1 ', 'n1', 12)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for invalid voltage (NaN)', () => {
      expect(() => new DCVoltageSourceImpl('V1', 'n1', 'n2', NaN)).toThrow(
        'Voltage must be a valid number'
      );
    });

    it('should throw error for invalid voltage (Infinity)', () => {
      expect(() => new DCVoltageSourceImpl('V1', 'n1', 'n2', Infinity)).toThrow(
        'Voltage must be a valid number'
      );
    });
  });

  describe('voltage values', () => {
    it('should accept positive voltage', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);
      expect(source.voltage).toBe(12);
    });

    it('should accept negative voltage (reversed polarity)', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', -5);
      expect(source.voltage).toBe(-5);
    });

    it('should accept zero voltage (short circuit)', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 0);
      expect(source.voltage).toBe(0);
    });

    it('should accept very small voltage values', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 0.001);
      expect(source.voltage).toBe(0.001);
    });

    it('should accept typical voltage values', () => {
      const voltages = [1.5, 3.3, 5, 9, 12, 24];
      voltages.forEach(voltage => {
        const source = new DCVoltageSourceImpl(
          `V${voltage}`,
          'n1',
          'n2',
          voltage
        );
        expect(source.voltage).toBe(voltage);
      });
    });
  });

  describe('type compliance', () => {
    it('should match DCVoltageSource interface', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);
      const typed: DCVoltageSource = source;

      expect(typed.id).toBe('V1');
      expect(typed.type).toBe('voltage_source');
      expect(typed.sourceType).toBe('dc');
      expect(typed.voltage).toBe(12);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);
      const json = JSON.stringify(source);
      const parsed = JSON.parse(json);

      // Verify serialization to plain object (for debugging/logging purposes)
      expect(parsed).toEqual({
        id: 'V1',
        type: 'voltage_source',
        sourceType: 'dc',
        name: 'V1',
        voltage: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      });
    });
  });

  describe('immutability', () => {
    it('should have immutable voltage value', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);

      // Attempt modification (may throw in strict mode or silently fail)
      try {
        (source as any).voltage = 24;
      } catch {
        // Expected in strict mode - setter-only property assignment throws TypeError
      }

      // Value must remain unchanged regardless of environment
      expect(source.voltage).toBe(12);
    });

    it('should not allow modification of terminals array', () => {
      const source = new DCVoltageSourceImpl('V1', 'n1', 'n2', 12);
      const originalTerminals = source.terminals;
      // Attempt to modify should not affect internal state
      originalTerminals[0] = { name: 'modified', nodeId: 'n99' };
      expect(source.terminals[0].nodeId).toBe('n1');
    });
  });
});
