import { describe, expect, it, vi } from 'vitest';
import {
  drawCapacitor,
  drawCurrentSource,
  drawGround,
  drawInductor,
  drawResistor,
  drawVoltageSource,
} from '@/components/circuit/symbolRenderer';
import { LIGHT_CANVAS_COLORS } from '@/theme/canvasColors';
import type { Point, Rotation, Viewport } from '@/types/editor';

// ---------------------------------------------------------------------------
// Mock CanvasRenderingContext2D
// ---------------------------------------------------------------------------

function makeCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    font: '',
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
}

const CENTER: Point = { x: 0, y: 0 };
const ROTATION: Rotation = 0;
const VIEWPORT: Viewport = { offsetX: 40, offsetY: 20, scale: 1.0 };
const COLORS = LIGHT_CANVAS_COLORS;

// ---------------------------------------------------------------------------
// Smoke tests — each draw function completes without throwing
// ---------------------------------------------------------------------------

describe('symbolRenderer', () => {
  describe('drawResistor', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawResistor(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });

    it('should draw selection highlight when selected', () => {
      const ctx = makeCtx();
      drawResistor(ctx, CENTER, ROTATION, VIEWPORT, true, COLORS);
      expect(ctx.strokeRect).toHaveBeenCalledOnce();
    });
  });

  describe('drawVoltageSource', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawVoltageSource(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });

    it('should render + on the left (terminals[0] = N+)', () => {
      const ctx = makeCtx();
      drawVoltageSource(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS);
      const calls = vi.mocked(ctx.fillText).mock.calls;
      // First fillText call must be '+' at negative x (left side = N+)
      expect(calls[0][0]).toBe('+');
      expect(calls[0][1]).toBeLessThan(0);
      // Second fillText call must be '−' at positive x (right side = N−)
      expect(calls[1][0]).toBe('−');
      expect(calls[1][1]).toBeGreaterThan(0);
    });
  });

  describe('drawCurrentSource', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawCurrentSource(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });
  });

  describe('drawCapacitor', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawCapacitor(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });
  });

  describe('drawInductor', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawInductor(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });

    it('should draw 4 semicircle arcs', () => {
      const ctx = makeCtx();
      drawInductor(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS);
      // arc() is called once per semicircle
      expect(ctx.arc).toHaveBeenCalledTimes(4);
    });
  });

  describe('drawGround', () => {
    it('should draw without throwing', () => {
      const ctx = makeCtx();
      expect(() =>
        drawGround(ctx, CENTER, ROTATION, VIEWPORT, false, COLORS)
      ).not.toThrow();
    });
  });
});
