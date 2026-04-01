/**
 * WebSpice Canvas Editor Type Definitions
 *
 * Canvas 레이아웃 전용 타입. SPICE 시뮬레이션 데이터(circuit.ts, component.ts)와
 * 분리되어 있으며, componentId로 circuitSlice의 Component를 참조한다.
 */

import type { ComponentId, NodeId } from './component';

// =============================================================================
// Geometry Types
// =============================================================================

/** 2D coordinate point (logical canvas units) */
export interface Point {
  x: number;
  y: number;
}

/** Axis-aligned bounding box */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// =============================================================================
// Canvas Layout Types
// =============================================================================

/** Component rotation in degrees */
export type Rotation = 0 | 90 | 180 | 270;

/** Editor tool mode */
export type EditorTool = 'select' | 'place' | 'wire';

/** Canvas layout info for a placed component */
export interface CanvasComponent {
  /** References Component.id in circuitSlice */
  componentId: ComponentId;
  /** Grid-snapped center position in logical coordinates */
  position: Point;
  rotation: Rotation;
  isSelected: boolean;
}

/** A single straight segment of a wire */
export interface WireSegment {
  from: Point;
  to: Point;
}

/** A wire connecting two nodes via one or more segments */
export interface CanvasWire {
  wireId: string;
  fromNodeId: NodeId;
  toNodeId: NodeId;
  /** Routing path — minimum one segment */
  segments: WireSegment[];
  isSelected: boolean;
}

// =============================================================================
// Viewport
// =============================================================================

/** Canvas pan/zoom state */
export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export const DEFAULT_VIEWPORT: Viewport = {
  offsetX: 0,
  offsetY: 0,
  scale: 1.0,
};
export const VIEWPORT_SCALE_MIN = 0.25;
export const VIEWPORT_SCALE_MAX = 4.0;

// =============================================================================
// Editor State (used by editorSlice)
// =============================================================================

export interface EditorState {
  components: CanvasComponent[];
  wires: CanvasWire[];
  viewport: Viewport;
  selectedComponentIds: ComponentId[];
  selectedWireIds: string[];
  activeTool: EditorTool;
  /** Grid snap size in logical pixels */
  gridSize: number;
  showGrid: boolean;
}
