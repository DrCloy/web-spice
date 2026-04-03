import { useEffect, useRef, useState } from 'react';
import type { ComponentColors } from '@/utils/componentColors';
import { resolveComponentColors } from '@/utils/componentColors';
import type { ComponentType } from '@/types/component';
import type { Point, Rotation, Viewport } from '@/types/editor';
import { PALETTE_DRAG_MIME } from '@/types/editor';
import type { PaletteDragPayload } from '@/types/editor';
import {
  drawCapacitor,
  drawCurrentSource,
  drawGround,
  drawResistor,
  drawVoltageSource,
} from '@/components/circuit/symbolRenderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SymbolDrawFn = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
) => void;

interface PaletteItemConfig {
  id: string;
  type: ComponentType;
  label: string;
  /** ComponentColors의 키 — CSS var `--color-component-{colorKey}` 에 대응 */
  colorKey: keyof Omit<ComponentColors, 'wire' | 'selected'>;
  drawFn: SymbolDrawFn;
  dragPayload: PaletteDragPayload;
}

// ---------------------------------------------------------------------------
// Inductor draw helper — symbolRenderer.ts의 기존 패턴과 동일
// ---------------------------------------------------------------------------

function drawInductor(
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: ComponentColors
): void {
  drawResistor(ctx, center, rotation, viewport, isSelected, {
    ...colors,
    resistor: colors.inductor,
  });
}

// ---------------------------------------------------------------------------
// Palette items
// AC Voltage/Current는 Task #23 (AC 분석 엔진) 완료 후 추가
// ---------------------------------------------------------------------------

const PALETTE_ITEMS: readonly PaletteItemConfig[] = [
  {
    id: 'dc-voltage',
    type: 'voltage_source',
    label: 'DC Voltage',
    colorKey: 'voltage',
    drawFn: drawVoltageSource,
    dragPayload: { type: 'voltage_source', sourceType: 'dc' },
  },
  {
    id: 'dc-current',
    type: 'current_source',
    label: 'DC Current',
    colorKey: 'current',
    drawFn: drawCurrentSource,
    dragPayload: { type: 'current_source', sourceType: 'dc' },
  },
  {
    id: 'resistor',
    type: 'resistor',
    label: 'Resistor',
    colorKey: 'resistor',
    drawFn: drawResistor,
    dragPayload: { type: 'resistor' },
  },
  {
    id: 'capacitor',
    type: 'capacitor',
    label: 'Capacitor',
    colorKey: 'capacitor',
    drawFn: drawCapacitor,
    dragPayload: { type: 'capacitor' },
  },
  {
    id: 'inductor',
    type: 'inductor',
    label: 'Inductor',
    colorKey: 'inductor',
    drawFn: drawInductor,
    dragPayload: { type: 'inductor' },
  },
  {
    id: 'ground',
    type: 'ground',
    label: 'Ground',
    colorKey: 'ground',
    drawFn: drawGround,
    dragPayload: { type: 'ground' },
  },
];

// ---------------------------------------------------------------------------
// PaletteItemCanvas
// ---------------------------------------------------------------------------

function PaletteItemCanvas({
  config,
  colors,
}: {
  config: PaletteItemConfig;
  colors: ComponentColors;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = 80 * dpr;
    canvas.height = 40 * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, 80, 40);

    // SYMBOL_WIDTH=60 → 리드가 ±30, 화면에서 x=10~70. 80px 캔버스에 맞음
    const viewport: Viewport = { offsetX: 40, offsetY: 20, scale: 1.0 };
    config.drawFn(ctx, { x: 0, y: 0 }, 0, viewport, false, colors);
  }, [config, colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 80, height: 40, display: 'block', flexShrink: 0 }}
      aria-hidden='true'
    />
  );
}

// ---------------------------------------------------------------------------
// PaletteItem
// ---------------------------------------------------------------------------

function PaletteItem({
  config,
  colors,
  isSelected,
  onSelect,
}: {
  config: PaletteItemConfig;
  colors: ComponentColors;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData(
      PALETTE_DRAG_MIME,
      JSON.stringify(config.dragPayload)
    );
  };

  return (
    <li>
      <button
        draggable
        aria-label={`Add ${config.label}`}
        aria-pressed={isSelected}
        onClick={() => onSelect(config.id)}
        onDragStart={handleDragStart}
        className={[
          'flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          isSelected ? 'bg-gray-100 dark:bg-gray-700' : '',
        ].join(' ')}
      >
        {/* inline CSS var — Tailwind 동적 클래스는 purge로 제거되므로 사용 불가 */}
        <span
          className='h-8 w-0.5 shrink-0 rounded-full'
          style={{
            backgroundColor: `var(--color-component-${config.colorKey})`,
          }}
        />
        <PaletteItemCanvas config={config} colors={colors} />
        <span className='truncate text-sm text-gray-700 dark:text-gray-300'>
          {config.label}
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// ComponentPalette
// ---------------------------------------------------------------------------

export default function ComponentPalette() {
  // lazy initializer: Vite가 CSS를 모듈 평가 시 <style>로 주입하므로
  // 첫 render 시점에 CSS 변수가 이미 적용돼 있음
  const [colors] = useState<ComponentColors>(resolveComponentColors);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <aside
      className='component-palette flex flex-col'
      aria-label='Component palette'
    >
      <div className='border-b border-gray-200 px-3 py-2 dark:border-gray-700'>
        <h2 className='text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400'>
          Components
        </h2>
      </div>
      <ul role='list' className='flex-1 space-y-0.5 overflow-y-auto p-2'>
        {PALETTE_ITEMS.map(config => (
          <PaletteItem
            key={config.id}
            config={config}
            colors={colors}
            isSelected={selectedId === config.id}
            onSelect={setSelectedId}
          />
        ))}
      </ul>
    </aside>
  );
}
