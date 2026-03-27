# Development Guide

WebSpice 개발 환경 설정 및 개발 가이드라인

## 🚀 환경 설정

### Prerequisites

- **Node.js 20.x** (LTS 권장)
- **VS Code** + Dev Container 확장 (권장)
- **Git** 2.0 이상

### 개발 환경 옵션

#### Option 1: Dev Container (권장)

```bash
# 1. VS Code에서 프로젝트 열기
code web-spice/

# 2. Command Palette (Cmd/Ctrl + Shift + P)
# "Dev Containers: Reopen in Container" 선택

# 3. 자동으로 Node 20 환경 구성 완료
```

#### Option 2: 로컬 환경

```bash
# Node.js 20 설치 확인
node --version  # v20.x.x

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 필수 VS Code 확장

```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "GitHub.copilot"
  ]
}
```

## 🏗 프로젝트 구조

```
src/
├── components/           # React 컴포넌트
│   ├── ui/              # 기본 UI 컴포넌트 (Button, Input 등)
│   ├── circuit/         # 회로 관련 컴포넌트
│   │   ├── Canvas.tsx   # 회로 편집 캔버스
│   │   ├── Palette.tsx  # 컴포넌트 팔레트
│   │   └── Properties.tsx # 속성 패널
│   └── charts/          # 그래프 컴포넌트
├── engine/              # SPICE 시뮬레이션 엔진
│   ├── analysis/        # 분석 엔진
│   │   ├── dc.ts        # DC 분석
│   │   ├── ac.ts        # AC 분석 (Phase 2)
│   │   └── transient.ts # 과도 분석 (Phase 3)
│   ├── components/      # 컴포넌트 모델
│   │   ├── resistor.ts  # 저항 모델
│   │   ├── capacitor.ts # 캐패시터 모델 (Phase 2)
│   │   └── inductor.ts  # 인덕터 모델 (Phase 2)
│   └── solver/          # 수치해석
│       ├── matrix.ts    # 행렬 연산
│       └── newton.ts    # Newton-Raphson 해법
├── store/               # Redux 상태 관리
│   ├── store.ts         # 스토어 설정
│   ├── circuitSlice.ts  # 회로 상태
│   └── simulationSlice.ts # 시뮬레이션 상태
├── types/               # TypeScript 타입 정의
│   ├── circuit.ts       # 회로 관련 타입
│   ├── component.ts     # 컴포넌트 타입
│   └── simulation.ts    # 시뮬레이션 타입
├── utils/               # 유틸리티 함수
│   ├── parser.ts        # JSON/SPICE 파서
│   ├── validator.ts     # 입력 검증
│   └── formatter.ts     # 결과 포매팅
└── hooks/               # 커스텀 훅
    ├── useCircuit.ts    # 회로 관리 훅
    └── useSimulation.ts # 시뮬레이션 훅
```

## 💻 개발 워크플로

### TDD (Test-Driven Development)

```bash
# 1. 실시간 테스트 모니터링 시작
npm run test:watch

# 2. TDD 사이클
# Red → Green → Refactor
```

**예시 워크플로:**

1. **Red**: 실패하는 테스트 작성

```typescript
// resistor.test.ts
describe('Resistor', () => {
  it('should calculate voltage using Ohms law', () => {
    const resistor = new Resistor(1000); // 1kΩ
    const voltage = resistor.getVoltage(0.001); // 1mA
    expect(voltage).toBe(1); // 1V
  });
});
```

2. **Green**: 테스트 통과하는 최소 코드

```typescript
// resistor.ts
export class Resistor {
  constructor(private resistance: number) {}

  getVoltage(current: number): number {
    return this.resistance * current; // V = IR
  }
}
```

3. **Refactor**: 코드 개선

### 브랜치 전략

```bash
# 새 기능 개발
git checkout -b feature/1-resistor-model

# 브랜치명 규칙 (TASK_BREAKDOWN.md의 태스크 번호 사용)
feature/태스크번호-간단설명    # 새 기능
bugfix/태스크번호-간단설명     # 버그 수정
docs/간단설명              # 문서 업데이트
refactor/간단설명          # 리팩토링
```

### 커밋 메시지

```bash
# 형식: type: description

feat: add resistor component model
fix: resolve matrix solver convergence issue
docs: update API documentation
test: add unit tests for DC analysis
refactor: extract matrix utilities
style: format code with prettier
chore: update dependencies
```

## 🧪 테스트 전략

### 테스트 피라미드

```
    /  E2E  \     ← 소수 (핵심 사용자 플로우)
   /---------\
  /Integration\   ← 적당 (컴포넌트 간 상호작용)
 /-------------\
/   Unit Tests  \ ← 다수 (개별 함수/클래스)
```

### 단위 테스트 (70%)

**범위**: 개별 함수, 클래스, 유틸리티

#### 수치해석 엔진 (100% 커버리지 목표)

```typescript
// 복잡한 도메인 로직: GWT 패턴 사용
describe('Matrix Operations', () => {
  describe('LU Decomposition', () => {
    it('should decompose well-conditioned matrix correctly', () => {
      // Given: 잘 조건화된 3x3 행렬이 주어졌을 때
      const A = new Matrix([
        [2, 1, 1],
        [4, 3, 3],
        [8, 7, 9],
      ]);

      // When: LU 분해를 수행하면
      const { L, U } = luDecomposition(A);

      // Then: 원래 행렬을 정확히 재구성할 수 있다
      const reconstructed = L.multiply(U);
      expect(reconstructed.isEqual(A, 1e-10)).toBe(true);
    });

    it('should handle singular matrix', () => {
      // Given: 특이 행렬(determinant = 0)
      const singular = new Matrix([
        [1, 2, 3],
        [2, 4, 6],
        [3, 6, 9],
      ]);

      // When & Then: LU 분해 시 에러가 발생해야 함
      expect(() => luDecomposition(singular)).toThrow('Matrix is singular');
    });
  });
});

// 간단한 유틸리티: AAA 패턴 사용
describe('Utility Functions', () => {
  describe('formatVoltage', () => {
    it('should format voltage with proper units', () => {
      // Arrange
      const voltage = 0.001234;

      // Act
      const formatted = formatVoltage(voltage);

      // Assert
      expect(formatted).toBe('1.23mV');
    });
  });
});

// 컴포넌트 모델 테스트
describe('Resistor Model', () => {
  it('should follow Ohms law', () => {
    const resistor = new Resistor('R1', [1, 2], 1000);
    expect(resistor.getVoltage(0.001)).toBeCloseTo(1, 10);
  });

  it('should handle zero resistance', () => {
    expect(() => new Resistor('R1', [1, 2], 0)).toThrow('Invalid resistance');
  });
});

// SPICE 분석 테스트
describe('DC Analysis', () => {
  it('should solve voltage divider correctly', () => {
    const circuit = new Circuit([
      new VoltageSource('V1', [1, 0], 12),
      new Resistor('R1', [1, 2], 1000),
      new Resistor('R2', [2, 0], 2000),
    ]);

    const result = dcAnalysis(circuit);
    expect(result.nodeVoltages.get(2)).toBeCloseTo(8, 8); // 정밀도 중요
  });
});
```

#### 파서/유틸리티

```typescript
describe('SPICE Parser', () => {
  it('should parse SPICE netlist correctly', () => {
    const netlist = `
      V1 1 0 12V
      R1 1 2 1k
      R2 2 0 2k
    `;

    const circuit = parseSpiceNetlist(netlist);
    expect(circuit.components).toHaveLength(3);
    expect(circuit.getComponent('V1').value).toBe(12);
  });
});
```

### 통합 테스트 (20%)

**범위**: 컴포넌트 간 상호작용, API 호출

#### 시뮬레이션 엔진 통합

```typescript
describe('Simulation Engine Integration', () => {
  it('should perform complete DC analysis workflow', () => {
    // Given: JSON 회로 입력
    const circuitJson = {
      components: [
        { id: 'V1', type: 'voltage', nodes: [1, 0], value: 5 },
        { id: 'R1', type: 'resistor', nodes: [1, 2], value: 1000 },
      ],
    };

    // When: 전체 분석 파이프라인 실행
    const circuit = parseCircuitJson(circuitJson);
    const analysis = new DCAnalysis(circuit);
    const result = analysis.solve();

    // Then: 예상 결과 검증
    expect(result.converged).toBe(true);
    expect(result.nodeVoltages.get(1)).toBeCloseTo(5, 8);
  });
});
```

#### Redux 상태 관리 통합

```typescript
describe('Circuit State Management', () => {
  it('should update simulation results when circuit changes', async () => {
    const store = createTestStore();

    // 컴포넌트 추가
    store.dispatch(
      addComponent({
        id: 'R1',
        type: 'resistor',
        nodes: [1, 2],
        value: 1000,
      })
    );

    // 시뮬레이션 실행
    await store.dispatch(runDCAnalysis());

    const state = store.getState();
    expect(state.simulation.status).toBe('completed');
    expect(state.simulation.results).toBeDefined();
  });
});
```

### UI 컴포넌트 테스트 (15%)

**범위**: React 컴포넌트 렌더링, 사용자 상호작용

```typescript
describe('Circuit Canvas Component', () => {
  it('should render canvas with correct dimensions', () => {
    render(<CircuitCanvas width={800} height={600} />);

    const canvas = screen.getByRole('canvas');
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '600');
  });

  it('should place component on canvas click', async () => {
    const onComponentAdd = vi.fn();
    render(<CircuitCanvas onComponentAdd={onComponentAdd} />);

    const canvas = screen.getByRole('canvas');
    await userEvent.click(canvas, { clientX: 100, clientY: 200 });

    expect(onComponentAdd).toHaveBeenCalledWith({
      position: { x: 100, y: 200 },
      type: 'resistor' // 기본 선택된 도구
    });
  });

  it('should update when Redux state changes', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <CircuitCanvas />
      </Provider>
    );

    // Redux 상태 변경
    act(() => {
      store.dispatch(addComponent({ id: 'R1', type: 'resistor' }));
    });

    expect(screen.getByText('R1')).toBeInTheDocument();
  });
});
```

### E2E 테스트 (5%)

**범위**: 완전한 사용자 워크플로

```typescript
// Playwright 또는 Cypress 사용
describe('End-to-End User Flows', () => {
  it('should create and simulate complete circuit', async ({ page }) => {
    await page.goto('/');

    // 1. 컴포넌트 팔레트에서 저항 선택
    await page.click('[data-testid="resistor-tool"]');

    // 2. 캔버스에 저항 배치
    await page.click('[data-testid="circuit-canvas"]', {
      position: { x: 100, y: 100 },
    });

    // 3. 전압원 추가
    await page.click('[data-testid="voltage-source-tool"]');
    await page.click('[data-testid="circuit-canvas"]', {
      position: { x: 200, y: 100 },
    });

    // 4. 연결선 그리기
    await page.click('[data-testid="wire-tool"]');
    await page.click('[data-testid="resistor-pin-1"]');
    await page.click('[data-testid="voltage-pin-1"]');

    // 5. 시뮬레이션 실행
    await page.click('[data-testid="run-simulation"]');

    // 6. 결과 확인
    await expect(page.locator('[data-testid="node-voltage"]')).toContainText(
      '5.00V'
    );
    await expect(
      page.locator('[data-testid="simulation-graph"]')
    ).toBeVisible();
  });
});
```

### 성능 테스트

```typescript
describe('Performance Tests', () => {
  it('should solve 100 node circuit within 1 second', async () => {
    const largeCircuit = generateTestCircuit(100); // 100 노드 회로 생성

    const startTime = performance.now();
    const result = await dcAnalysis(largeCircuit);
    const endTime = performance.now();

    expect(result.converged).toBe(true);
    expect(endTime - startTime).toBeLessThan(1000); // 1초 이내
  });

  it('should maintain accuracy with large matrices', () => {
    const circuit = generateTestCircuit(500);
    const result = dcAnalysis(circuit);

    // 참조 해답과 비교 (정확도 검증)
    expect(result.accuracy).toBeGreaterThan(1e-9);
  });
});
```

### 테스트 유틸리티

```typescript
// 테스트 헬퍼 함수들
export function createTestCircuit(nodeCount: number): Circuit {
  const components: Component[] = [];

  // 전압원 추가
  components.push(new VoltageSource('V1', [1, 0], 5));

  // 저항 체인 생성
  for (let i = 1; i < nodeCount; i++) {
    components.push(new Resistor(`R${i}`, [i, i + 1], 1000));
  }

  return new Circuit(components);
}

export function createTestStore(initialState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: initialState,
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({ serializableCheck: false }),
  });
}

// 수치 비교 매처 확장
expect.extend({
  toBeCloseToArray(received: number[], expected: number[], precision = 5) {
    const pass = received.every(
      (val, i) => Math.abs(val - expected[i]) < Math.pow(10, -precision)
    );

    return {
      pass,
      message: () => `Expected arrays to be close within ${precision} digits`,
    };
  },
});
```

### 테스트 실행 전략

```bash
# 개발 중 (TDD)
npm run test:watch           # 변경된 파일만 자동 테스트
npm run test:watch --ui      # 브라우저에서 시각적 테스트

# 커밋 전 (로컬)
npm run test                 # 모든 단위/통합 테스트
npm run test:coverage        # 커버리지 리포트

# CI/CD 파이프라인
npm run test:ci              # CI 환경 최적화
npm run test:e2e             # E2E 테스트 (시간 오래 걸림)
```

### 커버리지 목표

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        // 핵심 엔진은 더 높은 기준
        'src/engine/': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
```

## 🎨 코딩 스타일

### TypeScript 규칙

```typescript
// ✅ 좋은 예시
interface ComponentModel {
  readonly id: string;
  readonly type: ComponentType;
  readonly nodes: readonly number[];
  getImpedance(frequency: number): Complex;
}

class Resistor implements ComponentModel {
  constructor(
    public readonly id: string,
    public readonly nodes: readonly number[],
    private readonly resistance: number
  ) {}

  getImpedance(_frequency: number): Complex {
    return new Complex(this.resistance, 0);
  }
}

// ❌ 피해야 할 예시
class BadResistor {
  public id: any; // any 타입 사용 금지
  public nodes: number[]; // mutable 배열

  getImpedance(freq) {
    // 타입 명시 누락
    return this.resistance; // 잘못된 반환 타입
  }
}
```

### React 컴포넌트

```tsx
// ✅ 좋은 예시 - Headless UI + TailwindCSS 조합
import { Button, Dialog } from '@headlessui/react';
import { useState, useCallback } from 'react';

interface CircuitCanvasProps {
  readonly width: number;
  readonly height: number;
  readonly onComponentAdd?: (component: ComponentModel) => void;
}

export default function CircuitCanvas({
  width,
  height,
  onComponentAdd,
}: CircuitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<Tool>('select');

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const component = createComponent(selectedTool, { x, y });
      onComponentAdd?.(component);
    },
    [selectedTool, onComponentAdd]
  );

  return (
    <div className='flex flex-col gap-4'>
      {/* Headless UI 버튼들 */}
      <div className='flex gap-2'>
        <Button
          onClick={() => setSelectedTool('resistor')}
          className={`rounded-md px-4 py-2 font-medium transition-colors ${
            selectedTool === 'resistor'
              ? 'bg-component-resistor text-white'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100'
          }`}
        >
          저항
        </Button>
      </div>

      {/* 회로 캔버스 */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        className='circuit-canvas cursor-crosshair'
        data-testid='circuit-canvas'
      />
    </div>
  );
}

CircuitCanvas.displayName = 'CircuitCanvas';

// ❌ 피해야 할 예시
function BadComponent() {
  return (
    <div>
      {/* 직접 만든 컴포넌트 클래스 사용 금지 */}
      <button className='btn btn-primary'>버튼</button>
      {/* Headless UI 없이 접근성 무시 */}
      <div onClick={handleClick} className='cursor-pointer'>
        접근성 없는 가짜 버튼
      </div>
      {/* any 타입 사용 */}
      const badData: any = getData();
    </div>
  );
}
```

### TailwindCSS + Headless UI 사용법

```tsx
// ✅ 좋은 예시 - Headless UI + Tailwind 유틸리티 조합
import { Button, Dialog, DialogPanel, DialogTitle } from '@headlessui/react'

<div className="flex h-screen bg-gray-50">
  <aside className="w-80 bg-white border-r border-gray-200 component-palette">
    <h2 className="text-lg font-semibold text-gray-900 p-4">Components</h2>

    <Button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 transition-colors">
      Add Resistor
    </Button>
  </aside>

  <main className="flex-1 flex flex-col">
    <div className="flex-1 circuit-canvas bg-gray-50" />
    <div className="h-64 bg-white border-t border-gray-200 graph-container" />
  </main>
</div>

// WebSpice 특화 컬러 활용
<div className="flex gap-2">
  <span className="text-resistor bg-resistor/10 px-2 py-1 rounded-md">R1</span>
  <span className="text-capacitor bg-capacitor/10 px-2 py-1 rounded-md">C1</span>
  <span className="text-inductor bg-inductor/10 px-2 py-1 rounded-md">L1</span>
</div>

// ❌ 피해야 할 예시 - 커스텀 컴포넌트 클래스 사용
<div className="btn btn-primary">버튼</div>  // Headless UI Button 사용할 것
<div className="card">카드</div>            // div + Tailwind 클래스 사용할 것
<input className="input" />                // Headless UI Field 사용할 것
```

## 🚀 성능 최적화

### React Compiler 활용

```typescript
// React Compiler가 자동으로 최적화하므로
// 수동 memo 사용 최소화

// ✅ React Compiler가 처리
function ExpensiveComponent({ data }: Props) {
  const processedData = expensiveCalculation(data);

  return <div>{processedData}</div>;
}

// ⚠️ 정말 필요한 경우만 수동 최적화
const veryHeavyComputation = useMemo(() => {
  return solveComplexMatrix(largeMatrix);
}, [largeMatrix]);
```

### 시뮬레이션 엔진 최적화

```typescript
// ✅ 희소 행렬 활용
class SparseMatrix {
  private entries = new Map<string, number>();

  set(row: number, col: number, value: number): void {
    if (Math.abs(value) < 1e-12) {
      this.entries.delete(`${row},${col}`);
    } else {
      this.entries.set(`${row},${col}`, value);
    }
  }
}

// ✅ 수치 안정성 고려
function solveLinearSystem(A: Matrix, b: Vector): Vector {
  // 피벗팅으로 수치 안정성 확보
  const { L, U, P } = luDecompositionWithPivoting(A);
  return backSubstitution(U, forwardSubstitution(L, multiplyVector(P, b)));
}
```

## 🐛 디버깅

### 시뮬레이션 디버깅

```typescript
// 디버깅용 로깅 (개발 환경에서만)
function debugMatrix(matrix: Matrix, label: string): void {
  if (process.env.NODE_ENV === 'development') {
    console.group(`Matrix Debug: ${label}`);
    console.table(matrix.toArray());
    console.log('Condition Number:', matrix.conditionNumber());
    console.groupEnd();
  }
}

// 수렴 상태 모니터링
function newtonRaphsonSolver(
  initialGuess: Vector,
  tolerance = 1e-9
): { solution: Vector; iterations: number; converged: boolean } {
  let current = initialGuess.copy();
  let iterations = 0;
  const maxIterations = 50;

  while (iterations < maxIterations) {
    const residual = evaluateResidual(current);

    if (__DEV__) {
      console.log(`Iteration ${iterations}: residual = ${residual.norm()}`);
    }

    if (residual.norm() < tolerance) {
      return { solution: current, iterations, converged: true };
    }

    // Newton step
    const jacobian = evaluateJacobian(current);
    const delta = jacobian.solve(residual);
    current = current.subtract(delta);

    iterations++;
  }

  return { solution: current, iterations, converged: false };
}
```

### React DevTools 활용

```typescript
// 컴포넌트 디스플레이 네임 설정
CircuitCanvas.displayName = 'CircuitCanvas';
ComponentPalette.displayName = 'ComponentPalette';

// Props 디버깅을 위한 타입 export
export type { CircuitCanvasProps, ComponentPaletteProps };
```

## 🔧 유용한 개발 명령어

```bash
# 개발
npm run dev              # 개발 서버 시작
npm run test:watch       # TDD 모드
npm run type-check:watch # 실시간 타입 체크

# 품질 검사
npm run ci:quick         # 빠른 검증 (빌드 제외)
npm run ci               # 전체 CI 파이프라인

# 정리
npm run clean            # 빌드 결과물 삭제
npm run clean:install    # 완전 재설치

# 분석
npm run test:coverage    # 테스트 커버리지
npm run build -- --analyze # 번들 분석
```

## 🏛 설계 결정 (Architecture Decision Records)

프로젝트의 주요 설계 결정은 `docs/adr/`에 ADR 문서로 관리한다.

| ADR                                                 | 제목                             | 상태 |
| --------------------------------------------------- | -------------------------------- | ---- |
| [ADR-001](adr/ADR-001-runtime-type-guard-policy.md) | 런타임 타입 가드 최소화 정책     | 확정 |
| [ADR-002](adr/ADR-002-error-code-design.md)         | 에러 코드 설계 원칙 및 코드 체계 | 확정 |

## 📚 추가 자료

- [React 19 공식 문서](https://react.dev/)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Vitest 가이드](https://vitest.dev/guide/)
- [TailwindCSS 문서](https://tailwindcss.com/docs)
- [SPICE 알고리즘 참고](https://en.wikipedia.org/wiki/SPICE)

---

**질문이나 개선 제안이 있다면 Issue를 생성해주세요!**
