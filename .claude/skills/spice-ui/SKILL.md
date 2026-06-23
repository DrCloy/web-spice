---
name: spice-ui
description: 'WebSpice UI 구현 가이드. src/components/ 또는 src/store/ 코드 작성 시 반드시 이 스킬을 읽을 것. Canvas 렌더링, Redux Toolkit 슬라이스, React 이벤트 패턴을 다룬다.'
---

## Canvas 렌더링 패턴

`src/components/circuit/CircuitCanvas.tsx`와 `renderScene.ts`를 먼저 읽어 렌더링 구조 파악.

핵심 원칙:

- 모든 Canvas 색상은 `src/theme/canvasColors.ts` 상수 사용 (하드코딩 금지)
- 심볼 드로잉 함수는 `src/components/circuit/symbolRenderer.ts`에 추가
- `requestAnimationFrame` 기반 렌더 루프 유지
- 테마 변경 시 ThemeContext를 통해 canvasColors 재선택 후 리드로우

새 심볼 추가 시: `symbolRenderer.ts`에 함수 추가 → `renderScene.ts`에서 호출 → `tests/components/circuit/symbolRenderer.test.ts`에 테스트.

상세 Canvas 패턴: `references/canvas-patterns.md` 참조.

## Redux 슬라이스 패턴

`src/store/circuitSlice.ts`와 `src/store/types.ts`를 먼저 읽어 상태 구조 파악.

핵심 원칙:

- 새 상태 필드는 `src/store/types.ts`에 인터페이스 추가 후 슬라이스에 반영
- Immer 기반 reducers — 직접 변이 가능 (`state.components.push(...)`)
- 복잡한 파생 상태는 selector로 분리 (`createSelector` 활용)
- `src/hooks/store.ts`의 typed hooks (`useAppSelector`, `useAppDispatch`) 사용

슬라이스 수정 체크리스트:

1. `src/store/types.ts` — 상태 타입 수정
2. `src/store/{name}Slice.ts` — initialState + reducers 수정
3. `src/store/index.ts` — 슬라이스 등록 확인
4. `tests/store/{name}Slice.test.ts` — 리듀서 단위 테스트

## Canvas 이벤트 → Redux 연결 패턴

```typescript
// Canvas 이벤트 핸들러에서 Redux dispatch
const handleMouseDown = useCallback(
  (e: MouseEvent) => {
    const { x, y } = canvasToWorld(e.clientX, e.clientY, transform);
    dispatch(editorSlice.actions.startSelection({ x, y }));
  },
  [dispatch, transform]
);
```

좌표 변환 유틸리티: `src/utils/canvas.ts` 활용.

## React 컴포넌트 규칙

- 파일명: PascalCase (예: `PropertyPanel.tsx`)
- TailwindCSS 클래스 직접 사용 (CSS 파일 최소화)
- HeadlessUI 컴포넌트 활용 (드롭다운, 다이얼로그 등)
- React 19 + React Compiler — 불필요한 `useMemo`/`useCallback` 지양

## 드래그앤드롭 패턴 (#19)

ComponentPalette → CircuitCanvas 드롭 흐름:

1. Palette: `dragstart` 이벤트에 컴포넌트 타입을 `dataTransfer.setData`로 전달
2. Canvas: `dragover` + `drop` 이벤트 핸들러에서 좌표 변환 후 `addComponent` 액션 dispatch
3. 그리드 스냅: 드롭 좌표를 격자에 맞춰 정렬

## 상세 가이드

- Canvas 드로잉 패턴 전체: `references/canvas-patterns.md`
