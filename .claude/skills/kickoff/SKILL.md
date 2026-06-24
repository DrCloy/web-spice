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
gh pr list --state open        # 열린 PR (브랜치명으로 Codex/Claude 구분)
```

동시에 읽기:

- `docs/TASK_BREAKDOWN.md` → ✅ 완료 태스크와 미완료 태스크 파악
- `_workspace/` 존재 시 → 진행 중인 작업 확인

### Step 2: PR 상태 처리

**브랜치 패턴으로 PR 유형 구분:**

- `codex/*` → Codex가 구현한 PR → **Claude가 리뷰**
- `feature/*` → Claude가 구현한 PR → **Codex에 리뷰 요청**

---

#### 2-A. Codex PR (`codex/*`) 처리

각 Codex PR에 대해:

1. 해당 태스크 브리프 읽기: `_workspace/codex-briefs/{task-id}-brief.md`
2. diff 읽기: `gh pr diff {번호}`
3. `docs/harness/webspice-codex/team-spec.md` 리뷰 정책에 따라 검토:
   - 변경 파일 vs 브리프 일치 여부
   - 공개 인터페이스/파서 shape vs 브리프
   - forbidden 파일 미접촉 여부
   - 테스트 케이스 (정상/경계/오류) 커버리지
   - 범위 이탈 여부 (관련 없는 리팩터링)
4. GitHub에 리뷰 게시:
   ```bash
   gh pr review {번호} --comment --body "## Claude Code Review\n[리뷰 내용]\n\n**결과: pass / fix: {이슈} / redo: {사유} / reject: {사유}**"
   ```
5. 결과 처리:
   - `pass` → CI 통과 확인 후 머지 제안
   - `fix` → 코멘트 게시, 수정 요청
   - `redo` / `reject` → 코멘트 게시, 브리프 재검토

---

#### 2-B. Claude PR (`feature/*`) 처리

각 Claude PR에 대해:

```bash
gh pr view {번호} --json reviews,comments
```

**Codex 리뷰 확인 방법:** review body 또는 comment body에 `## Codex Review` 헤더가 있으면 Codex가 리뷰한 것.

- **Codex 리뷰 없음** → Codex 리뷰 요청 메시지 생성 (형식은 Step 2-C 참고):

  ```bash
  # PR 번호 반드시 실제 값으로 확인 후 사용
  gh pr list --head {브랜치명} --json number
  ```

  유저에게 Codex 앱에 붙여넣을 메시지 전달. CI 상태도 함께 확인.

- **Codex 리뷰 있음** → 리뷰 내용 읽기:
  - `pass` → 머지 가능
  - `fix: {이슈}` → 이슈 확인 후 수정, 커밋, 푸시
  - `redo` / `reject` → 내용 검토 후 유저와 논의

---

#### 2-C. Codex 리뷰 요청 메시지 형식

```
AGENTS.md를 읽어라.

PR #{실제번호}를 코드 리뷰하라.
`gh pr diff {실제번호}` 로 변경 사항을 확인하라.

리뷰 기준:
- 타입 안전성 (TypeScript 오류 없음)
- 테스트 커버리지 (정상/경계/오류 케이스)
- 코드 일관성 (기존 패턴과 정합성)
- 엣지 케이스 누락 여부

리뷰 결과를 반드시 아래 명령어로 게시하라:
gh pr review {실제번호} --comment --body "## Codex Review
[리뷰 내용]

**결과: pass / fix: {이슈} / redo: {사유}**"
```

**PR 번호 확인 주의사항:** Claude와 Codex가 동시에 작업 중일 경우, PR 번호가 예상과 다를 수 있다. 반드시 `gh pr list --head {브랜치명}` 또는 `gh pr list --state open`으로 실제 번호를 확인한 뒤 메시지에 포함한다.

---

### Step 3: 계획 제시 및 확인

다음 형식으로 제시:

```
## 현재 상태
- 완료: #X, #Y (git log 기준)
- 진행 중: (없음 / _workspace/ 내용)

## PR 현황
- [Codex PR] PR #{번호} (#태스크 태스크명) → 리뷰 결과: pass/fix/대기
- [Claude PR] PR #{번호} (#태스크 태스크명) → Codex 리뷰: 완료(pass)/완료(fix 수정중)/미요청

## 오늘 계획
[Claude Code] #번호 태스크명
[Codex 위임]  #번호 태스크명 → 브리프 생성 후 앱에 전달

진행할까요?
```

### Step 4: 확인 즉시 실행

유저가 확인("응", "시작해", "ㅇ" 등)하면 추가 요청 없이 바로 실행:

**PR 머지가 가능한 경우 먼저:**

- pass 판정 Codex PR 머지: `gh pr merge {번호} --merge`
- 머지 완료 후: `git checkout main && git pull origin main`
- main 기준으로 새 태스크 브랜치 생성

**Codex 트랙이 있으면:**

- `codex-delegate` 스킬로 브리프 생성
- 유저에게 Codex 앱 붙여넣기용 프롬프트 전달
- 공유 타입 변경이 필요한 경우 Claude Code 트랙 완료 후 Codex 시작 안내

**Claude Code 트랙:**

- `spice-feature` 스킬 실행 (feature-architect → 구현 → qa-validator 자동)

두 트랙이 독립적이면 Codex 브리프 전달과 Claude Code 구현을 같은 세션에서 동시에 진행한다.

## Compact 보호

이 스킬이 실행될 때마다 Step 1을 반드시 수행한다. "아까 봤으니까" 같은 이유로 파일 읽기를 건너뛰지 않는다. Compact 이후에도 Step 1이 항상 정확한 상태를 복원한다.
