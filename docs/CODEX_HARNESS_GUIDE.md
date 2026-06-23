# Codex 하네스 구축 가이드 (WebSpice)

Claude Code와 Codex(GPT-5.5)를 병렬로 운영하기 위한 설계 결정 및 운영 규칙.

---

## 1. 두 에이전트 비교

| 항목               | Claude Code (Sonnet 4.6)         | Codex (GPT-5.5 medium)           |
| ------------------ | -------------------------------- | -------------------------------- |
| **실행 환경**      | VSCode Extension, 로컬           | VSCode Extension, 로컬           |
| **격리 방식**      | 현재 브랜치 직접 수정            | Git worktree 자동 생성           |
| **자율성**         | 감독형 — plan mode, hook         | 자율형 — full-auto 기본          |
| **설정 파일**      | CLAUDE.md + .claude/             | AGENTS.md                        |
| **추론 특성**      | 깊은 맥락 추론, 시스템 전체 파악 | 빠른 판단, 명세 기반 고밀도 생성 |
| **병렬성**         | 단일 세션                        | 여러 태스크 동시 발행 가능       |
| **Terminal-Bench** | 강함                             | 82.7% (2.0 기준, 1위)            |
| **워크플로우**     | 실시간 대화형                    | Fire-and-forget → PR 리뷰        |

### Sonnet 4.6 특성

- 긴 컨텍스트에서 코드베이스 전체를 파악하는 능력이 강함
- 복잡한 상호의존 관계 추론 (예: MNA 행렬 조립 → Newton-Raphson 연동 → 결과 포매터)
- 즉각적인 피드백과 반복이 필요한 작업에서 효율적
- 타입 경계면 정합성 같은 cross-layer 검증에 적합

### GPT-5.5 medium reasoning 특성

- 명확한 패턴이 있는 작업에서 빠르고 정확한 코드 생성
- Medium reasoning: 빠른 판단 우선 — 명세 불완전 시 합리적 추측으로 진행
- 여러 태스크를 독립적으로 병렬 처리 가능 (worktree 격리)
- 코드 리뷰 신호 대 잡음비 높음 (CodeRabbit 벤치마크 기준)

---

## 2. 역할 분리 원칙

### Claude Code가 담당하는 작업

- **복잡한 수치 알고리즘**: AC 분석 엔진, Newton-Raphson 연동, 수렴 조건
- **크로스레이어 상호작용**: 와이어 연결 시스템 (Canvas + Redux + Circuit 동시 연동)
- **디버깅 및 조사**: 회귀, 수치 불안정성, 타입 오류 근본 원인 분석
- **타입 경계면 관리**: 엔진 출력 → store → UI 전체 shape 정합성
- **하네스 자체**: 에이전트 조율, QA 검증

### Codex가 담당하는 작업

- **패턴 반복 구현**: 기존 컴포넌트와 동일한 구조의 새 소자 (capacitor, inductor)
- **독립적인 UI 컴포넌트**: 그래프 차트, 속성 패널 (잘 정의된 명세)
- **테스트 픽스처 추가**: 새 회로 예제, 팩토리 함수 확장
- **표준 패턴 반복**: 동일한 인터페이스를 따르는 여러 구현을 배치로 처리

### WebSpice Phase 2 배정 예시

| Task                | 담당        | 이유                                    |
| ------------------- | ----------- | --------------------------------------- |
| #19 드래그앤드롭    | Codex       | Canvas 이벤트 패턴 명확, isolated       |
| #20 와이어 연결     | Claude Code | 3-레이어 복합 상호작용                  |
| #21 캐패시터 모델   | Codex       | resistor.ts 패턴, 독립적                |
| #22 인덕터 모델     | Codex       | 동일 패턴, VoltageSource 변형 명시 필요 |
| #23 AC 분석 엔진    | Claude Code | 복소수 MNA, 수치 안정성                 |
| #24 주파수 응답     | Claude Code | #23 의존, 연속 이터레이션               |
| #25 그래프 컴포넌트 | Codex       | Recharts 통합, 독립적                   |
| #26 DC 시각화       | Codex       | #25 이후 명세 완전                      |
| #27 AC 그래프       | Claude Code | AC 엔진 출력 shape 연동                 |
| #28 속성 패널       | Codex       | 독립 React 컴포넌트                     |

---

## 3. Codex 태스크 적합성 체크리스트

다음 **4가지 모두** 충족해야 Codex에 위임:

- [ ] **패턴 존재**: 거의 동일한 기존 구현이 코드베이스에 있다
- [ ] **독립성**: Claude Code가 현재 작업 중인 파일과 겹치지 않는다
- [ ] **명세 완전성**: 입력/출력/인터페이스를 지금 완전히 정의할 수 있다
- [ ] **자동 검증**: `npm run test` 또는 `npm run type-check`로 판별된다

---

## 4. Codex 워크플로우

### 4-1. Git Worktree 격리

Codex는 자동으로 git worktree를 생성하여 격리된 환경에서 작업한다:

- 동일 repo의 별도 폴더에서 체크아웃
- Claude Code가 main/feature 브랜치 작업 중에도 충돌 없음
- 완료 후 PR 생성 → 리뷰 → 머지

### 4-2. 병렬 진행 순서

```
1. feature-architect가 태스크를 두 트랙으로 분리
2. 공유 타입 변경이 있으면 Claude Code가 먼저 처리
3. Claude Code 트랙과 Codex 트랙을 동시에 시작
4. Codex는 명세서(codex-brief)를 읽고 worktree에서 실행
5. Claude Code는 복잡한 작업을 로컬에서 처리
6. Codex 완료 → PR 생성 → 리뷰 후 머지
7. qa-validator로 통합 검증
```

### 4-3. Codex에 태스크 전달 방법

`codex-delegate` 스킬이 생성한 브리프를 Codex에 다음과 같이 전달:

```
AGENTS.md와 _workspace/codex-briefs/{task-id}-brief.md를 읽고
명세대로 구현하라. 완성 기준의 모든 명령어를 실행하여 통과를 확인하라.
```

### 4-4. Codex 결과 통합

Codex PR 리뷰 시 체크:

- [ ] 명세서의 인터페이스와 실제 구현 일치
- [ ] 완성 기준 명령어 통과 여부 (PR CI 확인)
- [ ] Claude Code 작업 파일과 충돌 없음
- [ ] 기존 테스트 회귀 없음 (`npm run test` 전체)

---

## 5. AGENTS.md 작성 가이드

Codex는 AGENTS.md를 project context로 읽는다. 이미 `/AGENTS.md`가 있으며, Codex 하네스 구축 시 다음 섹션을 추가하면 효과적이다:

```markdown
## Parallel Development with Claude Code

This project uses both Claude Code (Sonnet 4.6) and Codex (GPT-5.5) in parallel.

**Files Claude Code is actively managing** (check before editing):

- src/engine/analysis/acAnalysis.ts (AC analysis engine)
- src/components/circuit/CircuitCanvas.tsx (wire system)

When you receive a task brief from \_workspace/codex-briefs/, implement ONLY
what the brief specifies. Do not make improvements or refactors beyond the scope.
Run all validation commands listed in the "완성 기준" section before finishing.
```

---

## 6. GPT-5.5 medium reasoning 브리프 작성 팁

Medium reasoning은 빠른 판단을 우선한다. 브리프 품질이 결과를 결정한다.

### 좋은 브리프의 특징

1. **패턴 파일 직접 인용**: "resistor.ts와 유사하게" (X) → "resistor.ts:12-35의 stamp 패턴 그대로" (O)
2. **TypeScript 시그니처 제공**: 설명 대신 코드로
3. **차이점만 명시**: 패턴과 동일한 부분은 설명 생략, 다른 부분만 강조
4. **검증 명령어 포함**: 완성 기준을 실행 가능한 명령어로
5. **수정 금지 파일 명시**: Claude Code 동시 작업 파일 목록

### 피해야 할 패턴

```
❌ "적절히 구현하라"
❌ "기존 코드와 일관성을 유지하라"
❌ "필요하면 타입도 추가하라"

✅ "src/types/component.ts의 Component 인터페이스를 구현하라"
✅ "resistor.ts의 constructor와 동일한 구조, capacitance 파라미터만 다름"
✅ "src/types/component.ts에 CapacitorComponent 타입을 추가하라 (형태: {id, nodeP, nodeN, capacitance})"
```

---

## 7. Codex 하네스 구축 시 생성할 파일

현재 WebSpice용 내구성 있는 하네스 설계는
`docs/harness/webspice-codex/team-spec.md`에 둔다. Codex 브리프 템플릿은
`docs/harness/webspice-codex/codex-brief-template.md`를 사용한다.

WebSpice Codex 하네스를 새로 구축한다면:

```
.codex/
  agents/
    capacitor-implementer.md    ← 소자 모델 전문 에이전트
    ui-component-builder.md     ← React 컴포넌트 전문 에이전트
    test-writer.md              ← 테스트 작성 전문 에이전트
  skills/
    component-model/SKILL.md    ← 소자 모델 구현 가이드
    react-chart/SKILL.md        ← Recharts 통합 가이드
```

Claude Code의 `.claude/` 구조를 참고하되, Codex 에이전트 정의는 AGENTS.md에 통합하거나 별도 디렉토리로 관리.

---

## 8. 충돌 위험 파일 관리

두 에이전트가 동시에 수정할 가능성이 있는 "공유 접점" 파일:

| 파일                                | 위험도 | 관리 방법                           |
| ----------------------------------- | ------ | ----------------------------------- |
| `src/types/component.ts`            | 높음   | Claude Code 먼저 수정 후 Codex 시작 |
| `src/types/circuit.ts`              | 높음   | 동일                                |
| `src/engine/solver/mnaAssembler.ts` | 중간   | 브리프에 수정 범위 명시             |
| `src/engine/circuit/index.ts`       | 중간   | 각 브리프에 담당 섹션만 명시        |
| `tests/factories/components.ts`     | 낮음   | 각자 다른 팩토리 함수 추가          |

---

Last Updated: 2026-06-23
