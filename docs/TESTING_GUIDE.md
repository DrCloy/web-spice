# WebSpice 테스팅 가이드

WebSpice 프로젝트에서 커스텀 테스트 인프라를 사용하여 테스트를 작성하는 완전한 가이드입니다.

## 목차

1. [개요](#개요)
2. [빠른 시작](#빠른-시작)
3. [커스텀 매처](#커스텀-매처)
4. [팩토리 함수](#팩토리-함수)
5. [픽스처](#픽스처)
6. [TDD 워크플로우](#tdd-워크플로우)
7. [성능 테스트](#성능-테스트)
8. [FAQ](#faq)

---

## 개요

WebSpice는 회로 시뮬레이션 테스트를 위해 특별히 설계된 커스텀 매처, 팩토리 함수, 픽스처를 갖춘 Vitest 기반의 종합 테스팅 인프라를 사용합니다.

### 테스트 인프라 구성 요소

- **커스텀 매처**: 수치 및 회로 검증을 위한 도메인 특화 단언문
- **팩토리 함수**: 합리적인 기본값으로 테스트 컴포넌트와 회로 생성
- **픽스처**: 알려진 예상 결과를 가진 사전 검증된 회로
- **헬퍼 함수**: 수치 비교 및 회로 검증을 위한 유틸리티
- **성능 벤치마크**: 솔버 성능 및 확장성 테스트를 위한 회로

### 주요 기능

- ✅ 부동소수점 비교를 위한 수치 허용 오차 처리
- ✅ 선택적 매개변수를 가진 타입 안전 팩토리 함수
- ✅ 분석적으로 검증된 회로 픽스처
- ✅ 12개에서 1000개 이상의 노드를 가진 성능 벤치마크
- ✅ 검증 테스트를 위한 에러 케이스 픽스처

---

## 빠른 시작

### 5분 안에 첫 테스트 작성하기

1. **테스트 파일 생성** - 적절한 디렉토리에 생성:

```typescript
// tests/example.test.ts
import { describe, expect, it } from 'vitest';
import { createTestResistor } from './factories/components';

describe('나의 첫 테스트', () => {
  it('저항을 생성해야 함', () => {
    const resistor = createTestResistor({ resistance: 1000 });

    expect(resistor.type).toBe('resistor');
    expect(resistor.resistance).toBe(1000);
  });
});
```

2. **테스트 실행**:

```bash
npm run test:watch  # TDD 모드 (권장)
# 또는
npm run test        # 한 번 실행
```

3. **통과 확인!** ✅

### 커스텀 매처 사용하기

```typescript
import { describe, expect, it } from 'vitest';
import { createTestResistor } from './factories/components';

describe('저항 옴의 법칙', () => {
  it('옴의 법칙을 만족해야 함', () => {
    const resistor = createTestResistor({ resistance: 1000 });
    const voltage = 10; // 10V
    const current = 0.01; // 10mA

    // 커스텀 매처가 V = I × R을 확인
    expect(resistor).toSatisfyOhmsLaw(voltage, current);
  });
});
```

---

## 커스텀 매처

WebSpice는 회로 시뮬레이션 테스트를 위한 4개의 커스텀 매처를 제공합니다.

### 1. `toBeCloseToArray`

부동소수점 오차를 허용하여 숫자 배열을 비교합니다.

**시그니처:**

```typescript
expect(actual: number[]).toBeCloseToArray(
  expected: number[],
  tolerance?: number
)
```

**사용법:**

```typescript
import { NUMERICAL_TOLERANCE } from './setup';

it('노드 전압을 올바르게 계산해야 함', () => {
  const computed = [1.0001, 2.0002, 3.0001];
  const expected = [1.0, 2.0, 3.0];

  // 기본 허용 오차 사용 (1e-10)
  expect(computed).toBeCloseToArray(expected);

  // 또는 커스텀 허용 오차 지정
  expect(computed).toBeCloseToArray(
    expected,
    NUMERICAL_TOLERANCE.VOLTAGE_TOLERANCE
  );
});
```

**에러 메시지 예시:**

```
Expected arrays to be close within tolerance 1e-6
Failures:
  [1]: 2.001 (expected 2.0, diff: 0.001)
```

### 2. `toBeValidMatrix`

Matrix 구조와 속성을 검증합니다.

**시그니처:**

```typescript
expect(matrix: Matrix).toBeValidMatrix(options?: {
  square?: boolean;
  nonSingular?: boolean;
  symmetric?: boolean;
})
```

**사용법:**

```typescript
it('유효한 정방행렬을 생성해야 함', () => {
  const matrix: Matrix = {
    rows: 3,
    cols: 3,
    data: new Float64Array([1, 0, 0, 0, 2, 0, 0, 0, 3]),
  };

  expect(matrix).toBeValidMatrix({ square: true });
});

it('대칭 행렬을 검증해야 함', () => {
  const symmetricMatrix: Matrix = {
    rows: 2,
    cols: 2,
    data: new Float64Array([4, 1, 1, 3]),
  };

  expect(symmetricMatrix).toBeValidMatrix({
    square: true,
    symmetric: true,
  });
});
```

**검증 항목:**

- 유효한 Matrix 구조 (rows, cols, Float64Array data)
- 데이터 길이가 차원과 일치 (rows × cols)
- 양수 차원
- NaN 또는 Infinity 값 없음
- 선택 사항: square, non-singular, symmetric 속성

### 3. `toSatisfyOhmsLaw`

저항이 옴의 법칙(V = I × R)을 만족하는지 검증합니다.

**시그니처:**

```typescript
expect(resistor: Resistor).toSatisfyOhmsLaw(
  voltage: number,
  current: number,
  tolerance?: number
)
```

**사용법:**

```typescript
it('1kΩ 저항에 대해 옴의 법칙을 만족해야 함', () => {
  const resistor = createTestResistor({ resistance: 1000 });

  // V = I × R → 10V = 0.01A × 1000Ω
  expect(resistor).toSatisfyOhmsLaw(10, 0.01);
});

it('허용 오차를 포함하여 옴의 법칙을 만족해야 함', () => {
  const resistor = createTestResistor({ resistance: 1000 });

  // 약간의 오차가 있는 측정값
  const measuredVoltage = 10.0001;
  const measuredCurrent = 0.01;

  expect(resistor).toSatisfyOhmsLaw(measuredVoltage, measuredCurrent, 1e-6);
});
```

**에러 메시지 예시:**

```
Expected component to satisfy Ohm's Law (V = I × R) within tolerance 1e-10
  Resistance: 1000Ω
  Given: V = 10.5V, I = 0.01A
  Expected: V = 10V (diff: 0.5V)
  Expected: I = 0.0105A (diff: 0.0005A)
```

### 4. `toConvergeWithin`

솔버가 지정된 제약 조건 내에서 수렴했는지 확인합니다.

**시그니처:**

```typescript
expect(result: { converged: boolean }).toConvergeWithin(options: {
  iterations: number;
  maxIterations: number;
  tolerance: number;
  error: number;
})
```

**사용법:**

```typescript
it('10번 반복 내에 수렴해야 함', () => {
  const result = solver.solve(circuit);

  expect(result).toConvergeWithin({
    iterations: result.iterations,
    maxIterations: 100,
    tolerance: 1e-6,
    error: result.error,
  });
});
```

**에러 메시지 예시:**

```
Convergence failed:
  - Final error (1.5e-5) exceeded tolerance (1e-6)
  Iterations: 45/100
  Error: 1.5e-5 (tolerance: 1e-6)
```

---

## 팩토리 함수

팩토리 함수는 합리적인 기본값으로 테스트 객체를 생성하여, 테스트에 중요한 부분만 지정할 수 있게 합니다.

### 컴포넌트 팩토리

[tests/factories/components.ts](../tests/factories/components.ts)에 위치합니다.

#### `createTestResistor`

```typescript
const resistor = createTestResistor({
  id: 'R1', // 기본값: 'R1'
  name: 'Load', // 기본값: 'Test Resistor'
  resistance: 2200, // 기본값: 1000
  nodes: ['3', '0'], // 기본값: ['1', '0']
});
```

#### `createTestVoltageSource`

```typescript
const voltageSource = createTestVoltageSource({
  id: 'V1', // 기본값: 'V1'
  voltage: 12, // 기본값: 12
  nodes: ['1', '0'], // 기본값: ['1', '0']
});
```

#### `createTestCurrentSource`

```typescript
const currentSource = createTestCurrentSource({
  id: 'I1', // 기본값: 'I1'
  current: 0.001, // 기본값: 0.001 (1mA)
  nodes: ['1', '0'], // 기본값: ['1', '0']
});
```

#### `createTestCapacitor`

```typescript
const capacitor = createTestCapacitor({
  id: 'C1', // 기본값: 'C1'
  capacitance: 100e-6, // 기본값: 1e-6 (1µF)
  nodes: ['2', '0'], // 기본값: ['1', '0']
});
```

#### `createTestInductor`

```typescript
const inductor = createTestInductor({
  id: 'L1', // 기본값: 'L1'
  inductance: 10e-3, // 기본값: 1e-3 (1mH)
  nodes: ['3', '4'], // 기본값: ['1', '0']
});
```

#### `createTestGround`

```typescript
const ground = createTestGround({
  id: 'GND', // 기본값: 'GND'
  nodeId: '0', // 기본값: '0'
});
```

### 회로 팩토리

[tests/factories/circuits.ts](../tests/factories/circuits.ts)에 위치합니다.

#### `createVoltageDivider`

전압 분배 회로를 생성합니다: `V1 -- R1 -- R2 -- GND`

```typescript
const circuit = createVoltageDivider({
  inputVoltage: 12, // 기본값: 12
  r1: 1000, // 기본값: 1000
  r2: 2000, // 기본값: 2000
});

// 출력 전압: Vout = Vin × (R2 / (R1 + R2))
// 12V × (2000 / 3000) = 8V
```

#### `createSeriesResistors`

직렬 저항 체인을 생성합니다.

```typescript
const circuit = createSeriesResistors({
  voltage: 12,
  resistances: [1000, 2000, 3000], // 3개의 직렬 저항
});

// 총 저항: 6000Ω
// 전류: 12V / 6000Ω = 2mA
```

#### `createParallelResistors`

같은 두 노드를 공유하는 병렬 저항을 생성합니다.

```typescript
const circuit = createParallelResistors({
  voltage: 12,
  resistances: [1000, 2000, 3000], // 3개의 병렬 저항
});

// 등가 저항: 1 / (1/1000 + 1/2000 + 1/3000) ≈ 545.45Ω
```

### 매트릭스 팩토리

[tests/factories/matrix.ts](../tests/factories/matrix.ts)에 위치합니다.

#### `createMatrix`

```typescript
const matrix = createMatrix(3, 3, [1, 0, 0, 0, 2, 0, 0, 0, 3]);
```

#### `createIdentityMatrix`

```typescript
const identity = createIdentityMatrix(3);
// [[1, 0, 0],
//  [0, 1, 0],
//  [0, 0, 1]]
```

#### `createZeroMatrix`

```typescript
const zeros = createZeroMatrix(2, 3);
// [[0, 0, 0],
//  [0, 0, 0]]
```

#### `createVector`

```typescript
const vector = createVector([1, 2, 3]);
```

---

## 픽스처

픽스처는 알려진 예상 결과를 가진 사전 검증된 회로를 제공합니다. 수동 계산 없이 솔버, 분석기, 시각화를 테스트하는 데 사용합니다.

### 회로 픽스처

[tests/fixtures/circuits.ts](../tests/fixtures/circuits.ts)에 위치합니다.

모든 픽스처는 다음 인터페이스를 따릅니다:

```typescript
interface CircuitFixture {
  circuit: Circuit;
  expectedResults: {
    nodeVoltages: Record<NodeId, number>;
    branchCurrents: Record<ComponentId, number>;
    componentPowers: Record<ComponentId, number>;
  };
  description: string;
  tolerance?: number;
}
```

#### 사용 가능한 픽스처

1. **`VOLTAGE_DIVIDER_12V`** - 간단한 1:2 전압 분배 회로
2. **`SIMPLE_SERIES_5V`** - 직렬로 연결된 3개의 저항
3. **`PARALLEL_RESISTORS_10V`** - 병렬로 연결된 3개의 저항
4. **`MIXED_SERIES_PARALLEL`** - 직렬과 병렬 혼합 구성
5. **`CURRENT_SOURCE_CIRCUIT`** - 전류원이 있는 회로
6. **`WHEATSTONE_BRIDGE_BALANCED`** - 평형 휘트스톤 브리지

#### 예제: 픽스처 사용하기

```typescript
import { describe, expect, it } from 'vitest';
import { VOLTAGE_DIVIDER_12V } from './fixtures/circuits';

describe('DC 솔버', () => {
  it('전압 분배 회로를 올바르게 해결해야 함', () => {
    const { circuit, expectedResults } = VOLTAGE_DIVIDER_12V;

    const result = dcSolver.solve(circuit);

    // 노드 전압 확인
    expect(result.nodeVoltages['0']).toBeCloseTo(0); // Ground
    expect(result.nodeVoltages['1']).toBeCloseTo(12); // V+
    expect(result.nodeVoltages['2']).toBeCloseTo(8); // Output

    // 또는 배열 매처 사용
    const voltages = [
      result.nodeVoltages['0'],
      result.nodeVoltages['1'],
      result.nodeVoltages['2'],
    ];
    expect(voltages).toBeCloseToArray([0, 12, 8]);
  });
});
```

### 에러 케이스 픽스처

[tests/fixtures/error-cases.ts](../tests/fixtures/error-cases.ts)에 위치합니다.

사전 정의된 잘못된 회로로 에러 처리 및 검증을 테스트합니다:

```typescript
import { describe, expect, it } from 'vitest';
import { FLOATING_NODE_ERROR, NO_GROUND_ERROR } from './fixtures/error-cases';

describe('회로 검증', () => {
  it('플로팅 노드를 감지해야 함', () => {
    const { circuit, expectedErrorCode } = FLOATING_NODE_ERROR;

    const result = validateCircuit(circuit);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Circuit contains floating nodes');
  });

  it('그라운드 누락을 감지해야 함', () => {
    const { circuit } = NO_GROUND_ERROR;

    expect(() => {
      solver.solve(circuit);
    }).toThrow('Circuit must have a ground node');
  });
});
```

**사용 가능한 에러 케이스:**

- `FLOATING_NODE_ERROR` - 연결되지 않은 컴포넌트
- `NO_GROUND_ERROR` - 그라운드 참조 누락
- `ZERO_RESISTANCE_ERROR` - 저항값이 0인 컴포넌트
- `NEGATIVE_RESISTANCE_ERROR` - 음수 저항
- `SINGULAR_MATRIX_ERROR` - 병렬로 연결된 두 전압원
- `EMPTY_CIRCUIT_ERROR` - 컴포넌트 없음
- `DUPLICATE_COMPONENT_ID_ERROR` - 중복된 ID

### 성능 벤치마크

[tests/fixtures/performance.ts](../tests/fixtures/performance.ts)에 위치합니다.

다양한 복잡도의 회로로 솔버 확장성을 테스트합니다:

```typescript
import { describe, expect, it } from 'vitest';
import {
  SMALL_CIRCUIT_10_NODES,
  MEDIUM_CIRCUIT_100_NODES,
} from './fixtures/performance';
import { benchmark } from './utils/helpers';

describe('솔버 성능', () => {
  it('작은 회로를 빠르게 해결해야 함', () => {
    const { circuit } = SMALL_CIRCUIT_10_NODES;

    const stats = benchmark(() => {
      solver.solve(circuit);
    }, 100);

    // 10 노드 회로는 평균 1ms 미만이어야 함
    expect(stats.average).toBeLessThan(1);
  });

  it('100 노드로 확장해야 함', () => {
    const { circuit, expectedComplexity } = MEDIUM_CIRCUIT_100_NODES;

    const stats = benchmark(() => {
      solver.solve(circuit);
    }, 10);

    console.log(`100 노드 회로: ${stats.average.toFixed(2)}ms`);
    expect(expectedComplexity).toBe('O(n^2)');
  });
});
```

**사용 가능한 벤치마크:**

- `SMALL_CIRCUIT_10_NODES` - 12 노드, O(n) 예상
- `MEDIUM_CIRCUIT_100_NODES` - 102 노드, O(n²) 예상
- `LARGE_CIRCUIT_1000_NODES` - 1002 노드, O(n³) 예상
- `DENSE_MATRIX_CIRCUIT` - 100개 병렬 저항, 밀집 행렬
- `SPARSE_CIRCUIT_50_NODES` - 51 노드, 희소 래더 네트워크
- `ILL_CONDITIONED_CIRCUIT` - 저항값이 6자릿수 범위에 걸침
- `WELL_CONDITIONED_CIRCUIT` - 모두 유사한 저항값 (비교 기준선)
- `MESH_NETWORK_5X5` - 2D 저항 메시, 25 노드

---

## TDD 워크플로우

WebSpice의 테스트 인프라를 사용한 테스트 주도 개발(TDD) 워크플로우입니다.

### Red-Green-Refactor 사이클

```
Red → Green → Refactor
 ↑                ↓
 ←----------------
```

1. **Red**: 실패하는 테스트 작성
2. **Green**: 통과하는 최소한의 코드 작성
3. **Refactor**: 테스트를 깨지 않고 코드 개선
4. **Repeat**: 다음 기능

### 예제: DC 솔버 구현하기

TDD를 사용하여 DC 솔버를 구현해봅시다.

#### 단계 1: Red - 실패하는 테스트 작성

```typescript
// tests/engine/solver/dc-solver.test.ts
import { describe, expect, it } from 'vitest';
import { VOLTAGE_DIVIDER_12V } from '../../fixtures/circuits';
import { DCSolver } from '../../../src/engine/solver/dc-solver';

describe('DC 솔버', () => {
  it('전압 분배 회로를 해결해야 함', () => {
    const { circuit, expectedResults } = VOLTAGE_DIVIDER_12V;
    const solver = new DCSolver();

    const result = solver.solve(circuit);

    // 노드 전압 확인
    const voltages = Object.values(result.nodeVoltages);
    const expected = Object.values(expectedResults.nodeVoltages);

    expect(voltages).toBeCloseToArray(expected);
  });
});
```

**테스트 실행** (실패할 것입니다):

```bash
npm run test:watch
```

```
FAIL tests/engine/solver/dc-solver.test.ts
  × should solve voltage divider
    Error: Cannot find module 'src/engine/solver/dc-solver'
```

#### 단계 2: Green - 최소 구현

솔버 파일 생성:

```typescript
// src/engine/solver/dc-solver.ts
import type { Circuit } from '../../types/circuit';

export interface SolverResult {
  nodeVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  converged: boolean;
}

export class DCSolver {
  solve(circuit: Circuit): SolverResult {
    // 최소 구현 - 전압 분배 회로에 대해 하드코딩
    return {
      nodeVoltages: { '0': 0, '1': 12, '2': 8 },
      branchCurrents: {},
      converged: true,
    };
  }
}
```

**테스트 통과!** ✅

#### 단계 3: Red 다시 - 케이스 추가

```typescript
it('직렬 저항을 해결해야 함', () => {
  const { circuit, expectedResults } = SIMPLE_SERIES_5V;
  const solver = new DCSolver();

  const result = solver.solve(circuit);

  const voltages = Object.values(result.nodeVoltages);
  const expected = Object.values(expectedResults.nodeVoltages);

  expect(voltages).toBeCloseToArray(expected);
});
```

**테스트 실패** (하드코딩된 값이 작동하지 않음) ❌

#### 단계 4: Green - 실제 구현

```typescript
export class DCSolver {
  solve(circuit: Circuit): SolverResult {
    // MNA (Modified Nodal Analysis) 행렬 구축
    const mna = this.buildMNAMatrix(circuit);

    // Ax = b 해결
    const solution = this.solveLinearSystem(mna.A, mna.b);

    // 노드 전압 추출
    const nodeVoltages = this.extractNodeVoltages(circuit, solution);

    return {
      nodeVoltages,
      branchCurrents: {},
      converged: true,
    };
  }

  private buildMNAMatrix(circuit: Circuit) {
    // 실제 MNA 구현
    // ...
  }

  private solveLinearSystem(A: Matrix, b: Vector): Vector {
    // LU 분해 솔버
    // ...
  }

  private extractNodeVoltages(circuit: Circuit, solution: Vector) {
    // 솔루션 벡터를 노드 ID에 매핑
    // ...
  }
}
```

**테스트 통과!** ✅

#### 단계 5: Refactor - 코드 품질 개선

```typescript
export class DCSolver {
  private readonly tolerance = 1e-10;

  solve(circuit: Circuit): SolverResult {
    this.validateCircuit(circuit);

    const mna = MNABuilder.build(circuit);
    const solution = LinearSolver.solve(mna.A, mna.b, this.tolerance);

    return {
      nodeVoltages: this.extractNodeVoltages(circuit, solution),
      branchCurrents: this.extractBranchCurrents(circuit, solution),
      converged: true,
    };
  }

  private validateCircuit(circuit: Circuit): void {
    if (!hasGroundNode(circuit)) {
      throw new Error('Circuit must have a ground node');
    }
  }

  // ...
}
```

**테스트 여전히 통과!** ✅ (리팩토링이 아무것도 망가뜨리지 않음)

### TDD 모범 사례

1. **테스트를 먼저 작성** - 구현 전에 API 설계
2. **테스트를 빠르게 유지** - 팩토리와 픽스처 사용
3. **테스트당 하나의 단언 개념** - 명확한 실패 메시지
4. **설명적인 테스트 이름 사용** - `전압 분배 회로를 해결해야 함`, `test1` 안 됨
5. **자신감을 가지고 리팩토링** - 테스트가 회귀를 잡아냄

### Watch 모드 팁

```bash
npm run test:watch
```

Watch 모드에서:

- 파일 변경 시 테스트가 자동으로 재실행됨
- `f`로 실패한 테스트만 실행
- `t`로 테스트 이름 패턴으로 필터링
- `p`로 파일 이름 패턴으로 필터링
- `a`로 모든 테스트 실행

---

## 성능 테스트

### `benchmark` 헬퍼 사용하기

[tests/utils/helpers.ts](../tests/utils/helpers.ts)에 위치합니다.

```typescript
import { benchmark } from './utils/helpers';

it('100 노드 회로를 효율적으로 해결해야 함', () => {
  const { circuit } = MEDIUM_CIRCUIT_100_NODES;

  const stats = benchmark(() => {
    solver.solve(circuit);
  }, 100); // 100회 반복

  console.log(`평균: ${stats.average.toFixed(2)}ms`);
  console.log(`최소: ${stats.min.toFixed(2)}ms`);
  console.log(`최대: ${stats.max.toFixed(2)}ms`);

  // 합리적인 성능 기대
  expect(stats.average).toBeLessThan(10);
});
```

### 성능 테스트 예제

```typescript
import { describe, expect, it } from 'vitest';
import { ALL_PERFORMANCE_BENCHMARKS } from './fixtures/performance';
import { benchmark } from './utils/helpers';
import { DCSolver } from '../src/engine/solver/dc-solver';

describe('솔버 확장성', () => {
  const solver = new DCSolver();

  it.each(ALL_PERFORMANCE_BENCHMARKS)(
    '$description를 효율적으로 해결해야 함',
    ({ circuit, nodeCount, expectedComplexity }) => {
      const stats = benchmark(() => {
        solver.solve(circuit);
      }, 10);

      console.log(
        `${nodeCount} 노드 (${expectedComplexity}): ${stats.average.toFixed(2)}ms`
      );

      // 복잡도에 따른 성능 기대치
      const maxTime = getMaxTimeForComplexity(nodeCount, expectedComplexity);
      expect(stats.average).toBeLessThan(maxTime);
    }
  );
});

function getMaxTimeForComplexity(n: number, complexity: string): number {
  switch (complexity) {
    case 'O(n)':
      return n * 0.1; // 노드당 0.1ms
    case 'O(n^2)':
      return (n * n) / 1000; // 더 관대함
    case 'O(n^3)':
      return (n * n * n) / 100000; // 매우 관대함
    default:
      return Infinity;
  }
}
```

### 실행 시간 측정하기

```typescript
import { measureExecutionTime } from './utils/helpers';

it('MNA 행렬을 빠르게 구축해야 함', () => {
  const { circuit } = MEDIUM_CIRCUIT_100_NODES;

  const { time, result } = measureExecutionTime(() => {
    return mnaBuilder.build(circuit);
  });

  console.log(`MNA 구축 시간: ${time.toFixed(2)}ms`);
  expect(result).toBeValidMatrix({ square: true });
  expect(time).toBeLessThan(5);
});
```

### 스트레스 테스트

전용 성능 테스트를 위해 스트레스 테스트 벤치마크를 사용합니다:

```typescript
import { STRESS_TEST_BENCHMARKS } from './fixtures/performance';

// CI 또는 특정 플래그가 있을 때만 실행
describe.skipIf(!process.env.RUN_STRESS_TESTS)('스트레스 테스트', () => {
  it.each(STRESS_TEST_BENCHMARKS)(
    '$description를 처리해야 함',
    ({ circuit, nodeCount }) => {
      const stats = benchmark(() => {
        solver.solve(circuit);
      }, 5); // 큰 회로는 반복 횟수 적게

      console.log(`${nodeCount} 노드: ${stats.average.toFixed(2)}ms`);

      // 충돌 없이 완료되는지 확인
      expect(stats.average).toBeLessThan(60000); // 최대 1분
    }
  );
});
```

---

## FAQ

### 일반 질문

**Q: 테스트 파일을 어디에 두어야 하나요?**

A: 다음 구조를 따릅니다:

- 컴포넌트 테스트: `tests/<module>/<file>.test.ts`
- 통합 테스트: `tests/integration/<feature>.test.ts`
- 유틸리티: `tests/utils/<helper>.ts`
- 팩토리: `tests/factories/<type>.ts`
- 픽스처: `tests/fixtures/<category>.ts`

**Q: 특정 테스트만 실행하려면?**

A: Vitest의 필터링 사용:

```bash
# 패턴에 일치하는 테스트 실행
npm run test -- matrix

# 특정 파일 실행
npm run test tests/engine/solver/dc-solver.test.ts

# Watch 모드에서 't'를 사용하여 이름으로 필터링
npm run test:watch
# 그런 다음 't'를 누르고 'voltage divider' 입력
```

**Q: `it`과 `test` 중 어느 것을 사용해야 하나요?**

A: 둘 다 별칭입니다. 가독성을 위해 `it`을 선호합니다:

```typescript
it('전압 분배 회로를 해결해야 함', () => {
  /* ... */
});
// 다음보다 읽기 좋음:
test('전압 분배 회로를 해결해야 함', () => {
  /* ... */
});
```

### 수치 테스트

**Q: 어떤 허용 오차를 사용해야 하나요?**

A: [tests/setup.ts](../tests/setup.ts)에서 적절한 허용 오차를 사용합니다:

```typescript
import { NUMERICAL_TOLERANCE } from './setup';

// 전압 비교 (밀리볼트 정확도)
expect(voltage).toBeCloseTo(expected, NUMERICAL_TOLERANCE.VOLTAGE_TOLERANCE);

// 전류 비교 (나노암페어 정확도)
expect(current).toBeCloseTo(expected, NUMERICAL_TOLERANCE.CURRENT_TOLERANCE);

// 고정밀 행렬 연산
expect(result).toBeCloseTo(expected, NUMERICAL_TOLERANCE.HIGH_PRECISION);
```

**Q: 테스트가 "0.30000000000000004 != 0.3"으로 실패합니다. 무엇이 문제인가요?**

A: 부동소수점 연산은 정확하지 않습니다. `toBeCloseTo` 또는 `toBeCloseToArray`를 사용하세요:

```typescript
// ❌ 나쁨 - 부동소수점 오차로 실패
expect(0.1 + 0.2).toBe(0.3);

// ✅ 좋음 - 허용 오차 사용
expect(0.1 + 0.2).toBeCloseTo(0.3);

// ✅ 또한 좋음 - 배열용
expect([0.1 + 0.2]).toBeCloseToArray([0.3]);
```

**Q: 예상 값은 얼마나 정확해야 하나요?**

A: 허용 오차에 맞춰 정밀도를 조정합니다:

```typescript
// 허용 오차 1e-6 → 소수점 6자리
expect(result).toBeCloseTo(1.234567, 1e-6);

// 허용 오차 1e-10 → 소수점 10자리
expect(result).toBeCloseTo(1.2345678901, 1e-10);
```

### 팩토리와 픽스처

**Q: 팩토리와 픽스처를 언제 사용해야 하나요?**

A:

- **팩토리**: 특정 시나리오를 위한 커스텀 테스트 데이터가 필요할 때
- **픽스처**: 검증을 위한 검증된 결과가 필요할 때

```typescript
// 커스텀 회로에는 팩토리 사용
const circuit = createVoltageDivider({
  inputVoltage: 3.3, // 테스트를 위한 커스텀 전압
  r1: 10000,
  r2: 10000,
});

// 예상 결과가 필요할 때 픽스처 사용
const { circuit, expectedResults } = VOLTAGE_DIVIDER_12V;
expect(solver.solve(circuit).nodeVoltages).toMatchObject(
  expectedResults.nodeVoltages
);
```

**Q: 팩토리로 생성된 객체를 수정할 수 있나요?**

A: 네! 팩토리는 수정 가능한 일반 객체를 반환합니다:

```typescript
const resistor = createTestResistor({ resistance: 1000 });
resistor.name = 'Modified Resistor';
resistor.resistance = 2000;
```

**Q: 일부 픽스처가 IIFE(즉시 실행 함수 표현식)를 사용하는 이유는?**

A: 고유한 회로 ID를 보장하기 위해서입니다:

```typescript
export const VOLTAGE_DIVIDER_12V: CircuitFixture = (() => {
  const circuit = createVoltageDivider({ inputVoltage: 12 });
  circuit.id = 'fixture-voltage-divider-12v'; // 고유 ID
  return { circuit, expectedResults, description };
})();
```

### 커스텀 매처

**Q: 커스텀 매처에 `.not`을 사용할 수 있나요?**

A: 네! 모든 커스텀 매처는 부정을 지원합니다:

```typescript
expect([1, 2, 3]).not.toBeCloseToArray([1, 2, 4]);

expect(matrix).not.toBeValidMatrix({ symmetric: true });
```

**Q: 나만의 커스텀 매처를 추가하려면?**

A:

1. [tests/utils/matchers.ts](../tests/utils/matchers.ts)에 매처 함수 생성
2. [tests/setup.ts](../tests/setup.ts)에 등록
3. 모듈 확장에서 타입 선언

```typescript
// tests/utils/matchers.ts
export function toBePositive(this: { isNot: boolean }, received: number) {
  const pass = received > 0;
  return {
    pass,
    message: () => `Expected ${received} to be positive`,
  };
}

// tests/setup.ts
import * as matchers from './utils/matchers';
expect.extend(matchers);

declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBePositive(): T;
  }
}
```

**Q: IDE에서 커스텀 매처 자동완성이 표시되지 않는 이유는?**

A: [tests/setup.ts](../tests/setup.ts)에 모듈 확장이 있는지 확인하고 IDE TypeScript 언어 서버가 실행 중인지 확인하세요. IDE를 재시작해보세요.

### 성능 테스트

**Q: 벤치마크에 몇 번의 반복을 사용해야 하나요?**

A:

- 작은 회로 (< 20 노드): 100-1000회 반복
- 중간 회로 (20-100 노드): 10-100회 반복
- 큰 회로 (> 100 노드): 5-10회 반복
- 스트레스 테스트 (> 1000 노드): 1-5회 반복

**Q: 성능 테스트가 불안정합니다. 어떻게 해야 하나요?**

A:

1. 안정적인 평균을 위해 더 많은 반복 사용
2. GC 중단 확인 (측정 전 워밍업 실행)
3. 절대 시간이 아닌 상대 임계값 사용

```typescript
// ❌ 나쁨 - 절대 시간 (불안정)
expect(stats.average).toBeLessThan(5);

// ✅ 좋음 - 상대 비교
const baselineStats = benchmark(() => solver.solve(smallCircuit));
const largeStats = benchmark(() => solver.solve(largeCircuit));

// 큰 회로는 최대 10배까지 느릴 수 있음
expect(largeStats.average).toBeLessThan(baselineStats.average * 10);
```

**Q: 성능 테스트를 일반 테스트 실행에 포함해야 하나요?**

A: 빠른 성능 테스트는 일반 실행에 유지하고, 스트레스 테스트는 `describe.skip` 또는 환경 플래그 사용:

```typescript
// 빠른 정상 확인 - 항상 실행
it('작은 회로를 빠르게 해결해야 함', () => {
  const stats = benchmark(() => solver.solve(SMALL_CIRCUIT));
  expect(stats.average).toBeLessThan(1);
});

// 스트레스 테스트 - CI에서만
describe.skipIf(!process.env.CI)('스트레스 테스트', () => {
  it('1000 노드 회로를 처리해야 함', () => {
    // ...
  });
});
```

### TDD 및 개발

**Q: TDD를 처음 사용한다면 어떻게 시작하나요?**

A:

1. Watch 모드 시작: `npm run test:watch`
2. 테스트 파일 생성: `tests/my-feature.test.ts`
3. 실패하는 테스트 하나 작성
4. 최소한의 코드로 통과시키기
5. 리팩토링
6. 반복

**Q: private 메서드를 테스트해야 하나요?**

A: 아니요. 공개 API만 테스트하세요. private 메서드가 테스트가 필요하면 별도 모듈로 만들 가치가 있을 수 있습니다:

```typescript
// ❌ 나쁨 - private 메서드 테스트
solver['buildMNAMatrix'](circuit);

// ✅ 좋음 - 공개 API를 통한 테스트
const result = solver.solve(circuit);
expect(result.nodeVoltages).toBeCloseToArray(expected);

// ✅ 또는 복잡하면 별도 모듈로 추출
import { buildMNAMatrix } from './mna-builder';
const mna = buildMNAMatrix(circuit);
expect(mna.A).toBeValidMatrix({ square: true });
```

**Q: 비동기 코드를 어떻게 테스트하나요?**

A: `async`/`await` 사용:

```typescript
it('파일에서 회로를 로드해야 함', async () => {
  const circuit = await loadCircuit('test.cir');
  expect(circuit.components).toHaveLength(3);
});

it('느린 솔버에서 타임아웃해야 함', async () => {
  await expect(solver.solveWithTimeout(circuit, 100)).rejects.toThrow(
    'Timeout'
  );
});
```

### 에러 처리

**Q: 코드가 에러를 던지는지 어떻게 테스트하나요?**

A:

```typescript
// 동기
expect(() => {
  solver.solve(invalidCircuit);
}).toThrow('Circuit must have a ground node');

// 비동기
await expect(solver.solveAsync(invalidCircuit)).rejects.toThrow(
  'Circuit must have a ground node'
);

// 에러 객체 포함
expect(() => {
  solver.solve(invalidCircuit);
}).toThrowError(ValidationError);
```

**Q: 에러 테스트에 픽스처를 사용해야 하나요?**

A: 네! 에러 케이스 픽스처를 사용하세요:

```typescript
import { NO_GROUND_ERROR } from './fixtures/error-cases';

it('그라운드 누락을 감지해야 함', () => {
  const { circuit, expectedErrorMessage } = NO_GROUND_ERROR;

  expect(() => {
    solver.solve(circuit);
  }).toThrow(expectedErrorMessage);
});
```

---

## 추가 리소스

- [Vitest 문서](https://vitest.dev/)
- [프로젝트 작업 분류](./TASK_BREAKDOWN.md)
- [커스텀 매처 소스](../tests/utils/matchers.ts)
- [팩토리 함수 소스](../tests/factories/)
- [픽스처 소스](../tests/fixtures/)

---

**즐거운 테스팅! 🧪**

이 가이드에서 다루지 않은 질문이 있다면 FAQ 섹션에 추가하거나 프로젝트 토론에 문의하세요.
