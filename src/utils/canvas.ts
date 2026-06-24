/**
 * Canvas utility functions — pure functions, no side effects.
 *
 * Coordinate system:
 *   - Logical coordinates: the canvas's own coordinate space (component positions)
 *   - Screen coordinates: pixel positions on the HTML canvas element
 *
 *   screen = logical * scale + offset
 *   logical = (screen - offset) / scale
 */

import type { Component, ComponentId, NodeId } from '@/types/component';
import type { CanvasComponent, Point, Rect, Viewport } from '@/types/editor';
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_SCALE_MAX,
  VIEWPORT_SCALE_MIN,
} from '@/types/editor';

// ---------------------------------------------------------------------------
// Symbol dimensions (logical pixels)
// ---------------------------------------------------------------------------

export const SYMBOL_WIDTH = 60;
export const SYMBOL_HEIGHT = 30;

export const ZOOM_FACTOR = 1.15;

// ---------------------------------------------------------------------------
// Coordinate conversion
// ---------------------------------------------------------------------------

/** Convert logical canvas coordinates to screen pixel coordinates. */
export function logicalToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.offsetX,
    y: point.y * viewport.scale + viewport.offsetY,
  };
}

/** Convert screen pixel coordinates to logical canvas coordinates. */
export function screenToLogical(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

// ---------------------------------------------------------------------------
// Grid snapping
// ---------------------------------------------------------------------------

/** Snap a logical point to the nearest grid intersection. */
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

// ---------------------------------------------------------------------------
// Bounding boxes
// ---------------------------------------------------------------------------

/**
 * Compute the axis-aligned bounding box of a canvas component.
 * Rotation 90/270 swaps width and height.
 */
export function getComponentBounds(comp: CanvasComponent): Rect {
  const isRotated = comp.rotation === 90 || comp.rotation === 270;
  const w = isRotated ? SYMBOL_HEIGHT : SYMBOL_WIDTH;
  const h = isRotated ? SYMBOL_WIDTH : SYMBOL_HEIGHT;
  return {
    x: comp.position.x - w / 2,
    y: comp.position.y - h / 2,
    width: w,
    height: h,
  };
}

/**
 * Compute the bounding box that encloses all components.
 * Returns null for an empty array.
 */
export function getCircuitBounds(components: CanvasComponent[]): Rect | null {
  if (components.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const comp of components) {
    const b = getComponentBounds(comp);
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.width > maxX) maxX = b.x + b.width;
    if (b.y + b.height > maxY) maxY = b.y + b.height;
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

// ---------------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------------

/**
 * Returns true if the logical point falls within the component's bounding box.
 */
export function hitTestComponent(point: Point, comp: CanvasComponent): boolean {
  const b = getComponentBounds(comp);
  return (
    point.x >= b.x &&
    point.x <= b.x + b.width &&
    point.y >= b.y &&
    point.y <= b.y + b.height
  );
}

/**
 * Find the topmost component (last in array) hit by the logical point.
 * Returns null if no component is hit.
 */
export function findHitComponent(
  point: Point,
  components: CanvasComponent[]
): CanvasComponent | null {
  for (let i = components.length - 1; i >= 0; i--) {
    if (hitTestComponent(point, components[i])) return components[i];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Viewport calculations
// ---------------------------------------------------------------------------

/**
 * Calculate a new viewport after applying a zoom delta around a screen-space center.
 * The logical point under `center` remains fixed.
 */
export function calculateZoom(
  viewport: Viewport,
  delta: number,
  center: Point
): Viewport {
  const oldScale = viewport.scale;
  const newScale = Math.min(
    VIEWPORT_SCALE_MAX,
    Math.max(VIEWPORT_SCALE_MIN, oldScale * Math.pow(ZOOM_FACTOR, delta))
  );
  const ratio = newScale / oldScale;
  return {
    offsetX: center.x - (center.x - viewport.offsetX) * ratio,
    offsetY: center.y - (center.y - viewport.offsetY) * ratio,
    scale: newScale,
  };
}

/**
 * Compute a viewport that fits all components inside the canvas with padding.
 * Returns DEFAULT_VIEWPORT for empty component arrays.
 */
export function fitViewportToCircuit(
  components: CanvasComponent[],
  canvasWidth: number,
  canvasHeight: number,
  padding = 40
): Viewport {
  const bounds = getCircuitBounds(components);
  if (!bounds) return DEFAULT_VIEWPORT;

  const safeWidth = bounds.width || 1;
  const safeHeight = bounds.height || 1;
  const scaleX = (canvasWidth - padding * 2) / safeWidth;
  const scaleY = (canvasHeight - padding * 2) / safeHeight;
  const scale = Math.min(
    VIEWPORT_SCALE_MAX,
    Math.max(VIEWPORT_SCALE_MIN, Math.min(scaleX, scaleY))
  );

  return {
    offsetX: padding - bounds.x * scale,
    offsetY: padding - bounds.y * scale,
    scale,
  };
}

// ---------------------------------------------------------------------------
// Auto layout
// ---------------------------------------------------------------------------

const AUTO_LAYOUT_SPACING = 80;
const AUTO_LAYOUT_START_X = 100;
const AUTO_LAYOUT_START_Y = 200;
const AUTO_LAYOUT_GRID = 20;

/**
 * Produce an initial horizontal layout for a list of components.
 * Positions are snapped to a 20px grid.
 */
export function autoLayoutComponents(
  components: Component[]
): CanvasComponent[] {
  return components.map((comp, index) => {
    const x = snapToGrid(
      { x: AUTO_LAYOUT_START_X + index * AUTO_LAYOUT_SPACING, y: 0 },
      AUTO_LAYOUT_GRID
    ).x;
    const y = snapToGrid({ x: 0, y: AUTO_LAYOUT_START_Y }, AUTO_LAYOUT_GRID).y;
    return {
      componentId: comp.id,
      position: { x, y },
      rotation: 0,
      isSelected: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Terminal anchors & hit testing (Task #20 — wire connection system)
// ---------------------------------------------------------------------------

/** Default hit radius (logical px) for terminal pick. */
export const TERMINAL_HIT_RADIUS = 8;

/**
 * A single connectable terminal of a placed component, resolved to logical
 * coordinates. `nodeId` references the electrical node the terminal belongs to.
 */
export interface TerminalAnchor {
  componentId: ComponentId;
  terminalIndex: number; // 0 | 1 (ground exposes index 0 only)
  nodeId: NodeId;
  position: Point; // logical coordinates
}

/** Rotate a local offset by `rotation` degrees (standard 2D rotation). */
function rotateOffset(offset: Point, rotation: number): Point {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: offset.x * cos - offset.y * sin,
    y: offset.x * sin + offset.y * cos,
  };
}

/**
 * Compute the logical-space position of each terminal of a placed component.
 *
 * Local (unrotated) terminal offsets mirror symbolRenderer leads:
 *   terminals[0] = (-SYMBOL_WIDTH/2, 0)  (left lead)
 *   terminals[1] = (+SYMBOL_WIDTH/2, 0)  (right lead)
 * Ground exposes a single terminal at its left lead (-SYMBOL_WIDTH/2, 0).
 *
 * logical = position + rotate(localOffset, rotation)
 */
export function getTerminalAnchors(
  canvasComp: CanvasComponent,
  component: Component
): TerminalAnchor[] {
  const { position, rotation, componentId } = canvasComp;
  const halfW = SYMBOL_WIDTH / 2;

  const toLogical = (offset: Point): Point => {
    const r = rotateOffset(offset, rotation);
    return { x: position.x + r.x, y: position.y + r.y };
  };

  if (component.type === 'ground') {
    // Ground has a single connection point (its left lead).
    return [
      {
        componentId,
        terminalIndex: 0,
        nodeId: component.nodeId,
        position: toLogical({ x: -halfW, y: 0 }),
      },
    ];
  }

  return component.terminals.map((terminal, index) => ({
    componentId,
    terminalIndex: index,
    nodeId: terminal.nodeId,
    position: toLogical({ x: index === 0 ? -halfW : halfW, y: 0 }),
  }));
}

/**
 * Find the closest terminal within `hitRadius` of `point` (logical space).
 * Returns null when no terminal is within range or the component map is empty.
 * Later components in the array take precedence on equal distance (topmost).
 */
export function findTerminalAt(
  point: Point,
  canvasComponents: CanvasComponent[],
  componentMap: Map<ComponentId, Component>,
  hitRadius = TERMINAL_HIT_RADIUS
): TerminalAnchor | null {
  let best: TerminalAnchor | null = null;
  let bestDist = Infinity;
  const radiusSq = hitRadius * hitRadius;

  for (const canvasComp of canvasComponents) {
    const component = componentMap.get(canvasComp.componentId);
    if (!component) continue;

    for (const anchor of getTerminalAnchors(canvasComp, component)) {
      const dx = anchor.position.x - point.x;
      const dy = anchor.position.y - point.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= radiusSq && distSq <= bestDist) {
        best = anchor;
        bestDist = distSq;
      }
    }
  }

  return best;
}

/**
 * Shortest distance from a point to a line segment (logical space).
 * Used for wire hit testing.
 */
export function distanceToSegment(
  point: Point,
  from: Point,
  to: Point
): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }
  let t = ((point.x - from.x) * dx + (point.y - from.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = from.x + t * dx;
  const projY = from.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}
