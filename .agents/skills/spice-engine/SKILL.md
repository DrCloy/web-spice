---
name: spice-engine
description: 'WebSpice 엔진 구현 가이드. src/engine/ 코드 작성 시 반드시 이 스킬을 읽을 것. MNA 행렬 조립, 컴포넌트 모델 인터페이스, 분석 알고리즘 패턴을 다룬다.'
---

## 컴포넌트 모델 인터페이스

새 소자를 만들 때 `src/engine/components/resistor.ts`를 먼저 읽어 인터페이스를 확인한다. 핵심 패턴:

- 컴포넌트는 MNA 행렬에 기여하는 `stamp()` 메서드를 가진다
- 파라미터 검증은 생성자에서 수행 (음수 저항, 0값 등 물리적으로 불가능한 값 차단)
- `src/types/component.ts`의 인터페이스를 구현한다

상세 패턴은 `references/component-model-guide.md` 참조.

## MNA (Modified Nodal Analysis) 원칙

- 전압원은 MNA에서 추가 변수(branch current)를 생성한다 — `dcVoltageSource.ts` 참조
- 전류원은 RHS(우변 벡터)에만 기여한다 — `dcCurrentSource.ts` 참조
- 노드 번호링: 0번 노드는 항상 그라운드 (행렬에서 제외)
- 행렬 조립은 `src/engine/solver/mnaAssembler.ts`에서 수행

## 분석 알고리즘 추가 패턴

`src/engine/analysis/dcAnalysis.ts`를 읽어 분석 구조 파악:

1. 회로 검증 (`dcValidation.ts` 참조)
2. MNA 행렬 조립
3. 솔버 실행 (LU 분해 또는 Newton-Raphson)
4. 결과 포맷팅 (`src/engine/formatter/resultFormatter.ts`)

AC 분석은 복소수 임피던스 사용 — 캐패시터: `Z = 1/(jωC)`, 인덕터: `Z = jωL`.

## 파서 확장

- JSON 파서: `src/engine/parser/circuitParser.ts` 패턴 준수
- SI 접두어 처리: `src/engine/parser/siPrefix.ts` 활용 (k, M, m, μ, n, p)
- 새 컴포넌트 추가 시 파서에도 타입 분기 추가 필요

## 수치 안정성 규칙

- 행렬 조건수가 나쁠 때를 대비해 피벗팅 활용 (`luDecomposition.ts` 참조)
- Newton-Raphson 발산 감지: 반복 횟수 제한 + 수렴 판정 기준 (`newtonRaphson.ts`)
- 0에 가까운 값 비교 시 절대/상대 허용오차 모두 사용

## 상세 가이드

- 컴포넌트 모델 패턴 전체: `references/component-model-guide.md`
