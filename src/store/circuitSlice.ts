import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Circuit, Node } from '@/types/circuit';
import type { Component, NodeId } from '@/types/component';
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
        nodes: prev?.nodes ?? [],
      };
      state.future = [];
      state.isDirty = true;
    },

    /**
     * Merge two electrical nodes into one. Every component terminal (and ground
     * reference) whose nodeId equals `fromNodeId` is rewritten to `toNodeId`.
     *
     * Ground rule: if either side is the circuit's ground node, the result is
     * always the ground node — i.e. the non-ground node is absorbed into ground.
     * No-op when current is null, the ids are equal, or no terminal uses
     * `fromNodeId`.
     */
    mergeNodes(
      state,
      action: PayloadAction<{ fromNodeId: NodeId; toNodeId: NodeId }>
    ) {
      const prev = state.current;
      if (prev === null) return;

      const groundId = prev.groundNodeId;
      let { fromNodeId, toNodeId } = action.payload;

      // Ground always wins: absorb the other node into ground.
      if (toNodeId === groundId && fromNodeId === groundId) return;
      if (fromNodeId === groundId) {
        [fromNodeId, toNodeId] = [toNodeId, fromNodeId];
      }

      if (fromNodeId === toNodeId) return;

      const rewriteId = (id: NodeId): NodeId =>
        id === fromNodeId ? toNodeId : id;

      const components: Component[] = prev.components.map(comp => {
        if (comp.type === 'ground') {
          return comp.nodeId === fromNodeId
            ? { ...comp, nodeId: toNodeId }
            : comp;
        }
        const touched = comp.terminals.some(t => t.nodeId === fromNodeId);
        if (!touched) return comp;
        return {
          ...comp,
          terminals: comp.terminals.map(t => ({
            ...t,
            nodeId: rewriteId(t.nodeId),
          })),
        } as Component;
      });

      // Merge node metadata when the nodes array is populated.
      let nodes: Node[] = prev.nodes;
      if (nodes.length > 0) {
        const fromNode = nodes.find(n => n.id === fromNodeId);
        nodes = nodes
          .filter(n => n.id !== fromNodeId)
          .map(n => {
            if (n.id !== toNodeId || !fromNode) return n;
            const merged = new Set([
              ...n.connectedComponents,
              ...fromNode.connectedComponents,
            ]);
            return { ...n, connectedComponents: [...merged] };
          });
      }

      state.past = pushBounded(state.past, prev);
      state.current = {
        id: prev.id,
        name: prev.name,
        description: prev.description,
        groundNodeId: groundId,
        components,
        nodes,
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
  mergeNodes,
} = circuitSlice.actions;

export default circuitSlice.reducer;
