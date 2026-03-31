import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Circuit } from '@/types/circuit';
import type { CircuitState } from '@/store/types';
import { MAX_HISTORY } from '@/store/types';

const initialState: CircuitState = {
  past: [],
  current: null,
  future: [],
  isDirty: false,
};

function pushToPast(
  past: (Circuit | null)[],
  entry: Circuit | null
): (Circuit | null)[] {
  const next = [...past, entry];
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
      state.past = pushToPast(state.past, state.current);
      state.current = null;
      state.future = [];
      state.isDirty = true;
    },

    undo(state) {
      if (state.past.length === 0) return;
      const previous = state.past[state.past.length - 1];
      state.future = [state.current, ...state.future];
      state.past = state.past.slice(0, -1);
      state.current = previous;
    },

    redo(state) {
      if (state.future.length === 0) return;
      const next = state.future[0];
      state.past = pushToPast(state.past, state.current);
      state.future = state.future.slice(1);
      state.current = next;
    },

    markDirty(state) {
      state.isDirty = true;
    },

    markClean(state) {
      state.isDirty = false;
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
} = circuitSlice.actions;

export default circuitSlice.reducer;
