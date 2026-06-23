# WebSpice Canvas 구현 패턴

## 좌표계

- **스크린 좌표**: `e.clientX`, `e.clientY` — 브라우저 픽셀
- **캔버스 좌표**: `getBoundingClientRect()` 보정 후 캔버스 내부 픽셀
- **월드 좌표**: 캔버스 좌표에서 transform(이동, 줌) 역변환 → 회로 논리 좌표
- `src/utils/canvas.ts`의 변환 함수 활용

## 심볼 렌더러 추가 패턴

```typescript
// src/components/circuit/symbolRenderer.ts에 추가
export function drawCapacitor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  colors: CanvasColors
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.strokeStyle = colors.component;
  ctx.lineWidth = 2;

  // 캐패시터: 두 평행 선 (IEC/IEEE 표준)
  const PLATE_WIDTH = 12;
  const PLATE_GAP = 6;
  // ... 드로잉 로직

  ctx.restore();
}
```

반드시 `ctx.save()` / `ctx.restore()` 쌍 사용. 좌표는 심볼 중심(0,0) 기준.

## renderScene.ts 통합

```typescript
case 'capacitor':
  drawCapacitor(ctx, component.x, component.y, component.rotation, colors);
  break;
```

## 그리드 스냅

```typescript
const GRID_SIZE = 20; // src/utils/canvas.ts 상수와 일치시킬 것
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}
```

## Canvas Mock (테스트)

```typescript
// tests/utils/helpers.ts 또는 setup.ts 참조
const mockCtx = {
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  fillText: vi.fn(),
  // ... 필요한 메서드만 추가
} as unknown as CanvasRenderingContext2D;
```

## 핀 연결 좌표

각 컴포넌트는 핀 위치를 반환하는 함수를 가진다. 와이어 연결 시스템(#20)을 위해 핀 위치는 심볼 크기 상수(`SYMBOL_WIDTH` 등)를 기반으로 계산한다 — 하드코딩 금지.
