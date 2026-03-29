# Task Review — feature/15-console-output-system (2026-03-29)

> main 대비 변경분 리뷰. 수정 완료 후 이 파일을 삭제할 것.

## 변경된 파일 목록

- `eslint.config.js`
- `examples/simple_resistor.json`
- `examples/voltage_divider.json`
- `package-lock.json`
- `package.json`
- `src/cli/index.ts`
- `tests/cli/cli.test.ts`
- `tsconfig.app.json`
- `tsconfig.node.json`

## 요약

- 심각도 HIGH: 0건
- 심각도 MEDIUM: 3건
- 심각도 LOW: 3건

---

## 1. 코드 오류 및 버그

### [MEDIUM] 파일 읽기 예외를 전부 "File not found"로 오분류

- **파일**: `src/cli/index.ts`
- **위치**: `run()` 함수, 84-88행
- **문제**: `readFileSync`의 모든 예외를 `File not found`로 변환하고 있어, 권한 오류(`EACCES`), 디렉토리 경로 전달(`EISDIR`) 등도 잘못된 원인으로 표시됨.
- **수정 방향**: `catch (err)`에서 NodeJS errno(`code`)를 분기해 `ENOENT`만 파일 없음으로 처리하고, 나머지는 원본 원인 기반 메시지(또는 코드 매핑)로 출력.

### [LOW] CLI 실행 시간 측정에 `performance.now()` 직접 사용

- **파일**: `src/cli/index.ts`
- **위치**: 100, 103행
- **문제**: 현재 Node 런타임에서는 동작하지만, 실행 환경/폴리필 조건에 따라 `performance` 가용성에 의존함.
- **수정 방향**: Node CLI 문맥을 명확히 하기 위해 `node:perf_hooks`의 `performance`를 명시적으로 import하여 의존성 명확화.

## 2. SPICE 규약 위반

이슈 없음.

## 3. ADR 위반

### [MEDIUM] WebSpiceError 경로 테스트가 에러 코드를 검증하지 않음

- **파일**: `tests/cli/cli.test.ts`
- **위치**: 216-229행
- **문제**: invalid circuit 케이스가 `.toThrow()`만 사용해 통과하므로, `WebSpiceError`의 코드 계약(ADR-002)을 검증하지 못함.
- **수정 방향**: `toThrowWebSpiceError('INVALID_CIRCUIT')`로 변경해 코드 기반 검증으로 고정.

### [LOW] 테스트에서 메시지 매칭 기반 실패 판정 사용

- **파일**: `tests/cli/cli.test.ts`
- **위치**: 192-214행
- **문제**: `/File not found/`, `/Invalid JSON/` 같은 메시지 regex로 실패 케이스를 판정하고 있어 메시지 변경에 취약함. 체크리스트의 "messageMatch 패턴 지양" 항목과 충돌.
- **수정 방향**: 가능한 경우 `WebSpiceError` 코드 기반으로 정규화하거나, 최소한 에러 타입/코드를 분리 검증하는 헬퍼를 사용.

## 4. 테스트 커버리지

### [MEDIUM] `parseArgs` 분기 2개에 대한 실패 케이스 테스트 누락

- **파일**: `src/cli/index.ts`
- **위치**: 59-61행(`--output` invalid), 64행(unknown flag)
- **문제**: 구현에 존재하는 에러 분기가 테스트에서 직접 커버되지 않음.
- **수정 방향**: 아래 2개 케이스를 추가.
  - `parseArgs(['analyze', 'a.json', '--output', 'xml'])` -> throw
  - `parseArgs(['analyze', 'a.json', '--unknown'])` -> throw

### [LOW] 테스트 데이터를 팩토리 대신 인라인 JSON으로 구성

- **파일**: `tests/cli/cli.test.ts`
- **위치**: 220행
- **문제**: 테스트 컨벤션의 팩토리 우선 원칙 대비, 회귀 가능성이 있는 회로 JSON을 인라인으로 구성함.
- **수정 방향**: `tests/factories/circuits` 또는 `tests/fixtures` 기반으로 invalid circuit fixture를 재사용.

## 5. 변경 의도와 구현의 일치성

이슈 없음.

## 6. 리팩토링

### [LOW] `run()` 함수가 I/O, 파싱, 해석, 출력을 한 함수에서 모두 담당

- **파일**: `src/cli/index.ts`
- **위치**: `run()` 함수 전체 (79-123행)
- **문제**: 단일 함수 책임이 커져 오류 분기 테스트/재사용성이 떨어짐.
- **수정 방향**: `readCircuitJson()`, `analyzeCircuitJson()`, `formatOutput()`로 분리해 테스트 가능한 작은 단위로 재구성.

## 7. 규칙 위반

이슈 없음.

---

## 진행 상황

- [x] 1. 코드 오류 및 버그
- [x] 2. SPICE 규약 위반
- [x] 3. ADR 위반
- [x] 4. 테스트 커버리지
- [x] 5. 변경 의도와 구현의 일치성
- [x] 6. 리팩토링
- [x] 7. 규칙 위반
