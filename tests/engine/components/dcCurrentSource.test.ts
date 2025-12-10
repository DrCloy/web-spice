import { describe, expect, it } from 'vitest';
import { DCCurrentSourceImpl } from '@/engine/components/dcCurrentSource';
import type { DCCurrentSource } from '@/types/component';
import { WebSpiceError } from '@/types/circuit';

describe('DCCurrentSourceImpl', () => {
  describe('constructor (new API: data object)', () => {
    it('should create a DC current source with valid data object', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      const source = new DCCurrentSourceImpl(data);

      expect(source.id).toBe('I1');
      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('dc');
      expect(source.name).toBe('I1');
      expect(source.current).toBe(12);
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

    it('should use id as name when name is not provided', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: '',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      const source = new DCCurrentSourceImpl(data);

      expect(source.name).toBe('I1');
    });

    it('should throw error for empty component ID', () => {
      const data: DCCurrentSource = {
        id: '',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'Component ID cannot be empty'
      );
    });

    it('should throw error for empty positive node ID', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: '' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(WebSpiceError);
    });

    it('should throw error for empty negative node ID', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: '' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(WebSpiceError);
    });

    it('should throw error for identical node IDs', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n1' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for node IDs that are identical after trimming', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: ' n1 ' },
          { name: 'neg', nodeId: 'n1' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for invalid current (NaN)', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: NaN,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'Current must be a valid number'
      );
    });

    it('should throw error for invalid current (Infinity)', () => {
      const data: DCCurrentSource = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: Infinity,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'Current must be a valid number'
      );
    });

    it('should throw error for invalid terminals (not exactly 2)', () => {
      const data: any = {
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [{ name: 'pos', nodeId: 'n1' }], // only 1 terminal
      };
      expect(() => new DCCurrentSourceImpl(data)).toThrow(
        'DC current source must have exactly 2 terminals'
      );
    });
  });

  describe('constructor (old API: individual parameters - deprecated)', () => {
    it('should create a DC current source with valid parameters', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);

      expect(source.id).toBe('I1');
      expect(source.type).toBe('current_source');
      expect(source.sourceType).toBe('dc');
      expect(source.name).toBe('I1');
      expect(source.current).toBe(12);
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
      expect(() => new DCCurrentSourceImpl('', 'n1', 'n2', 12)).toThrow(
        'Component ID cannot be empty'
      );
    });

    it('should throw error for empty positive node ID', () => {
      expect(() => new DCCurrentSourceImpl('I1', '', 'n2', 12)).toThrow(
        WebSpiceError
      );
    });

    it('should throw error for empty negative node ID', () => {
      expect(() => new DCCurrentSourceImpl('I1', 'n1', '', 12)).toThrow(
        WebSpiceError
      );
    });

    it('should throw error for identical node IDs', () => {
      expect(() => new DCCurrentSourceImpl('I1', 'n1', 'n1', 12)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for node IDs that are identical after trimming', () => {
      expect(() => new DCCurrentSourceImpl('I1', ' n1 ', 'n1', 12)).toThrow(
        'Terminals cannot be connected to the same node'
      );
    });

    it('should throw error for invalid current (NaN)', () => {
      expect(() => new DCCurrentSourceImpl('I1', 'n1', 'n2', NaN)).toThrow(
        'Current must be a valid number'
      );
    });

    it('should throw error for invalid current (Infinity)', () => {
      expect(() => new DCCurrentSourceImpl('I1', 'n1', 'n2', Infinity)).toThrow(
        'Current must be a valid number'
      );
    });
  });

  describe('current values', () => {
    it('should accept positive current', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);
      expect(source.current).toBe(12);
    });

    it('should accept negative current (reversed polarity)', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', -5);
      expect(source.current).toBe(-5);
    });

    it('should accept zero current (open circuit)', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 0);
      expect(source.current).toBe(0);
    });

    it('should accept very small current values', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 0.001);
      expect(source.current).toBe(0.001);
    });

    it('should accept typical current values', () => {
      const currents = [1.5, 3.3, 5, 9, 12, 24];
      currents.forEach(current => {
        const source = new DCCurrentSourceImpl(
          `I${current}`,
          'n1',
          'n2',
          current
        );
        expect(source.current).toBe(current);
      });
    });
  });

  describe('type compliance', () => {
    it('should match DCCurrentSource interface', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);
      const typed: DCCurrentSource = source;

      expect(typed.id).toBe('I1');
      expect(typed.type).toBe('current_source');
      expect(typed.sourceType).toBe('dc');
      expect(typed.current).toBe(12);
      expect(typed.terminals).toHaveLength(2);
    });

    it('should be serializable to plain object', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);
      const json = JSON.stringify(source);
      const parsed = JSON.parse(json);

      // Verify serialization to plain object (for debugging/logging purposes)
      expect(parsed).toEqual({
        id: 'I1',
        type: 'current_source',
        sourceType: 'dc',
        name: 'I1',
        current: 12,
        terminals: [
          { name: 'pos', nodeId: 'n1' },
          { name: 'neg', nodeId: 'n2' },
        ],
      });
    });
  });

  describe('immutability', () => {
    it('should have immutable current value', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);

      // Attempt modification (may throw in strict mode or silently fail)
      try {
        (source as any).current = 24;
      } catch {
        // Expected in strict mode - setter-only property assignment throws TypeError
      }

      // Value must remain unchanged regardless of environment
      expect(source.current).toBe(12);
    });

    it('should not allow modification of terminals array', () => {
      const source = new DCCurrentSourceImpl('I1', 'n1', 'n2', 12);
      const originalTerminals = source.terminals;
      // Attempt to modify should not affect internal state
      originalTerminals[0] = { name: 'modified', nodeId: 'n99' };
      expect(source.terminals[0].nodeId).toBe('n1');
    });
  });
});
