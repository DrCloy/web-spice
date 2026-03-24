# ADR-002: 에러 코드 설계 원칙 및 코드 체계

- 날짜: 2026-03-24
- 상태: 확정 (Accepted)

## Context

엔진 전체에 걸쳐 `WebSpiceError`가 사용되고 있으나, 에러 코드 분류 기준이 명확하지 않아 여러 문제가 발생했다:

- `INVALID_PARAMETER`가 "값 범위 오류", "참조 대상 없음", "내부 솔버 계약 위반", "null 입력 방어" 등 성격이 다른 29개 상황에 사용됨
- `INVALID_COMPONENT`가 "컴포넌트 구조 오류", "중복 ID", "ID 못 찾음", "미지원 타입" 등 4가지 의미로 혼용됨
- 테스트에서 같은 에러 코드로 다른 경로를 구별하기 위해 `messageMatch`를 사용하는 패턴이 누적됨

## Decision

### 1. 에러 코드 설계 원칙

에러 코드는 **caller가 코드별로 다른 처리를 해야 하는가**를 기준으로 설계한다.

- **분리 대상**: caller(UI 포함)가 에러 코드에 따라 다른 동작을 해야 하는 경우
- **통합 유지**: caller가 구별해서 처리할 필요가 없는 경우 (내부 계약 위반, 개발자 디버깅용)

이 기준에 따라 `INVALID_PARAMETER`의 내부 솔버 계약 위반 케이스(차원 불일치, NaN 등)는 세분화하지 않는다. 이것들은 호출 코드의 버그로만 발생하며 caller가 구별해서 처리할 이유가 없다.

### 2. 신규 에러 코드 추가

기존 `INVALID_COMPONENT`에서 두 케이스를 분리한다:

| 코드                  | 의미                                  | 분리 전             |
| --------------------- | ------------------------------------- | ------------------- |
| `DUPLICATE_COMPONENT` | 동일 ID의 컴포넌트가 이미 회로에 존재 | `INVALID_COMPONENT` |
| `COMPONENT_NOT_FOUND` | ID로 컴포넌트 참조 실패               | `INVALID_COMPONENT` |

`COMPONENT_NOT_FOUND`는 DC 스윕 설정에서 sourceId가 회로에 없는 경우에도 사용한다.

### 3. 미지원 컴포넌트 타입 코드 통일

파서에서 미지원 컴포넌트 타입에 `INVALID_COMPONENT`를 사용하던 것을 `UNSUPPORTED_ANALYSIS`로 변경한다. "알 수 없는 타입"과 "미지원 타입"은 결과가 같고, `INVALID_COMPONENT`는 "컴포넌트 구조가 잘못됨"의 의미이므로 어색하다.

### 4. 최종 에러 코드 목록

```typescript
type ErrorCode =
  | 'INVALID_CIRCUIT' // 회로 구조 문제 (빈 컴포넌트 목록, 접지 없음 등)
  | 'INVALID_COMPONENT' // 컴포넌트 데이터 오류 (빈 ID, 잘못된 노드, 노드 개수 불일치)
  | 'DUPLICATE_COMPONENT' // 동일 ID 컴포넌트가 이미 존재
  | 'COMPONENT_NOT_FOUND' // ID로 컴포넌트 참조 실패
  | 'NO_GROUND' // 접지 노드 없음
  | 'FLOATING_NODE' // 연결이 부족한 노드
  | 'SINGULAR_MATRIX' // 선형 시스템 해 없음 (MNA 행렬 특이)
  | 'CONVERGENCE_FAILED' // 반복 솔버 수렴 실패
  | 'INVALID_PARAMETER' // 파라미터 값의 범위/형식 오류
  | 'UNSUPPORTED_ANALYSIS'; // 미지원 분석 타입 또는 컴포넌트 타입
```

### 5. 테스트에서 messageMatch 제거

`toThrowWebSpiceError(code, messageMatch?)`의 `messageMatch`를 전면 제거한다.

**이유**: 모든 테스트 케이스를 검토한 결과, `messageMatch`가 같은 에러 코드로 서로 다른 경로를 구별하는 케이스가 없었다. 모든 케이스는 (A) 같은 `it` 블록 안에서 같은 메시지를 반복 확인하거나, (B) 이미 별도 `it` 블록으로 분리되어 있었다. 에러 코드가 programmatic contract이고 메시지는 UI 표시용이므로, 테스트는 코드만 검증하면 충분하다.

메시지 내용이 바뀔 때마다 테스트를 수정해야 했던 유지보수 비용도 이로써 제거된다.

## Consequences

**긍정적 영향**

- `DUPLICATE_COMPONENT`, `COMPONENT_NOT_FOUND`로 UI가 사용자에게 더 구체적인 안내를 제공할 수 있다.
- `INVALID_PARAMETER`의 의미가 명확해진다 ("값의 범위/형식이 잘못됨").
- 에러 메시지 변경이 테스트를 깨뜨리지 않는다.

**트레이드오프**

- 에러 코드가 2개 늘어난다.
- 기존 `INVALID_COMPONENT`를 catch하던 코드는 `DUPLICATE_COMPONENT`, `COMPONENT_NOT_FOUND`도 함께 처리해야 한다 (아직 외부 소비자 없으므로 현재 영향 없음).
