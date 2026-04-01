/**
 * renderScene — pure function that draws the full circuit canvas scene.
 * Separated from CircuitCanvas.tsx to satisfy fast-refresh lint rules.
 */

import type { Circuit } from '@/types/circuit';
import type { CanvasComponent, Viewport } from '@/types/editor';
import type { ComponentId } from '@/types/component';
import type { ComponentColors } from '@/utils/componentColors';
import { drawComponent, drawGrid } from './symbolRenderer';

export interface SceneParams {
  circuit: Circuit | null;
  canvasComponents: CanvasComponent[];
  viewport: Viewport;
  selectedIds: ComponentId[];
  gridSize: number;
  showGrid: boolean;
  width: number;
  height: number;
  colors: ComponentColors;
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
  } = params;

  ctx.clearRect(0, 0, width, height);

  if (showGrid) {
    drawGrid(ctx, viewport, gridSize, width, height);
  }

  if (!circuit) return;

  const componentMap = new Map(circuit.components.map(c => [c.id, c]));

  for (const canvasComp of canvasComponents) {
    const component = componentMap.get(canvasComp.componentId);
    if (!component) continue;
    drawComponent(ctx, canvasComp, component, viewport, colors);
  }
}
