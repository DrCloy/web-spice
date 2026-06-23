# WebSpice

브라우저 기반 SPICE 회로 시뮬레이터. React 19 + TypeScript + Vite + Redux Toolkit + HTML5 Canvas.

## 하네스: WebSpice 피처 개발

**목표:** feature-architect → engine-coder/ui-coder (병렬) → qa-validator 파이프라인으로 Phase 2 기능을 체계적으로 개발한다.

**세션 흐름:**

```text
새 세션 → kickoff → spice-feature (Claude) + codex-delegate (Codex 위임) → wrap → [반복 또는 세션 종료]
```

**스킬 트리거:**

- 세션 시작 / 현재 상태 파악 → `kickoff`
- 기능 구현 / 버그 수정 / 개발 작업 → `spice-feature`
- Codex 브리프 생성 → `codex-delegate`
- 태스크 완료 / 커밋 / 마무리 → `wrap`

단순 코드 질문은 직접 응답 가능.

**변경 이력:**

| 날짜       | 변경 내용                  | 대상                                             | 사유                                            |
| ---------- | -------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| 2026-06-23 | 초기 구성                  | 전체                                             | Phase 2 기능 개발 가속화                        |
| 2026-06-23 | Codex 병렬 워크플로우 추가 | feature-architect, spice-feature, codex-delegate | Claude Code/Codex 역할 분리 및 병렬 개발 체계화 |
| 2026-06-23 | 세션 생애주기 스킬 추가    | kickoff, wrap                                    | Compact 보호 및 세션 시작/종료 흐름 표준화      |
