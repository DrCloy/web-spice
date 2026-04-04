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
// Ground palette — 팔레트 전용 수직 심볼
// 메인 캔버스의 drawGround는 terminal이 왼쪽(수평)이지만,
// 팔레트 미리보기에서는 terminal 위쪽, 바가 아래로 가는 수직 표준 기호로 렌더
// ---------------------------------------------------------------------------

function drawGroundPalette(
  ctx: CanvasRenderingContext2D,
  center: Point,
  _rotation: Rotation,
  viewport: Viewport,
  _isSelected: boolean,
  colors: ComponentColors
): void {
  ctx.save();

  const screen = logicalToScreen(center, viewport);
  ctx.translate(screen.x, screen.y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(viewport.scale, viewport.scale);

  ctx.strokeStyle = colors.ground;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const leadLen = 12;
  const bars = [
    { y: 0, half: 14 },
    { y: 6, half: 9 },
    { y: 12, half: 5 },
  ];

  // 위쪽 terminal에서 아래로 내려오는 수직 lead
  ctx.beginPath();
  ctx.moveTo(0, -leadLen);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // 수평 바 (아래로 쌓임, 폭 감소)
  for (const bar of bars) {
    ctx.beginPath();
    ctx.moveTo(-bar.half, bar.y);
    ctx.lineTo(bar.half, bar.y);
    ctx.stroke();
  }

  // terminal 점
  ctx.fillStyle = colors.ground;
  ctx.beginPath();
  ctx.arc(0, -leadLen, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
        onClick={e => {
          e.stopPropagation();
          onSelect(config.id);
        }}
        onDragStart={handleDragStart}
        className={[
          'flex w-full cursor-grab items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-gray-700 hover:text-white',
          isSelected ? 'bg-gray-700 text-white' : 'text-gray-900',
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
        <span className='truncate text-sm'>{config.label}</span>
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
  const asideRef = useRef<HTMLElement>(null);

  // 팔레트 바깥 클릭 시 선택 해제 (캔버스 등 다른 영역 클릭 포함)
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
      className='component-palette flex flex-col'
      aria-label='Component palette'
      onClick={() => setSelectedId(null)}
    >
      <div className='border-b border-gray-200 px-3 py-2 dark:border-gray-700'>
        <h2 className='text-xs font-semibold tracking-wider text-gray-700 uppercase'>
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
