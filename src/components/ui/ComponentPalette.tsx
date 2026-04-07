import { useEffect, useRef, useState } from 'react';
import { useCanvasColors } from '@/contexts/ThemeContext';
import type { CanvasColors } from '@/theme/canvasColors';
import type { ComponentType } from '@/types/component';
import type { Point, Rotation, Viewport } from '@/types/editor';
import { PALETTE_DRAG_MIME } from '@/types/editor';
import type { PaletteDragPayload } from '@/types/editor';
import {
  drawCapacitor,
  drawCurrentSource,
  drawInductor,
  drawResistor,
  drawVoltageSource,
} from '@/components/circuit/symbolRenderer';
import { logicalToScreen } from '@/utils/canvas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SymbolDrawFn = (
  ctx: CanvasRenderingContext2D,
  center: Point,
  rotation: Rotation,
  viewport: Viewport,
  isSelected: boolean,
  colors: CanvasColors
) => void;

interface PaletteItemConfig {
  id: string;
  type: ComponentType;
  label: string;
  drawFn: SymbolDrawFn;
  dragPayload: PaletteDragPayload;
}

// ---------------------------------------------------------------------------
// Ground palette — palette-only vertical symbol
// The main canvas drawGround has halfW=30 which clips outside the 40px-tall
// palette canvas when rotated. This dedicated function uses leadLen=12 to fit.
// ---------------------------------------------------------------------------

function drawGroundPalette(
  ctx: CanvasRenderingContext2D,
  center: Point,
  _rotation: Rotation,
  viewport: Viewport,
  _isSelected: boolean,
  colors: CanvasColors
): void {
  ctx.save();

  const screen = logicalToScreen(center, viewport);
  ctx.translate(screen.x, screen.y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(viewport.scale, viewport.scale);

  ctx.strokeStyle = colors.stroke;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leadLen = 12;
  const bars = [
    { y: 0, half: 14 },
    { y: 6, half: 9 },
    { y: 12, half: 5 },
  ];

  // Vertical lead from top terminal down
  ctx.beginPath();
  ctx.moveTo(0, -leadLen);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Horizontal bars (decreasing width)
  for (const bar of bars) {
    ctx.beginPath();
    ctx.moveTo(-bar.half, bar.y);
    ctx.lineTo(bar.half, bar.y);
    ctx.stroke();
  }

  // Terminal dot
  ctx.fillStyle = colors.stroke;
  ctx.beginPath();
  ctx.arc(0, -leadLen, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Palette items
// AC Voltage/Current to be added after Task #23 (AC analysis engine)
// ---------------------------------------------------------------------------

const PALETTE_ITEMS: readonly PaletteItemConfig[] = [
  {
    id: 'dc-voltage',
    type: 'voltage_source',
    label: 'DC Voltage',
    drawFn: drawVoltageSource,
    dragPayload: { type: 'voltage_source', sourceType: 'dc' },
  },
  {
    id: 'dc-current',
    type: 'current_source',
    label: 'DC Current',
    drawFn: drawCurrentSource,
    dragPayload: { type: 'current_source', sourceType: 'dc' },
  },
  {
    id: 'resistor',
    type: 'resistor',
    label: 'Resistor',
    drawFn: drawResistor,
    dragPayload: { type: 'resistor' },
  },
  {
    id: 'capacitor',
    type: 'capacitor',
    label: 'Capacitor',
    drawFn: drawCapacitor,
    dragPayload: { type: 'capacitor' },
  },
  {
    id: 'inductor',
    type: 'inductor',
    label: 'Inductor',
    drawFn: drawInductor,
    dragPayload: { type: 'inductor' },
  },
  {
    id: 'ground',
    type: 'ground',
    label: 'Ground',
    drawFn: drawGroundPalette,
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
  colors: CanvasColors;
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

    // SYMBOL_WIDTH=60 → leads at ±30, screen x=10~70. Fits in 80px canvas.
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
  colors: CanvasColors;
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
        onClick={e => {
          e.stopPropagation();
          onSelect(config.id);
        }}
        onDragStart={handleDragStart}
        className={[
          'flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left transition-colors',
          'hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white',
          isSelected
            ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
            : 'text-gray-700 dark:text-gray-300',
        ].join(' ')}
      >
        <span
          className='h-8 w-0.5 shrink-0 rounded-full'
          style={{ backgroundColor: colors.stroke }}
        />
        <PaletteItemCanvas config={config} colors={colors} />
        <span className='truncate text-sm'>{config.label}</span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// ComponentPalette
// ---------------------------------------------------------------------------

export default function ComponentPalette() {
  const colors = useCanvasColors();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);

  // Deselect when clicking outside the palette (e.g. on the canvas)
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (asideRef.current && !asideRef.current.contains(e.target as Node)) {
        setSelectedId(null);
      }
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  return (
    <aside
      ref={asideRef}
      className='component-palette flex flex-col dark:border-gray-700 dark:bg-gray-800'
      aria-label='Component palette'
      onClick={() => setSelectedId(null)}
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
