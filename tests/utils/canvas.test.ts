import { describe, expect, it } from 'vitest';
import {
  autoLayoutComponents,
  calculateZoom,
  findHitComponent,
  fitViewportToCircuit,
  getCircuitBounds,
  getComponentBounds,
  hitTestComponent,
  logicalToScreen,
  screenToLogical,
  snapToGrid,
} from '@/utils/canvas';
import type { CanvasComponent, Viewport } from '@/types/editor';
import {
  DEFAULT_VIEWPORT,
  VIEWPORT_SCALE_MAX,
  VIEWPORT_SCALE_MIN,
} from '@/types/editor';
import { createDCVoltageSource, createResistor } from '../factories/components';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VP_IDENTITY: Viewport = { offsetX: 0, offsetY: 0, scale: 1 };
const VP_SCALED: Viewport = { offsetX: 50, offsetY: 30, scale: 2 };

const COMP_A: CanvasComponent = {
  componentId: 'R1',
  position: { x: 100, y: 100 },
  rotation: 0,
  isSelected: false,
};

const COMP_B: CanvasComponent = {
  componentId: 'V1',
  position: { x: 300, y: 100 },
  rotation: 0,
  isSelected: false,
};

// ---------------------------------------------------------------------------
// logicalToScreen
// ---------------------------------------------------------------------------

describe('logicalToScreen', () => {
  it('should be identity when scale=1 and offset=0', () => {
    expect(logicalToScreen({ x: 100, y: 200 }, VP_IDENTITY)).toEqual({
      x: 100,
      y: 200,
    });
  });

  it('should apply scale: screen = logical * scale + offset', () => {
    const result = logicalToScreen({ x: 100, y: 100 }, VP_SCALED);
    // x = 100 * 2 + 50 = 250, y = 100 * 2 + 30 = 230
    expect(result).toEqual({ x: 250, y: 230 });
  });

  it('should handle zero point', () => {
    expect(logicalToScreen({ x: 0, y: 0 }, VP_SCALED)).toEqual({
      x: 50,
      y: 30,
    });
  });
});

// ---------------------------------------------------------------------------
// screenToLogical
// ---------------------------------------------------------------------------

describe('screenToLogical', () => {
  it('should be identity when scale=1 and offset=0', () => {
    expect(screenToLogical({ x: 100, y: 200 }, VP_IDENTITY)).toEqual({
      x: 100,
      y: 200,
    });
  });

  it('should be the inverse of logicalToScreen', () => {
    const logical = { x: 123, y: 456 };
    const screen = logicalToScreen(logical, VP_SCALED);
    const back = screenToLogical(screen, VP_SCALED);
    expect(back.x).toBeCloseTo(logical.x);
    expect(back.y).toBeCloseTo(logical.y);
  });

  it('should handle negative offsets', () => {
    const vp: Viewport = { offsetX: -100, offsetY: -50, scale: 0.5 };
    const screen = { x: 0, y: 0 };
    // logical = (0 - (-100)) / 0.5 = 200
    expect(screenToLogical(screen, vp)).toEqual({ x: 200, y: 100 });
  });

  it('should return Infinity when scale=0', () => {
    const vp: Viewport = { offsetX: 0, offsetY: 0, scale: 0 };
    const result = screenToLogical({ x: 100, y: 100 }, vp);
    expect(result.x).toBe(Infinity);
    expect(result.y).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// snapToGrid
// ---------------------------------------------------------------------------

describe('snapToGrid', () => {
  it('should snap to nearest grid line', () => {
    // gridSize=20: 23 → 20, 37 → 40
    expect(snapToGrid({ x: 23, y: 37 }, 20)).toEqual({ x: 20, y: 40 });
  });

  it('should leave already-snapped coordinates unchanged', () => {
    expect(snapToGrid({ x: 40, y: 80 }, 20)).toEqual({ x: 40, y: 80 });
  });

  it('should snap negative values to nearest grid line', () => {
    // -15 rounds to -20, -25 rounds to -20
    expect(snapToGrid({ x: -15, y: -25 }, 20)).toEqual({ x: -20, y: -20 });
  });

  it('should handle gridSize=1 (no effective snapping)', () => {
    expect(snapToGrid({ x: 17, y: 23 }, 1)).toEqual({ x: 17, y: 23 });
  });

  it('should return NaN when gridSize=0', () => {
    const result = snapToGrid({ x: 23, y: 37 }, 0);
    expect(Number.isNaN(result.x)).toBe(true);
    expect(Number.isNaN(result.y)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// hitTestComponent (SYMBOL_WIDTH=60, SYMBOL_HEIGHT=30)
// ---------------------------------------------------------------------------

describe('hitTestComponent', () => {
  it('should return true for a point at the component center', () => {
    expect(hitTestComponent({ x: 100, y: 100 }, COMP_A)).toBe(true);
  });

  it('should return true for a point inside the bounding box', () => {
    // center=(100,100), half=(30,15) → bounds [70,130] x [85,115]
    expect(hitTestComponent({ x: 105, y: 108 }, COMP_A)).toBe(true);
  });

  it('should return false for a point clearly outside', () => {
    expect(hitTestComponent({ x: 200, y: 200 }, COMP_A)).toBe(false);
  });

  it('should return false just outside the edge', () => {
    // x=131 is just outside right edge (100+30=130)
    expect(hitTestComponent({ x: 131, y: 100 }, COMP_A)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findHitComponent
// ---------------------------------------------------------------------------

describe('findHitComponent', () => {
  it('should return null when no components', () => {
    expect(findHitComponent({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('should return the component at the given point', () => {
    const result = findHitComponent({ x: 100, y: 100 }, [COMP_A, COMP_B]);
    expect(result?.componentId).toBe('R1');
  });

  it('should return null when point does not hit any component', () => {
    expect(findHitComponent({ x: 500, y: 500 }, [COMP_A, COMP_B])).toBeNull();
  });

  it('should return the last component in array when overlapping (z-order)', () => {
    const COMP_OVERLAP: CanvasComponent = {
      componentId: 'R2',
      position: { x: 100, y: 100 },
      rotation: 0,
      isSelected: false,
    };
    const result = findHitComponent({ x: 100, y: 100 }, [COMP_A, COMP_OVERLAP]);
    expect(result?.componentId).toBe('R2');
  });
});

// ---------------------------------------------------------------------------
// getComponentBounds
// ---------------------------------------------------------------------------

describe('getComponentBounds', () => {
  it('should return correct bounds for rotation=0', () => {
    const bounds = getComponentBounds(COMP_A);
    // center=(100,100), half=(30,15)
    expect(bounds).toEqual({ x: 70, y: 85, width: 60, height: 30 });
  });

  it('should swap width/height for rotation=90', () => {
    const rotated: CanvasComponent = { ...COMP_A, rotation: 90 };
    const bounds = getComponentBounds(rotated);
    expect(bounds).toEqual({ x: 85, y: 70, width: 30, height: 60 });
  });
});

// ---------------------------------------------------------------------------
// getCircuitBounds
// ---------------------------------------------------------------------------

describe('getCircuitBounds', () => {
  it('should return null for empty array', () => {
    expect(getCircuitBounds([])).toBeNull();
  });

  it('should return the bounding box that encloses all components', () => {
    const bounds = getCircuitBounds([COMP_A, COMP_B]);
    // COMP_A bounds: x=70, y=85, w=60, h=30 → right=130, bottom=115
    // COMP_B bounds: x=270, y=85, w=60, h=30 → right=330, bottom=115
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeLessThanOrEqual(70);
    expect(bounds!.y).toBeLessThanOrEqual(85);
    expect(bounds!.x + bounds!.width).toBeGreaterThanOrEqual(330);
  });
});

// ---------------------------------------------------------------------------
// calculateZoom
// ---------------------------------------------------------------------------

describe('calculateZoom', () => {
  it('should increase scale when delta > 0', () => {
    const result = calculateZoom(VP_IDENTITY, 1, { x: 0, y: 0 });
    expect(result.scale).toBeGreaterThan(1.0);
  });

  it('should decrease scale when delta < 0', () => {
    const result = calculateZoom(VP_IDENTITY, -1, { x: 0, y: 0 });
    expect(result.scale).toBeLessThan(1.0);
  });

  it('should clamp to VIEWPORT_SCALE_MIN', () => {
    const vp: Viewport = { offsetX: 0, offsetY: 0, scale: VIEWPORT_SCALE_MIN };
    const result = calculateZoom(vp, -10, { x: 0, y: 0 });
    expect(result.scale).toBeGreaterThanOrEqual(VIEWPORT_SCALE_MIN);
  });

  it('should clamp to VIEWPORT_SCALE_MAX', () => {
    const vp: Viewport = { offsetX: 0, offsetY: 0, scale: VIEWPORT_SCALE_MAX };
    const result = calculateZoom(vp, 10, { x: 0, y: 0 });
    expect(result.scale).toBeLessThanOrEqual(VIEWPORT_SCALE_MAX);
  });

  it('should keep the zoom center fixed on screen', () => {
    const center = { x: 200, y: 150 };
    const vp: Viewport = { offsetX: 0, offsetY: 0, scale: 1 };
    const result = calculateZoom(vp, 1, center);
    // The logical point under the center should not move:
    // logical_before = (center - offset) / scale = center
    // logical_after  = (center - newOffset) / newScale
    const logicalBefore = { x: center.x / vp.scale, y: center.y / vp.scale };
    const logicalAfter = {
      x: (center.x - result.offsetX) / result.scale,
      y: (center.y - result.offsetY) / result.scale,
    };
    expect(logicalAfter.x).toBeCloseTo(logicalBefore.x);
    expect(logicalAfter.y).toBeCloseTo(logicalBefore.y);
  });
});

// ---------------------------------------------------------------------------
// fitViewportToCircuit
// ---------------------------------------------------------------------------

describe('fitViewportToCircuit', () => {
  it('should return DEFAULT_VIEWPORT for empty components', () => {
    expect(fitViewportToCircuit([], 800, 600)).toEqual(DEFAULT_VIEWPORT);
  });

  it('should produce a viewport where all components are visible', () => {
    const vp = fitViewportToCircuit([COMP_A, COMP_B], 800, 600);
    // All components should map to within [0, canvasWidth] x [0, canvasHeight]
    const bounds = getCircuitBounds([COMP_A, COMP_B])!;
    const screenLeft = logicalToScreen({ x: bounds.x, y: bounds.y }, vp);
    const screenRight = logicalToScreen(
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      vp
    );
    expect(screenLeft.x).toBeGreaterThanOrEqual(0);
    expect(screenLeft.y).toBeGreaterThanOrEqual(0);
    expect(screenRight.x).toBeLessThanOrEqual(800);
    expect(screenRight.y).toBeLessThanOrEqual(600);
  });
});

// ---------------------------------------------------------------------------
// autoLayoutComponents
// ---------------------------------------------------------------------------

describe('autoLayoutComponents', () => {
  it('should return empty array for empty input', () => {
    expect(autoLayoutComponents([])).toEqual([]);
  });

  it('should create one CanvasComponent per input component', () => {
    const r1 = createResistor({
      id: 'R1',
      resistance: 1000,
      nodes: ['1', '0'],
    });
    const result = autoLayoutComponents([r1]);
    expect(result).toHaveLength(1);
    expect(result[0].componentId).toBe('R1');
    expect(result[0].rotation).toBe(0);
    expect(result[0].isSelected).toBe(false);
  });

  it('should space components horizontally', () => {
    const r1 = createResistor({
      id: 'R1',
      resistance: 1000,
      nodes: ['1', '0'],
    });
    const v1 = createDCVoltageSource({
      id: 'V1',
      voltage: 12,
      nodes: ['2', '0'],
    });
    const result = autoLayoutComponents([r1, v1]);
    expect(result[1].position.x).toBeGreaterThan(result[0].position.x);
  });

  it('should snap positions to grid', () => {
    const r1 = createResistor({
      id: 'R1',
      resistance: 1000,
      nodes: ['1', '0'],
    });
    const result = autoLayoutComponents([r1]);
    expect(result[0].position.x % 20).toBe(0);
    expect(result[0].position.y % 20).toBe(0);
  });
});
