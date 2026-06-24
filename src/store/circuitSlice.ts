import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Circuit } from '@/types/circuit';
import type { Component } from '@/types/component';
import type { CircuitState } from '@/store/types';
import { MAX_HISTORY } from '@/store/types';

const initialState: CircuitState = {
  past: [],
  current: null,
  future: [],
  isDirty: false,
};

function pushBounded(
  arr: (Circuit | null)[],
  entry: Circuit | null
): (Circuit | null)[] {
  const next = [...arr, entry];
  return next.length > MAX_HISTORY ? next.slice(1) : next;
}

const circuitSlice = createSlice({
  name: 'circuit',
  initialState,
  reducers: {
    loadCircuit(state, action: PayloadAction<Circuit>) {
      state.past = [];
      state.current = action.payload;
      state.future = [];
      state.isDirty = false;
    },

    resetCircuit(state) {
      state.past = [];
      state.current = null;
      state.future = [];
      state.isDirty = false;
    },

    clearCircuit(state) {
      if (state.current === null) return;
      state.past = pushBounded(state.past, state.current);
      state.current = null;
      state.future = [];
      state.isDirty = true;
    },

    undo(state) {
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      state.future = pushBounded(state.future, state.current);
      state.past = state.past.slice(0, -1);
      state.current = previous;
    },

    redo(state) {
      if (state.future.length === 0) return;
      const next = state.future[state.future.length - 1];
      state.past = pushBounded(state.past, state.current);
      state.future = state.future.slice(0, -1);
      state.current = next;
    },

    markDirty(state) {
      state.isDirty = true;
    },

    markClean(state) {
      state.isDirty = false;
    },

    addComponent(state, action: PayloadAction<Component>) {
      const prev = state.current;
      state.past = pushBounded(state.past, prev);
      // Replace current with a new plain Circuit object to stay Redux-serializable.
      // This works whether `prev` is a plain Circuit or a CircuitImpl instance.
      const prevComponents = prev ? prev.components : [];
      state.current = {
        id: prev?.id ?? 'canvas-circuit-1',
        name: prev?.name ?? 'New Circuit',
        description: prev?.description,
        groundNodeId: prev?.groundNodeId ?? '0',
        components: [...prevComponents, action.payload],
        nodes: [],
      };
      state.future = [];
      state.isDirty = true;
    },
  },
});

export const {
  loadCircuit,
  resetCircuit,
  clearCircuit,
  undo,
  redo,
  markDirty,
  markClean,
  addComponent,
} = circuitSlice.actions;

export default circuitSlice.reducer;
