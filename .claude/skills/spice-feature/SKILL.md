---
name: spice-feature
description: "WebSpice 피처 개발 오케스트레이터. 새 회로 컴포넌트(캐패시터, 인덕터, 반도체), 분석 엔진(AC, Transient), UI 기능(드래그앤드롭, 와이어, 그래프), 버그 수정 등 모든 WebSpice 개발 작업에 반드시 이 스킬을 사용할 것. '기능 추가', '구현해줘', '#번호 작업', 'Phase 태스크', '개발', '버그 수정', '다시 실행', '~만 수정', '이전 결과 기반으로' 키워드로 트리거됨."
---

## 역할

feature-architect가 태스크를 분석하고 Claude Code / Codex 트랙으로 분리.
Claude Code 트랙: engine-coder + ui-coder (병렬) → qa-validator
Codex 트랙: codex-delegate 스킬로 명세서 생성 → 유저에게 전달

## Phase 0: 컨텍스트 확인

`_workspace/` 디렉토리 존재 여부 확인:

- **미존재** → 초기 실행 (Phase 1부터)
- **존재 + 부분 수정 요청** → 해당 에이전트만 재호출, qa-validator 재실행
- **존재 + 새 요청** → 완료 여부 확인 (`_workspace/qa-report.md` 존재 + 열린 Codex PR 없음) 후 이동. 미완료면 유저에게 확인 후 이동

## Phase 1: 분석 및 라우팅 (feature-architect)

```
Agent(
  model: "opus",
  prompt: ".claude/agents/feature-architect.md를 읽고 다음 요청을 분석하여
           _workspace/plan.md를 작성하라. Claude Code / Codex 트랙을 분리할 것:
           {사용자 요청}"
)
```

`_workspace/plan.md`를 읽어 두 트랙 확인.

## Phase 2A: Claude Code 트랙 (engine-coder + ui-coder)

`_workspace/plan.md`의 Claude Code 트랙을 기반으로 실행 경로 결정:

| 작업 유형 | 실행 방식                                         |
| --------- | ------------------------------------------------- |
| 엔진 전용 | engine-coder만 서브에이전트 실행                  |
| UI 전용   | ui-coder만 서브에이전트 실행                      |
| 엔진 + UI | 두 에이전트 병렬 실행 (`run_in_background: true`) |

에이전트 프롬프트에 포함:

- 에이전트 정의 파일 경로 (`.claude/agents/{name}.md` 읽도록 지시)
- 관련 스킬 파일 (spice-engine 또는 spice-ui)
- `_workspace/plan.md`의 Claude Code 트랙 내용

## Phase 2B: Codex 트랙 (codex-delegate)

Codex 위임 태스크가 있으면 `codex-delegate` 스킬을 실행:

- `_workspace/plan.md`의 Codex 위임 트랙 내용을 입력으로 전달
- 생성된 Codex 태스크 브리프(`_workspace/codex-briefs/`)를 유저에게 전달

**Codex 트랙과 Claude Code 트랙은 독립적이므로 동시에 진행 가능.**
단, 공유 타입 변경이 있으면 Claude Code가 먼저 처리 후 Codex 트랙 시작.

## Phase 3: QA 검증 (qa-validator, 점진적)

Claude Code 트랙 완료 시마다 qa-validator 실행:

```
Agent(
  model: "opus",
  subagent_type: "general-purpose",
  prompt: ".claude/agents/qa-validator.md를 읽고 현재 구현을 검증하라.
           경계면 정합성 검사 후 npm run ci:quick 실행."
)
```

Codex 결과는 Codex가 자체 테스트 실행 후 PR을 생성하므로 Claude Code 트랙과 별도 QA 불필요.
단, **Codex PR 머지 후** qa-validator를 실행하여 경계면 정합성(타입, API shape) 최종 검증.

## Phase 4: 결과 보고

유저에게 보고:

- Claude Code 트랙: 구현 파일 목록, 테스트 결과, CI 통과 여부
- Codex 트랙: 전달된 브리프 목록, Codex 완료 후 PR 리뷰 방법

## 데이터 전달

```
_workspace/
├── plan.md                  ← feature-architect 출력 (두 트랙 포함)
├── codex-briefs/            ← codex-delegate 생성 명세서
│   ├── {task-id}-brief.md
│   └── ...
├── engine-complete.md       ← engine-coder 완료 보고
├── ui-complete.md           ← ui-coder 완료 보고
└── qa-report.md             ← qa-validator 검증 결과
```

## 테스트 시나리오

**정상 흐름 (복합 태스크):** "캐패시터/인덕터 추가하고 AC 분석도 구현해줘"
→ architect: 캐패시터/인덕터 → Codex, AC 분석 → Claude Code
→ 공유 타입 먼저 처리 → 두 트랙 병렬 진행
→ Claude Code 완료 후 qa-validator → Codex는 자체 PR 생성

**오류 흐름:** qa-validator에서 타입 오류
→ 린트 자동 수정 시도 → 실패 시 engine-coder/ui-coder에게 SendMessage → 재구현 후 재검증
