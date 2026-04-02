import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  CanvasComponent,
  CanvasWire,
  EditorState,
  EditorTool,
  Point,
  Rotation,
  Viewport,
} from '@/types/editor';
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_SCALE_MAX,
  VIEWPORT_SCALE_MIN,
} from '@/types/editor';
import type { ComponentId } from '@/types/component';
import type { AppState } from '@/store/types';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: EditorState = {
  components: [],
  wires: [],
  viewport: DEFAULT_VIEWPORT,
  selectedComponentIds: [],
  selectedWireIds: [],
  activeTool: 'select',
  gridSize: 20,
  showGrid: true,
};

// ---------------------------------------------------------------------------
// Zoom step factor: each delta unit multiplies/divides scale by this amount
// ---------------------------------------------------------------------------

const ZOOM_FACTOR = 1.15;

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // -- Component layout --

    placeComponent(state, action: PayloadAction<CanvasComponent>) {
      state.components.push(action.payload);
    },

    moveComponent(
      state,
      action: PayloadAction<{ componentId: ComponentId; position: Point }>
    ) {
      const comp = state.components.find(
        c => c.componentId === action.payload.componentId
      );
      if (comp) comp.position = action.payload.position;
    },

    rotateComponent(
      state,
      action: PayloadAction<{ componentId: ComponentId; rotation: Rotation }>
    ) {
      const comp = state.components.find(
        c => c.componentId === action.payload.componentId
      );
      if (comp) comp.rotation = action.payload.rotation;
    },

    removeCanvasComponent(state, action: PayloadAction<ComponentId>) {
      state.components = state.components.filter(
        c => c.componentId !== action.payload
      );
      state.selectedComponentIds = state.selectedComponentIds.filter(
        id => id !== action.payload
      );
    },

    // -- Wires --

    addWire(state, action: PayloadAction<CanvasWire>) {
      state.wires.push(action.payload);
    },

    removeWire(state, action: PayloadAction<string>) {
      state.wires = state.wires.filter(w => w.wireId !== action.payload);
      state.selectedWireIds = state.selectedWireIds.filter(
        id => id !== action.payload
      );
    },

    // -- Selection --

    selectComponent(state, action: PayloadAction<ComponentId>) {
      for (const comp of state.components) {
        comp.isSelected = comp.componentId === action.payload;
      }
      state.selectedComponentIds = [action.payload];
      for (const wire of state.wires) {
        wire.isSelected = false;
      }
      state.selectedWireIds = [];
    },

    selectComponents(state, action: PayloadAction<ComponentId[]>) {
      const ids = new Set(action.payload);
      for (const comp of state.components) {
        comp.isSelected = ids.has(comp.componentId);
      }
      state.selectedComponentIds = action.payload;
      for (const wire of state.wires) {
        wire.isSelected = false;
      }
      state.selectedWireIds = [];
    },

    deselectAll(state) {
      for (const comp of state.components) {
        comp.isSelected = false;
      }
      for (const wire of state.wires) {
        wire.isSelected = false;
      }
      state.selectedComponentIds = [];
      state.selectedWireIds = [];
    },

    toggleComponentSelection(state, action: PayloadAction<ComponentId>) {
      const comp = state.components.find(c => c.componentId === action.payload);
      if (!comp) return;
      comp.isSelected = !comp.isSelected;
      if (comp.isSelected) {
        state.selectedComponentIds.push(action.payload);
      } else {
        state.selectedComponentIds = state.selectedComponentIds.filter(
          id => id !== action.payload
        );
      }
    },

    // -- Viewport --

    setViewport(state, action: PayloadAction<Viewport>) {
      state.viewport = action.payload;
    },

    panViewport(state, action: PayloadAction<{ dx: number; dy: number }>) {
      state.viewport.offsetX += action.payload.dx;
      state.viewport.offsetY += action.payload.dy;
    },

    zoomViewport(
      state,
      action: PayloadAction<{ delta: number; center: Point }>
    ) {
      const { delta, center } = action.payload;
      const oldScale = state.viewport.scale;
      const newScale = Math.min(
        VIEWPORT_SCALE_MAX,
        Math.max(VIEWPORT_SCALE_MIN, oldScale * Math.pow(ZOOM_FACTOR, delta))
      );
      // Adjust offset so the zoom center stays fixed on screen
      state.viewport.offsetX =
        center.x - (center.x - state.viewport.offsetX) * (newScale / oldScale);
      state.viewport.offsetY =
        center.y - (center.y - state.viewport.offsetY) * (newScale / oldScale);
      state.viewport.scale = newScale;
    },

    resetViewport(state) {
      state.viewport = DEFAULT_VIEWPORT;
    },

    // -- Tool & grid --

    setActiveTool(state, action: PayloadAction<EditorTool>) {
      state.activeTool = action.payload;
    },

    setGridSize(state, action: PayloadAction<number>) {
      state.gridSize = action.payload;
    },

    toggleGrid(state) {
      state.showGrid = !state.showGrid;
    },

    // -- Layout load / reset --

    loadEditorLayout(
      state,
      action: PayloadAction<{
        components: CanvasComponent[];
        wires: CanvasWire[];
      }>
    ) {
      state.components = action.payload.components.map(c => ({
        ...c,
        isSelected: false,
      }));
      state.wires = action.payload.wires.map(w => ({
        ...w,
        isSelected: false,
      }));
      state.selectedComponentIds = [];
      state.selectedWireIds = [];
      state.viewport = DEFAULT_VIEWPORT;
    },

    resetEditor() {
      return initialState;
    },
  },
});

export const {
  placeComponent,
  moveComponent,
  rotateComponent,
  removeCanvasComponent,
  addWire,
  removeWire,
  selectComponent,
  selectComponents,
  deselectAll,
  toggleComponentSelection,
  setViewport,
  panViewport,
  zoomViewport,
  resetViewport,
  setActiveTool,
  setGridSize,
  toggleGrid,
  loadEditorLayout,
  resetEditor,
} = editorSlice.actions;

export default editorSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectAllCanvasComponents = (state: AppState) =>
  state.editor.components;

export const selectCanvasComponent = (id: ComponentId) => (state: AppState) =>
  state.editor.components.find(c => c.componentId === id);

export const selectViewport = (state: AppState) => state.editor.viewport;

export const selectSelectedComponentIds = (state: AppState) =>
  state.editor.selectedComponentIds;

export const selectGridSize = (state: AppState) => state.editor.gridSize;

export const selectActiveTool = (state: AppState) => state.editor.activeTool;

export const selectShowGrid = (state: AppState) => state.editor.showGrid;
