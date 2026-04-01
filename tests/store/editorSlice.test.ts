import { describe, expect, it } from 'vitest';
import editorReducer, {
  addWire,
  deselectAll,
  loadEditorLayout,
  moveComponent,
  panViewport,
  placeComponent,
  removeCanvasComponent,
  removeWire,
  resetEditor,
  resetViewport,
  rotateComponent,
  selectComponent,
  selectComponents,
  setActiveTool,
  setGridSize,
  setViewport,
  toggleComponentSelection,
  toggleGrid,
  zoomViewport,
} from '@/store/editorSlice';
import type { EditorState } from '@/types/editor';
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_SCALE_MAX,
  VIEWPORT_SCALE_MIN,
} from '@/types/editor';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COMP_A = {
  componentId: 'R1',
  position: { x: 100, y: 100 },
  rotation: 0 as const,
  isSelected: false,
};

const COMP_B = {
  componentId: 'V1',
  position: { x: 200, y: 100 },
  rotation: 0 as const,
  isSelected: false,
};

const WIRE_A = {
  wireId: 'w1',
  fromNodeId: 'n1',
  toNodeId: 'n2',
  segments: [{ from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }],
  isSelected: false,
};

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
// Tests
// ---------------------------------------------------------------------------

describe('editorSlice', () => {
  describe('initialState', () => {
    it('should match the expected default state', () => {
      const state = editorReducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(initialState);
    });
  });

  // -------------------------------------------------------------------------
  // Component layout
  // -------------------------------------------------------------------------

  describe('placeComponent', () => {
    it('should add a new canvas component', () => {
      const state = editorReducer(initialState, placeComponent(COMP_A));
      expect(state.components).toHaveLength(1);
      expect(state.components[0]).toEqual(COMP_A);
    });

    it('should append without removing existing components', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(prev, placeComponent(COMP_B));
      expect(state.components).toHaveLength(2);
    });
  });

  describe('moveComponent', () => {
    it('should update position of the target component', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const newPos = { x: 300, y: 200 };
      const state = editorReducer(
        prev,
        moveComponent({ componentId: 'R1', position: newPos })
      );
      expect(state.components[0].position).toEqual(newPos);
    });

    it('should be a no-op when componentId does not exist', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(
        prev,
        moveComponent({ componentId: 'X99', position: { x: 0, y: 0 } })
      );
      expect(state.components).toEqual(prev.components);
    });
  });

  describe('rotateComponent', () => {
    it('should update rotation of the target component', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(
        prev,
        rotateComponent({ componentId: 'R1', rotation: 90 })
      );
      expect(state.components[0].rotation).toBe(90);
    });

    it('should be a no-op when componentId does not exist', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(
        prev,
        rotateComponent({ componentId: 'X99', rotation: 90 })
      );
      expect(state.components).toEqual(prev.components);
    });
  });

  describe('removeCanvasComponent', () => {
    it('should remove the component with matching id', () => {
      const prev = { ...initialState, components: [COMP_A, COMP_B] };
      const state = editorReducer(prev, removeCanvasComponent('R1'));
      expect(state.components).toHaveLength(1);
      expect(state.components[0].componentId).toBe('V1');
    });

    it('should also remove the id from selectedComponentIds', () => {
      const prev = {
        ...initialState,
        components: [COMP_A],
        selectedComponentIds: ['R1'],
      };
      const state = editorReducer(prev, removeCanvasComponent('R1'));
      expect(state.selectedComponentIds).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Wires
  // -------------------------------------------------------------------------

  describe('addWire', () => {
    it('should add a wire', () => {
      const state = editorReducer(initialState, addWire(WIRE_A));
      expect(state.wires).toHaveLength(1);
      expect(state.wires[0]).toEqual(WIRE_A);
    });
  });

  describe('removeWire', () => {
    it('should remove wire by id', () => {
      const prev = { ...initialState, wires: [WIRE_A] };
      const state = editorReducer(prev, removeWire('w1'));
      expect(state.wires).toHaveLength(0);
    });

    it('should also remove the id from selectedWireIds', () => {
      const prev = {
        ...initialState,
        wires: [WIRE_A],
        selectedWireIds: ['w1'],
      };
      const state = editorReducer(prev, removeWire('w1'));
      expect(state.selectedWireIds).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  describe('selectComponent', () => {
    it('should set isSelected=true on the component and add to selectedComponentIds', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(prev, selectComponent('R1'));
      expect(state.components[0].isSelected).toBe(true);
      expect(state.selectedComponentIds).toContain('R1');
    });

    it('should deselect all other components', () => {
      const prev = {
        ...initialState,
        components: [{ ...COMP_A, isSelected: true }, COMP_B],
        selectedComponentIds: ['R1'],
      };
      const state = editorReducer(prev, selectComponent('V1'));
      expect(state.components[0].isSelected).toBe(false);
      expect(state.components[1].isSelected).toBe(true);
      expect(state.selectedComponentIds).toEqual(['V1']);
    });
  });

  describe('selectComponents', () => {
    it('should select multiple components', () => {
      const prev = { ...initialState, components: [COMP_A, COMP_B] };
      const state = editorReducer(prev, selectComponents(['R1', 'V1']));
      expect(state.selectedComponentIds).toEqual(['R1', 'V1']);
      expect(state.components.every(c => c.isSelected)).toBe(true);
    });
  });

  describe('deselectAll', () => {
    it('should clear all selections', () => {
      const prev = {
        ...initialState,
        components: [{ ...COMP_A, isSelected: true }],
        selectedComponentIds: ['R1'],
        selectedWireIds: ['w1'],
      };
      const state = editorReducer(prev, deselectAll());
      expect(state.selectedComponentIds).toEqual([]);
      expect(state.selectedWireIds).toEqual([]);
      expect(state.components[0].isSelected).toBe(false);
    });
  });

  describe('toggleComponentSelection', () => {
    it('should select an unselected component', () => {
      const prev = { ...initialState, components: [COMP_A] };
      const state = editorReducer(prev, toggleComponentSelection('R1'));
      expect(state.components[0].isSelected).toBe(true);
      expect(state.selectedComponentIds).toContain('R1');
    });

    it('should deselect an already selected component', () => {
      const prev = {
        ...initialState,
        components: [{ ...COMP_A, isSelected: true }],
        selectedComponentIds: ['R1'],
      };
      const state = editorReducer(prev, toggleComponentSelection('R1'));
      expect(state.components[0].isSelected).toBe(false);
      expect(state.selectedComponentIds).not.toContain('R1');
    });
  });

  // -------------------------------------------------------------------------
  // Viewport
  // -------------------------------------------------------------------------

  describe('setViewport', () => {
    it('should replace the entire viewport', () => {
      const vp = { offsetX: 50, offsetY: 30, scale: 2.0 };
      const state = editorReducer(initialState, setViewport(vp));
      expect(state.viewport).toEqual(vp);
    });
  });

  describe('panViewport', () => {
    it('should add dx/dy to existing offset', () => {
      const prev = {
        ...initialState,
        viewport: { offsetX: 10, offsetY: 20, scale: 1 },
      };
      const state = editorReducer(prev, panViewport({ dx: 5, dy: -10 }));
      expect(state.viewport.offsetX).toBe(15);
      expect(state.viewport.offsetY).toBe(10);
    });
  });

  describe('zoomViewport', () => {
    it('should clamp scale to VIEWPORT_SCALE_MIN', () => {
      const prev = {
        ...initialState,
        viewport: { offsetX: 0, offsetY: 0, scale: VIEWPORT_SCALE_MIN },
      };
      const state = editorReducer(
        prev,
        zoomViewport({ delta: -1, center: { x: 0, y: 0 } })
      );
      expect(state.viewport.scale).toBeGreaterThanOrEqual(VIEWPORT_SCALE_MIN);
    });

    it('should clamp scale to VIEWPORT_SCALE_MAX', () => {
      const prev = {
        ...initialState,
        viewport: { offsetX: 0, offsetY: 0, scale: VIEWPORT_SCALE_MAX },
      };
      const state = editorReducer(
        prev,
        zoomViewport({ delta: 1, center: { x: 0, y: 0 } })
      );
      expect(state.viewport.scale).toBeLessThanOrEqual(VIEWPORT_SCALE_MAX);
    });

    it('should zoom in (delta > 0) by increasing scale', () => {
      const prev = {
        ...initialState,
        viewport: { offsetX: 0, offsetY: 0, scale: 1.0 },
      };
      const state = editorReducer(
        prev,
        zoomViewport({ delta: 1, center: { x: 0, y: 0 } })
      );
      expect(state.viewport.scale).toBeGreaterThan(1.0);
    });
  });

  describe('resetViewport', () => {
    it('should restore default viewport', () => {
      const prev = {
        ...initialState,
        viewport: { offsetX: 100, offsetY: 200, scale: 2.5 },
      };
      const state = editorReducer(prev, resetViewport());
      expect(state.viewport).toEqual(DEFAULT_VIEWPORT);
    });
  });

  // -------------------------------------------------------------------------
  // Tool & grid settings
  // -------------------------------------------------------------------------

  describe('setActiveTool', () => {
    it('should update activeTool', () => {
      const state = editorReducer(initialState, setActiveTool('wire'));
      expect(state.activeTool).toBe('wire');
    });
  });

  describe('setGridSize', () => {
    it('should update gridSize', () => {
      const state = editorReducer(initialState, setGridSize(40));
      expect(state.gridSize).toBe(40);
    });
  });

  describe('toggleGrid', () => {
    it('should flip showGrid', () => {
      const state = editorReducer(initialState, toggleGrid());
      expect(state.showGrid).toBe(false);
    });

    it('should flip back when called twice', () => {
      const state = editorReducer(
        editorReducer(initialState, toggleGrid()),
        toggleGrid()
      );
      expect(state.showGrid).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Layout load / reset
  // -------------------------------------------------------------------------

  describe('loadEditorLayout', () => {
    it('should replace components and wires, deselect all, reset viewport', () => {
      const prev = {
        ...initialState,
        components: [COMP_A],
        wires: [WIRE_A],
        selectedComponentIds: ['R1'],
        viewport: { offsetX: 50, offsetY: 50, scale: 2 },
      };
      const state = editorReducer(
        prev,
        loadEditorLayout({ components: [COMP_B], wires: [] })
      );
      expect(state.components).toEqual([COMP_B]);
      expect(state.wires).toEqual([]);
      expect(state.selectedComponentIds).toEqual([]);
      expect(state.viewport).toEqual(DEFAULT_VIEWPORT);
    });
  });

  describe('resetEditor', () => {
    it('should return to initial state', () => {
      const prev = {
        ...initialState,
        components: [COMP_A],
        viewport: { offsetX: 100, offsetY: 0, scale: 3 },
        activeTool: 'wire' as const,
      };
      const state = editorReducer(prev, resetEditor());
      expect(state).toEqual(initialState);
    });
  });
});
