# ADR-001: 런타임 타입 가드 최소화 정책

- 날짜: 2026-03-24
- 상태: 확정 (Accepted)

## Context

TypeScript strict 모드를 사용하는 프로젝트에서, 함수 파라미터에 대해 런타임 null/undefined 체크를 어느 수준까지 추가할 것인지 결정이 필요했다.

초기 구현에서는 타입으로 선언된 파라미터에도 방어적으로 null 체크를 추가한 경우가 있었다:

```typescript
function analyzeDC(circuit: Circuit): DCResult {
  if (!circuit) throw new WebSpiceError('INVALID_INPUT', 'circuit is null');
  // ...
}
```

이 패턴이 반복되면서 두 가지 문제가 생겼다:

1. **타입 계약과 중복**: TypeScript 컴파일러가 이미 `null` 전달을 차단하는데, 런타임에서 다시 검사하는 것은 중복이다.
2. **테스트 범위 불일치**: 이 가드를 테스트하려면 `as unknown as null`처럼 타입을 강제로 우회해야 하는데, 이는 TypeScript를 사용하는 의미를 스스로 부정하는 것이다.

## Decision

**TypeScript 타입으로 선언된 함수 파라미터에 대해 런타임 타입 가드를 추가하지 않는다.**

- 타입 계약(type contract)을 신뢰한다.
- 타입을 우회(`as unknown as`, `as any`)하는 것은 호출자의 잘못이다. 엔진 코드가 이를 방어할 책임이 없다.
- 타입 우회 케이스에 대한 테스트는 작성하지 않는다.

**예외: 외부 JSON 직접 수신 진입점**

`parseCircuit`, `parseAnalysis`처럼 외부에서 넘어오는 raw JSON을 직접 받는 함수는 null/undefined에 한해 최소한의 체크를 유지한다. 이 경우는 TypeScript 타입 시스템 바깥에서 데이터가 들어오는 실제 경계이기 때문이다.

```typescript
// ✅ 외부 진입점 - null 체크 유지
function parseCircuit(json: CircuitJSON): Circuit {
  if (json == null) throw new WebSpiceError('INVALID_INPUT', 'json is null');
  // ...
}

// ✅ 내부 함수 - 타입 계약 신뢰, 가드 없음
function analyzeDC(circuit: Circuit): DCResult {
  validateCircuitForDC(circuit);
  // ...
}
```

## Consequences

**긍정적 영향**

- 코드가 간결해지고 불필요한 에러 경로가 제거된다.
- 타입 우회를 강제하는 테스트가 사라져 테스트 코드의 신뢰도가 높아진다.
- TypeScript의 타입 계약이 실질적인 의미를 갖게 된다.

**트레이드오프**

- 타입을 우회해서 null을 전달하면 런타임 에러가 `WebSpiceError`가 아닌 일반 `TypeError`로 발생할 수 있다.
- 향후 JavaScript에서 직접 호출하거나 외부 라이브러리로 배포할 경우, public API 래퍼에서 별도 검증 레이어를 추가해야 한다.

## 적용 범위

| 위치                                            | 가드 추가 여부                |
| ----------------------------------------------- | ----------------------------- |
| 엔진 내부 함수 (solver, analysis, assembler 등) | ❌ 추가하지 않음              |
| 컴포넌트 생성자 (Resistor, DCVoltageSource 등)  | ❌ 추가하지 않음              |
| `parseCircuit`, `parseAnalysis` 외부 진입점     | ✅ null/undefined 체크만 유지 |
| 향후 외부 라이브러리 배포 시 public API 래퍼    | ✅ 별도 검증 레이어 추가      |
