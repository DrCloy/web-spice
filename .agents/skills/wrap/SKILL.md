---
name: wrap
description: "태스크 완료 후 커밋, 상태 파일 업데이트, 다음 계획 안내. 'wrap', '마무리', '커밋', '태스크 완료', '다음 뭐 할지' 키워드로 트리거됨. 항상 파일에 상태를 기록하여 다음 세션 kickoff가 정확히 복원할 수 있게 한다."
---

## 원칙

**항상 파일에 쓴다.** 상태가 대화에만 존재하면 compact나 새 세션에서 사라진다. 커밋과 TASK_BREAKDOWN.md 업데이트가 완료돼야 wrap이 끝난 것이다.

## 실행 순서

### Step 1: 변경 내용 확인

```bash
git status
git diff --stat
```

커밋되지 않은 변경사항 목록을 확인한다.

### Step 2: 커밋

Conventional Commits 형식으로 커밋:

```bash
git add {관련 파일들}   # -A 또는 . 사용 금지. 파일 명시
git commit -m "feat: ..." 또는 "fix: ..." 또는 "test: ..."
```

커밋 타입: `feat`, `fix`, `test`, `refactor`, `perf`, `docs`, `chore`
제목: 10-100자, 마침표 없음
예: `feat: add capacitor component model with AC stamp (#21)`

### Step 3: TASK_BREAKDOWN.md 업데이트

완료된 태스크를 ✅로 표시:

```
변경 전: | #21 | FEAT | 캐패시터(Capacitor) 모델 구현 |
변경 후: | ✅ #21 | FEAT | 캐패시터(Capacitor) 모델 구현 |
```

### Step 4: Codex PR 상태 확인

```bash
gh pr list --state open
```

Codex PR이 있으면:

- CI 통과 여부 확인
- 리뷰 필요하면 `webspice-codex-orchestrator` Phase 5 실행 안내

### Step 5: 다음 계획 안내

```
## 완료
- #{번호} 태스크명 (커밋: {short hash})

## 다음 추천
- [계속 진행] #{번호} 태스크명 — 같은 의존성 체인, 세션 유지 가능
  또는
- [세션 종료 권고] 다음 작업은 {다른 도메인}입니다. 새 세션에서 kickoff로 시작하세요.

## Codex 상태
- PR #{번호}: CI {통과/대기/실패}
```

## 세션 종료 권고 기준

다음 중 하나에 해당하면 새 세션 권고:

- 다음 태스크가 현재와 다른 도메인 (엔진 작업 → UI 작업, 또는 반대)
- Codex PR을 머지한 직후 (통합된 상태에서 클린하게 시작)
- 현재 세션이 이미 길어서 컨텍스트 오염 위험이 있을 때

종료 권고 시 메시지:

```
이번 태스커 완료됐습니다. 다음 작업은 [도메인]으로 전환됩니다.
새 세션을 열고 kickoff로 시작하시면 깨끗한 상태에서 진행할 수 있습니다.
```

## \_workspace 정리

태스크가 완전히 완료되고 Codex PR도 머지됐으면:

```bash
mv _workspace/ _workspace_prev/   # 이전 작업 보존 (감사용)
```

새 태스크 시작 전에 정리. 진행 중인 Codex PR이 있으면 정리하지 않는다.
