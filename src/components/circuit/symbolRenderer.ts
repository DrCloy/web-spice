/**
 * Circuit component symbol renderer.
 *
 * Pure functions — each draw function:
 *   - Accepts a CanvasColors object (no DOM access)
 *   - Works in logical coordinates, converts via logicalToScreen internally
 *   - Wraps all drawing in ctx.save() / ctx.restore()
 */

import type { Component } from '@/types/component';
import type {
  CanvasComponent,
  Point,
  Rotation,
  Viewport,
} from '@/types/editor';
import type { CanvasColors } from '@/theme/canvasColors';
import { SYMBOL_HEIGHT, SYMBOL_WIDTH, logicalToScreen } from '@/utils/canvas';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function applyTransform(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport
): void {
  const screen = logicalToScreen(center, viewport);
  ctx.translate(screen.x, screen.y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(viewport.scale, viewport.scale);
}

function setLineStyle(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth = 2
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  colors: CanvasColors
): void {
  ctx.strokeStyle = colors.selected;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(
    -SYMBOL_WIDTH / 2 - 4,
    -SYMBOL_HEIGHT / 2 - 4,
    SYMBOL_WIDTH + 8,
    SYMBOL_HEIGHT + 8
  );
  ctx.setLineDash([]);
}

// ---------------------------------------------------------------------------
// Grid
// ---------------------------------------------------------------------------

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  gridColor: string
): void {
  ctx.save();

  const scaledGrid = gridSize * viewport.scale;
  if (scaledGrid < 4) {
    ctx.restore();
    return; // too dense to draw
  }

  const startX = ((viewport.offsetX % scaledGrid) + scaledGrid) % scaledGrid;
  const startY = ((viewport.offsetY % scaledGrid) + scaledGrid) % scaledGrid;

  ctx.fillStyle = gridColor;
  const dotSize = Math.min(1.5, scaledGrid * 0.08);

  for (let x = startX; x < canvasWidth; x += scaledGrid) {
    for (let y = startY; y < canvasHeight; y += scaledGrid) {
      ctx.beginPath();
      ctx.arc(x, y, dotSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Resistor — IEEE zigzag
// ---------------------------------------------------------------------------

export function drawResistor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  setLineStyle(ctx, colors.stroke);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-15, 0);
  for (const [x, y] of [
    [-12, 7],
    [-6, -7],
    [0, 7],
    [6, -7],
    [12, 7],
    [15, 0],
  ])
    ctx.lineTo(x, y);
  ctx.lineTo(halfW, 0);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Voltage source — circle with + / - labels
// ---------------------------------------------------------------------------

export function drawVoltageSource(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const r = SYMBOL_HEIGHT / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  setLineStyle(ctx, colors.stroke);
  // Left lead
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-r, 0);
  ctx.stroke();
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // Right lead
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(halfW, 0);
  ctx.stroke();

  // +/- labels — bold for readability
  ctx.fillStyle = colors.stroke;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', -6, 0); // terminals[0] = N+ = left lead
  ctx.fillText('−', 6, 0); // terminals[1] = N− = right lead

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Current source — circle with filled arrow
// ---------------------------------------------------------------------------

export function drawCurrentSource(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const r = SYMBOL_HEIGHT / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  setLineStyle(ctx, colors.stroke);
  // Left lead
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-r, 0);
  ctx.stroke();
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  // Right lead
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(halfW, 0);
  ctx.stroke();

  // Filled arrow (IEEE standard — solid triangle pointing right)
  ctx.beginPath();
  ctx.moveTo(-5, -4);
  ctx.lineTo(6, 0);
  ctx.lineTo(-5, 4);
  ctx.closePath();
  ctx.fillStyle = colors.stroke;
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Capacitor — two parallel plates with full leads
// ---------------------------------------------------------------------------

export function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const plateH = 14;
  const gap = 5;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  setLineStyle(ctx, colors.stroke);
  // Left lead
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-gap / 2, 0);
  ctx.stroke();
  // Left plate
  setLineStyle(ctx, colors.stroke, 2.5);
  ctx.beginPath();
  ctx.moveTo(-gap / 2, -plateH / 2);
  ctx.lineTo(-gap / 2, plateH / 2);
  ctx.stroke();
  // Right plate
  ctx.beginPath();
  ctx.moveTo(gap / 2, -plateH / 2);
  ctx.lineTo(gap / 2, plateH / 2);
  ctx.stroke();
  // Right lead
  setLineStyle(ctx, colors.stroke);
  ctx.beginPath();
  ctx.moveTo(gap / 2, 0);
  ctx.lineTo(halfW, 0);
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Inductor — IEEE semicircle series
// ---------------------------------------------------------------------------

export function drawInductor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  setLineStyle(ctx, colors.stroke);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-20, 0); // left lead
  for (const cx of [-15, -5, 5, 15]) ctx.arc(cx, 0, 5, Math.PI, 0, false); // 4 upward semicircles, no overlap
  ctx.lineTo(halfW, 0); // right lead
  ctx.stroke();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Ground — three horizontal bars of decreasing width
// ---------------------------------------------------------------------------

export function drawGround(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  // Lead from terminal to first bar
  setLineStyle(ctx, colors.stroke);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Three decreasing bars
  const bars = [
    { y: 0, half: 12 },
    { y: 6, half: 8 },
    { y: 12, half: 4 },
  ];
  for (const bar of bars) {
    setLineStyle(ctx, colors.stroke, 2);
    ctx.beginPath();
    ctx.moveTo(-bar.half, bar.y);
    ctx.lineTo(bar.half, bar.y);
    ctx.stroke();
  }

  // Terminal dot
  ctx.fillStyle = colors.stroke;
  ctx.beginPath();
  ctx.arc(-halfW, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Component label
// ---------------------------------------------------------------------------

export function drawComponentLabel(
  ctx: CanvasRenderingContext2D,
  label: string,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  labelColor: string
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  ctx.fillStyle = labelColor;
  ctx.font = `${Math.max(9, 10 / viewport.scale)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(label, 0, SYMBOL_HEIGHT / 2 + 4);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function drawComponent(
  ctx: CanvasRenderingContext2D,
  canvasComp: CanvasComponent,
  component: Component,
  viewport: Viewport,
  colors: CanvasColors
): void {
  const { position, rotation, isSelected } = canvasComp;

  switch (component.type) {
    case 'resistor':
      drawResistor(ctx, position, rotation, viewport, isSelected, colors);
      break;
    case 'voltage_source':
      drawVoltageSource(ctx, position, rotation, viewport, isSelected, colors);
      break;
    case 'current_source':
      drawCurrentSource(ctx, position, rotation, viewport, isSelected, colors);
      break;
    case 'capacitor':
      drawCapacitor(ctx, position, rotation, viewport, isSelected, colors);
      break;
    case 'inductor':
      drawInductor(ctx, position, rotation, viewport, isSelected, colors);
      break;
    case 'ground':
      drawGround(ctx, position, rotation, viewport, isSelected, colors);
      break;
    default:
      // Unsupported type (e.g. diode — #29): render resistor box as placeholder.
      drawResistor(ctx, position, rotation, viewport, isSelected, colors);
  }
}
