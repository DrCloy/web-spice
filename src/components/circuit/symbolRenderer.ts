/**
 * Circuit component symbol renderer.
 *
 * Pure functions — each draw function:
 *   - Accepts a resolved ComponentColors object (no DOM access)
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
import type { ComponentColors } from '@/utils/componentColors';
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

/** Draw lead wires from component edge to terminal points. */
function drawLeads(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  color: string
): void {
  setLineStyle(ctx, color);
  ctx.beginPath();
  ctx.moveTo(-halfW, 0);
  ctx.lineTo(-halfW + 10, 0);
  ctx.moveTo(halfW - 10, 0);
  ctx.lineTo(halfW, 0);
  ctx.stroke();
}

/** Draw a small circle at each terminal. */
function drawTerminals(
  ctx: CanvasRenderingContext2D,
  halfW: number,
  color: string
): void {
  ctx.fillStyle = color;
  for (const x of [-halfW, halfW]) {
    ctx.beginPath();
    ctx.arc(x, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSelectionHighlight(
  ctx: CanvasRenderingContext2D,
  colors: ComponentColors
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
  canvasHeight: number
): void {
  ctx.save();

  const scaledGrid = gridSize * viewport.scale;
  if (scaledGrid < 4) {
    ctx.restore();
    return; // too dense to draw
  }

  const startX = ((viewport.offsetX % scaledGrid) + scaledGrid) % scaledGrid;
  const startY = ((viewport.offsetY % scaledGrid) + scaledGrid) % scaledGrid;

  ctx.fillStyle = 'rgba(156, 163, 175, 0.4)'; // gray-400 at 40%
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
// Resistor — IEC style rectangle
// ---------------------------------------------------------------------------

export function drawResistor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const boxW = 30;
  const boxH = 12;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  drawLeads(ctx, halfW, colors.resistor);

  setLineStyle(ctx, colors.resistor);
  ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

  drawTerminals(ctx, halfW, colors.resistor);

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
  colors: ComponentColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const radius = SYMBOL_HEIGHT / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  drawLeads(ctx, halfW, colors.voltage);

  setLineStyle(ctx, colors.voltage);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = colors.voltage;
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', 5, 0);
  ctx.fillText('−', -5, 0);

  drawTerminals(ctx, halfW, colors.voltage);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Current source — circle with arrow
// ---------------------------------------------------------------------------

export function drawCurrentSource(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const radius = SYMBOL_HEIGHT / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  drawLeads(ctx, halfW, colors.current);

  setLineStyle(ctx, colors.current);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow pointing right (conventional current direction)
  ctx.fillStyle = colors.current;
  ctx.beginPath();
  ctx.moveTo(5, 0);
  ctx.lineTo(-3, -4);
  ctx.lineTo(-3, 4);
  ctx.closePath();
  ctx.fill();

  drawTerminals(ctx, halfW, colors.current);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Capacitor — two parallel plates
// ---------------------------------------------------------------------------

export function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;
  const plateH = 14;
  const gap = 5;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  drawLeads(ctx, halfW, colors.capacitor);

  setLineStyle(ctx, colors.capacitor, 2.5);
  // Left plate
  ctx.beginPath();
  ctx.moveTo(-gap / 2, -plateH / 2);
  ctx.lineTo(-gap / 2, plateH / 2);
  ctx.stroke();
  // Right plate
  ctx.beginPath();
  ctx.moveTo(gap / 2, -plateH / 2);
  ctx.lineTo(gap / 2, plateH / 2);
  ctx.stroke();

  drawTerminals(ctx, halfW, colors.capacitor);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Ground — three horizontal lines of decreasing width
// ---------------------------------------------------------------------------

export function drawGround(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  const halfW = SYMBOL_WIDTH / 2;

  if (isSelected) drawSelectionHighlight(ctx, colors);

  // Lead from terminal to first bar
  setLineStyle(ctx, colors.ground);
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
    setLineStyle(ctx, colors.ground, 2);
    ctx.beginPath();
    ctx.moveTo(-bar.half, bar.y);
    ctx.lineTo(bar.half, bar.y);
    ctx.stroke();
  }

  // Terminal dot
  ctx.fillStyle = colors.ground;
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
  viewport: Viewport
): void {
  ctx.save();
  applyTransform(ctx, center, rotation, viewport);

  ctx.fillStyle = 'rgb(107 114 128)'; // gray-500
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
  colors: ComponentColors
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
    case 'ground':
      drawGround(ctx, position, rotation, viewport, isSelected, colors);
      break;
    default:
      // Unsupported type: draw placeholder box
      drawResistor(ctx, position, rotation, viewport, isSelected, colors);
  }
}
