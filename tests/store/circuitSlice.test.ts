import { describe, expect, it } from 'vitest';
import circuitReducer, {
  clearCircuit,
  loadCircuit,
  markClean,
  markDirty,
  redo,
  resetCircuit,
  undo,
} from '@/store/circuitSlice';
import type { CircuitState } from '@/store/types';
import { MAX_HISTORY } from '@/store/types';
import { SIMPLE_RESISTOR_10V, VOLTAGE_DIVIDER_12V } from '../fixtures/circuits';

const circuitA = VOLTAGE_DIVIDER_12V.circuit;
const circuitB = SIMPLE_RESISTOR_10V.circuit;

const initialState: CircuitState = {
  past: [],
  current: null,
  future: [],
  isDirty: false,
};

describe('circuitSlice', () => {
  describe('initialState', () => {
    it('should have empty past, null current, empty future, isDirty=false', () => {
      const state = circuitReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });
  });

  describe('loadCircuit', () => {
    it('should set current, clear past/future, set isDirty=false', () => {
      const state = circuitReducer(
        { past: [circuitA], current: circuitB, future: [null], isDirty: true },
        loadCircuit(circuitA)
      );
      expect(state.current).toBe(circuitA);
      expect(state.past).toEqual([]);
      expect(state.future).toEqual([]);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('resetCircuit', () => {
    it('should clear everything to initial state', () => {
      const state = circuitReducer(
        { past: [circuitA], current: circuitB, future: [null], isDirty: true },
        resetCircuit()
      );
      expect(state).toEqual(initialState);
    });
  });

  describe('clearCircuit', () => {
    it('should push current to past, set current=null, clear future, set isDirty=true', () => {
      const state = circuitReducer(
        { past: [], current: circuitA, future: [circuitB], isDirty: false },
        clearCircuit()
      );
      expect(state.past).toEqual([circuitA]);
      expect(state.current).toBeNull();
      expect(state.future).toEqual([]);
      expect(state.isDirty).toBe(true);
    });

    it('should be no-op when current is null', () => {
      const before: CircuitState = {
        past: [circuitA],
        current: null,
        future: [],
        isDirty: false,
      };
      const state = circuitReducer(before, clearCircuit());
      expect(state).toEqual(before);
    });
  });

  describe('markDirty / markClean', () => {
    it('markDirty should set isDirty=true without changing history', () => {
      const state = circuitReducer(
        { past: [circuitA], current: circuitB, future: [], isDirty: false },
        markDirty()
      );
      expect(state.isDirty).toBe(true);
      expect(state.past).toEqual([circuitA]);
      expect(state.current).toBe(circuitB);
    });

    it('markClean should set isDirty=false without changing history', () => {
      const state = circuitReducer(
        { past: [], current: circuitA, future: [], isDirty: true },
        markClean()
      );
      expect(state.isDirty).toBe(false);
      expect(state.current).toBe(circuitA);
    });
  });

  describe('undo', () => {
    it('should pop past into current and push current into future', () => {
      const state = circuitReducer(
        { past: [circuitA], current: circuitB, future: [], isDirty: true },
        undo()
      );
      expect(state.past).toEqual([]);
      expect(state.current).toBe(circuitA);
      expect(state.future).toEqual([circuitB]);
      expect(state.isDirty).toBe(true);
    });

    it('should be no-op when past is empty', () => {
      const before: CircuitState = {
        past: [],
        current: circuitA,
        future: [],
        isDirty: false,
      };
      const state = circuitReducer(before, undo());
      expect(state).toEqual(before);
    });

    it('should support null in past (undo of clearCircuit)', () => {
      const state = circuitReducer(
        { past: [null], current: circuitA, future: [], isDirty: true },
        undo()
      );
      expect(state.current).toBeNull();
      expect(state.future).toEqual([circuitA]);
    });
  });

  describe('redo', () => {
    it('should pop future into current and push current into past', () => {
      const state = circuitReducer(
        { past: [], current: circuitA, future: [circuitB], isDirty: true },
        redo()
      );
      expect(state.past).toEqual([circuitA]);
      expect(state.current).toBe(circuitB);
      expect(state.future).toEqual([]);
      expect(state.isDirty).toBe(true);
    });

    it('should be no-op when future is empty', () => {
      const before: CircuitState = {
        past: [],
        current: circuitA,
        future: [],
        isDirty: false,
      };
      const state = circuitReducer(before, redo());
      expect(state).toEqual(before);
    });

    it('should support null in future (redo of clearCircuit)', () => {
      const state = circuitReducer(
        { past: [circuitA], current: circuitB, future: [null], isDirty: false },
        redo()
      );
      expect(state.current).toBeNull();
      expect(state.past).toEqual([circuitA, circuitB]);
    });
  });

  describe('undo/redo LIFO 순서', () => {
    it('should restore states in reverse undo order', () => {
      // undo twice: A→B→C becomes past=[], current=A, future=[C, B]
      let state = circuitReducer(
        {
          past: [circuitA, circuitB],
          current: null,
          future: [],
          isDirty: false,
        },
        undo()
      );
      state = circuitReducer(state, undo());
      expect(state.current).toBe(circuitA);
      expect(state.future).toEqual([null, circuitB]);

      // redo should restore B first (most recent undo), then null
      state = circuitReducer(state, redo());
      expect(state.current).toBe(circuitB);

      state = circuitReducer(state, redo());
      expect(state.current).toBeNull();
    });
  });

  describe('future 초기화 — 새 편집 후 redo 불가', () => {
    it('loadCircuit after undo should clear future', () => {
      const afterUndo = circuitReducer(
        { past: [circuitA], current: circuitB, future: [], isDirty: false },
        undo()
      );
      expect(afterUndo.future).toEqual([circuitB]);

      const afterLoad = circuitReducer(afterUndo, loadCircuit(circuitB));
      expect(afterLoad.future).toEqual([]);
    });
  });

  describe('MAX_HISTORY', () => {
    it('should remove oldest past entry when MAX_HISTORY is exceeded', () => {
      const manyPast = Array.from({ length: MAX_HISTORY }, (_, i) =>
        i % 2 === 0 ? circuitA : circuitB
      );
      const state = circuitReducer(
        { past: manyPast, current: circuitA, future: [], isDirty: false },
        clearCircuit()
      );
      expect(state.past).toHaveLength(MAX_HISTORY);
      expect(state.past[MAX_HISTORY - 1]).toBe(circuitA);
    });

    it('should remove oldest future entry when MAX_HISTORY is exceeded via undo', () => {
      const manyFuture = Array.from({ length: MAX_HISTORY }, (_, i) =>
        i % 2 === 0 ? circuitA : circuitB
      );
      const state = circuitReducer(
        {
          past: [circuitA],
          current: circuitB,
          future: manyFuture,
          isDirty: false,
        },
        undo()
      );
      expect(state.future).toHaveLength(MAX_HISTORY);
      expect(state.future[MAX_HISTORY - 1]).toBe(circuitB);
    });
  });
});
