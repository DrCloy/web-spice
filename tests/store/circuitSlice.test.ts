import { describe, expect, it } from 'vitest';
import circuitReducer, {
  addComponent,
  clearCircuit,
  loadCircuit,
  markClean,
  markDirty,
  redo,
  resetCircuit,
  undo,
} from '@/store/circuitSlice';
import type { CircuitState } from '@/store/types';
import type { Terminal } from '@/types/component';
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
    it('should build future in LIFO order after multiple undos', () => {
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
    });

    it('should restore states in LIFO order after multiple redos', () => {
      let state = circuitReducer(
        {
          past: [],
          current: circuitA,
          future: [null, circuitB],
          isDirty: false,
        },
        redo()
      );
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

  // -------------------------------------------------------------------------
  // addComponent
  // -------------------------------------------------------------------------

  describe('addComponent', () => {
    const resistor = {
      id: 'R1',
      type: 'resistor' as const,
      name: 'R1',
      resistance: 1000,
      terminals: [
        { name: 'terminal1' as const, nodeId: 'R1_1' },
        { name: 'terminal2' as const, nodeId: 'R1_2' },
      ] as [Terminal, Terminal],
    };

    it('creates a new circuit and adds the component when current is null', () => {
      const state = circuitReducer(initialState, addComponent(resistor));
      expect(state.current).not.toBeNull();
      expect(state.current?.components).toHaveLength(1);
      expect(state.current?.components[0]).toEqual(resistor);
      expect(state.isDirty).toBe(true);
    });

    it('appends to existing circuit components', () => {
      const prev = circuitReducer(initialState, addComponent(resistor));
      const capacitor = {
        id: 'C1',
        type: 'capacitor' as const,
        name: 'C1',
        capacitance: 1e-6,
        terminals: [
          { name: 'pos' as const, nodeId: 'C1_p' },
          { name: 'neg' as const, nodeId: 'C1_n' },
        ] as [Terminal, Terminal],
      };
      const state = circuitReducer(prev, addComponent(capacitor));
      expect(state.current?.components).toHaveLength(2);
    });

    it('pushes previous circuit to past for undo support', () => {
      const state = circuitReducer(initialState, addComponent(resistor));
      expect(state.past).toHaveLength(1);
      expect(state.past[0]).toBeNull();
    });

    it('clears future on add', () => {
      const withFuture: typeof initialState = {
        ...initialState,
        future: [circuitA],
      };
      const state = circuitReducer(withFuture, addComponent(resistor));
      expect(state.future).toEqual([]);
    });

    it('can be undone to restore previous circuit', () => {
      const afterAdd = circuitReducer(initialState, addComponent(resistor));
      const afterUndo = circuitReducer(afterAdd, undo());
      expect(afterUndo.current).toBeNull();
    });

    it('preserves existing circuit nodes when adding a component', () => {
      const withCircuit: typeof initialState = {
        ...initialState,
        current: circuitA,
      };
      expect(circuitA.nodes.length).toBeGreaterThan(0);
      const state = circuitReducer(withCircuit, addComponent(resistor));
      expect(state.current?.nodes).toEqual(circuitA.nodes);
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
