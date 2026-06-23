---
name: codex-delegate
description: "Codex 태스크 브리프 생성기. feature-architect가 Codex 위임으로 분류한 태스크를 Codex가 바로 실행할 수 있는 완전한 명세서로 변환한다. 'Codex에 넘겨줘', 'Codex 브리프 만들어줘', 'Codex 태스크 명세' 키워드로도 트리거됨."
---

## 역할

feature-architect의 Codex 위임 트랙을 받아, GPT-5.5 medium reasoning이 실수 없이 구현할 수 있는 태스크 브리프를 생성한다.

## Codex와 GPT-5.5 medium reasoning 특성 이해

- **강점:** 명확한 패턴 추종, 고밀도 코드 생성, 자동화 테스트 기반 검증
- **약점:** 암묵적 맥락 추론이 필요한 작업, 시스템 전체를 봐야 하는 설계 결정
- **Medium reasoning:** 빠른 판단 우선 — 명세가 불완전하면 합리적인 추측으로 진행함
- **결론:** 브리프는 추측이 필요 없을 만큼 완전해야 한다. 누락된 정보는 반드시 틀린 구현으로 이어진다.

## 브리프 작성 원칙

### 1. 패턴 파일을 직접 인용한다

```
❌ "resistor.ts와 유사하게 구현하라"
✅ "src/engine/components/resistor.ts의 constructor, stamp 패턴을 그대로 따르라.
    차이점: capacitance 파라미터, DC에서 stamp 없음, AC에서 어드미턴스 Y = jωC 추가"
```

### 2. 인터페이스를 코드로 제공한다

추상적 설명 대신 TypeScript 시그니처를 직접 포함시킨다.

### 3. 완성 기준을 명령어로 명시한다

```
✅ "npm run test -- tests/engine/components/capacitor.test.ts 통과"
✅ "npm run type-check 오류 없음"
```

### 4. 건드리지 말아야 할 파일을 명시한다

Codex가 동시에 작업 중인 파일이 있으면 Codex 브리프에 명확히 적는다:

```
⚠️ 수정 금지 파일: src/engine/analysis/acAnalysis.ts (Codex 작업 중)
```

### 5. 브리프 하나 = 태스크 하나

여러 태스크를 하나의 브리프에 묶지 않는다. 각각 독립적인 파일로 생성한다.

## 출력 형식

각 태스크를 `_workspace/codex-briefs/{task-id}-brief.md`에 저장:

````markdown
# Codex Task Brief: {Task 제목} (#{번호})

## 목표

한 문장으로 무엇을 구현하는지.

## 참조 패턴

**반드시 먼저 이 파일을 읽어라:** `src/engine/components/resistor.ts`
핵심 패턴: constructor 구조, stamp 메서드 시그니처, 파라미터 검증 방식.

## 기존 패턴과의 차이점

- [차이점 1]: DC에서 open circuit (stamp 없음)
- [차이점 2]: AC stamp 메서드 추가 필요

## 구현 명세

### 생성 파일

- `src/engine/components/capacitor.ts`
- `tests/engine/components/capacitor.test.ts`

### 수정 파일

- `src/engine/solver/mnaAssembler.ts`: capacitor stamp 분기 추가
- `src/engine/parser/circuitParser.ts`: 'capacitor' 타입 파싱 추가

### 인터페이스

```typescript
// src/engine/components/capacitor.ts
export class Capacitor {
  readonly id: string;
  readonly nodeP: number;
  readonly nodeN: number;
  readonly capacitance: number; // 단위: 파라드

  constructor(id: string, nodeP: number, nodeN: number, capacitance: number);

  // DC 분석: 아무것도 하지 않음 (개방 회로)
  stampDC(matrix: MNAMatrix): void;

  // AC 분석: Y = jωC 어드미턴스 추가
  stampAC(matrix: ComplexMNAMatrix, omega: number): void;
}
```

### 테스트 케이스 (반드시 포함)

- 음수/0 capacitance 거부
- DC stamp 후 행렬 변화 없음
- AC stamp: omega=2π\*1000, C=1e-6 → 예상 어드미턴스 계산 포함

## 수정 금지 파일

- (없음) / 또는 (Codex 작업 중인 파일 목록)

## 완성 기준

1. `npm run test -- tests/engine/components/capacitor.test.ts` 통과
2. `npm run type-check` 오류 없음
3. `npm run lint` 통과
````

## 유저 전달 형식

브리프 생성 완료 후 유저에게:

1. 생성된 브리프 파일 목록
2. Codex에 줄 때 추천 프롬프트 (AGENTS.md 읽도록 지시 포함)
3. Codex가 동시에 진행할 작업과의 충돌 가능 파일 경고

**Codex 추천 프롬프트 템플릿:**

```
AGENTS.md와 _workspace/codex-briefs/{task-id}-brief.md를 읽고 명세대로 구현하라.
완성 기준의 모든 명령어를 실행하여 통과를 확인하라.
```
