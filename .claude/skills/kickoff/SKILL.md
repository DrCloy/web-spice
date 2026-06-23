---
name: kickoff
description: "세션 시작 스킬. 새 대화 세션을 열었을 때 파일에서 상태를 복원하고 오늘 할 작업을 계획한 뒤 유저 확인 즉시 실행까지 담당한다. '시작', '오늘 뭐 할지', '현재 상태', 'kickoff', '어디까지 했지' 키워드로 트리거됨. 대화 기억이 아니라 항상 파일에서 읽는다."
---

## 원칙

**항상 파일에서 읽는다.** 대화 기억, 이전 세션 요약, compact된 컨텍스트를 절대 신뢰하지 않는다. 상태의 단일 진실 공급원은 git과 마크다운 파일이다.

**확인 후 바로 실행한다.** 계획을 제시하고 유저가 확인하면 별도 요청 없이 즉시 실행으로 넘어간다. 유저가 "구현해줘"를 다시 말할 필요 없다.

## 실행 순서

### Step 1: 현재 상태 복원 (파일 읽기)

다음을 병렬로 실행:

```bash
git log --oneline -10          # 최근 커밋 → 무엇이 완료됐는지
git status                     # 커밋 안 된 변경사항
gh pr list --state open        # 열린 PR (Codex PR 포함)
```

동시에 읽기:

- `docs/TASK_BREAKDOWN.md` → ✅ 완료 태스크와 미완료 태스크 파악
- `_workspace/` 존재 시 → 진행 중인 작업 확인

### Step 2: 우선순위 판단

아래 순서로 결정:

1. **Codex PR 대기 중** → 리뷰 최우선 (`docs/harness/webspice-codex/team-spec.md` 리뷰 정책)
2. **`_workspace/` 진행 중 작업** → 이어서 할지 새로 시작할지 판단
3. **다음 태스크 선택** → TASK_BREAKDOWN.md 의존성 체인 기준

### Step 3: 계획 제시 및 확인

다음 형식으로 제시:

```
## 현재 상태
- 완료: #X, #Y (git log 기준)
- 진행 중: (없음 / _workspace/ 내용)
- Codex PR 대기: (없음 / PR 번호 + 태스크)

## 오늘 계획
[Claude Code] #번호 태스크명
[Codex 위임]  #번호 태스크명 → 브리프 생성 후 앱에 전달

진행할까요?
```

### Step 4: 확인 즉시 실행

유저가 확인("응", "시작해", "ㅇ" 등)하면 추가 요청 없이 바로 실행:

**Codex 트랙이 있으면 먼저:**

- `codex-delegate` 스킬로 브리프 생성
- 유저에게 Codex 앱 붙여넣기용 프롬프트 전달
- 공유 타입 변경이 필요한 경우 Claude Code 트랙 완료 후 Codex 시작 안내

**Claude Code 트랙:**

- `spice-feature` 스킬 실행 (feature-architect → 구현 → qa-validator 자동)

두 트랙이 독립적이면 Codex 브리프 전달과 Claude Code 구현을 같은 세션에서 동시에 진행한다.

## Compact 보호

이 스킬이 실행될 때마다 Step 1을 반드시 수행한다. "아까 봤으니까" 같은 이유로 파일 읽기를 건너뛰지 않는다. Compact 이후에도 Step 1이 항상 정확한 상태를 복원한다.
