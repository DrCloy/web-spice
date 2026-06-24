/**
 * renderScene — pure function that draws the full circuit canvas scene.
 * Separated from CircuitCanvas.tsx to satisfy fast-refresh lint rules.
 */

import type { Circuit } from '@/types/circuit';
import type {
  CanvasComponent,
  CanvasWire,
  EditorTool,
  Viewport,
  WireSegment,
} from '@/types/editor';
import type { CanvasColors } from '@/theme/canvasColors';
import { getTerminalAnchors } from '@/utils/canvas';
import {
  drawComponent,
  drawGrid,
  drawTerminalDot,
  drawWire,
  drawWirePreview,
} from './symbolRenderer';

export interface SceneParams {
  circuit: Circuit | null;
  canvasComponents: CanvasComponent[];
  viewport: Viewport;
  gridSize: number;
  showGrid: boolean;
  width: number;
  height: number;
  colors: CanvasColors;
  /** Wires to render (drawn beneath components). */
  wires?: CanvasWire[];
  /** Active editor tool — terminal dots are shown only in 'wire' mode. */
  activeTool?: EditorTool;
  /** In-progress wire preview while dragging a new connection. */
  wirePreview?: WireSegment[] | null;
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  params: SceneParams
): void {
  const {
    circuit,
    canvasComponents,
    viewport,
    gridSize,
    showGrid,
    width,
    height,
    colors,
    wires = [],
    activeTool = 'select',
    wirePreview = null,
  } = params;

  ctx.clearRect(0, 0, width, height);

  if (showGrid) {
    drawGrid(ctx, viewport, gridSize, width, height, colors.grid);
  }

  // Wires render beneath components.
  for (const wire of wires) {
    drawWire(ctx, wire, viewport, colors);
  }

  if (!circuit) {
    if (wirePreview) drawWirePreview(ctx, wirePreview, viewport, colors);
    return;
  }

  const componentMap = new Map(circuit.components.map(c => [c.id, c]));

  for (const canvasComp of canvasComponents) {
    const component = componentMap.get(canvasComp.componentId);
    if (!component) continue;
    drawComponent(ctx, canvasComp, component, viewport, colors);
  }

  // Terminal dots are only useful while wiring.
  if (activeTool === 'wire') {
    for (const canvasComp of canvasComponents) {
      const component = componentMap.get(canvasComp.componentId);
      if (!component) continue;
      for (const anchor of getTerminalAnchors(canvasComp, component)) {
        drawTerminalDot(ctx, anchor.position, viewport, colors);
      }
    }
  }

  if (wirePreview) drawWirePreview(ctx, wirePreview, viewport, colors);
}
