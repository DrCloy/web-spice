# WebSpice 컴포넌트 모델 구현 가이드

## 새 수동 소자 체크리스트

새 소자(캐패시터, 인덕터 등)를 추가할 때 수정/생성해야 하는 파일:

| 파일                                     | 작업                              |
| ---------------------------------------- | --------------------------------- |
| `src/types/component.ts`                 | 새 컴포넌트 타입 추가             |
| `src/engine/components/{name}.ts`        | 컴포넌트 모델 구현                |
| `src/engine/solver/mnaAssembler.ts`      | stamp 로직 통합                   |
| `src/engine/parser/circuitParser.ts`     | JSON 파싱 분기 추가               |
| `src/engine/circuit/index.ts`            | 컴포넌트 등록                     |
| `tests/engine/components/{name}.test.ts` | 단위 테스트                       |
| `tests/engine/integration/`              | 통합 테스트 (해당 소자 포함 회로) |

## 컴포넌트 구현 구조

```typescript
// src/engine/components/capacitor.ts 예시 구조
export class Capacitor {
  readonly id: string;
  readonly nodeP: number;
  readonly nodeN: number;
  readonly capacitance: number; // 파라드 단위

  constructor(id: string, nodeP: number, nodeN: number, capacitance: number) {
    if (capacitance <= 0) throw new Error('Capacitance must be positive');
    // ...
  }

  // DC 분석: 개방 회로 (무한 임피던스)
  stampDC(matrix: MNAMatrix): void {
    /* nothing for DC */
  }

  // AC 분석: 복소수 어드미턴스 Y = jωC
  stampAC(matrix: ComplexMNAMatrix, omega: number): void {
    const admittance = { real: 0, imag: omega * this.capacitance };
    // Y 행렬에 어드미턴스 추가 (노드 P, N 위치)
  }
}
```

## 인덕터 특이사항

인덕터는 DC 분석에서 단락 회로(wire)처럼 동작하지만, MNA에서 전압원과 동일하게 추가 변수(branch current)를 생성한다. `dcVoltageSource.ts` 구조를 참조하되, 전압 제약 대신 `V_L = 0` (DC에서 인덕터 전압 = 0) 조건을 적용한다.

## 테스트 케이스 패턴

```typescript
describe('Capacitor', () => {
  it('rejects non-positive capacitance', () => {
    expect(() => new Capacitor('C1', 1, 0, -1e-6)).toThrow();
    expect(() => new Capacitor('C1', 1, 0, 0)).toThrow();
  });

  it('stamps correctly in AC analysis', () => {
    // omega = 2π * 1kHz, C = 1μF → Y = j * 2π * 1000 * 1e-6
    const c = new Capacitor('C1', 1, 0, 1e-6);
    const matrix = createComplexMNAMatrix(2);
    c.stampAC(matrix, 2 * Math.PI * 1000);
    // 검증: 노드 1,1 위치의 허수 부분
  });

  it('acts as open circuit in DC analysis', () => {
    // DC stamp 후 행렬에 변화 없음
  });
});
```

## examples/ 파일 추가

새 소자 구현 완료 후 `examples/`에 해당 소자를 포함하는 예제 회로 JSON 추가 (RC 필터, RL 회로 등).
